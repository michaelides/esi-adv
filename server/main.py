from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from agent import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain.callbacks.base import BaseCallbackHandler, AsyncCallbackHandler
import asyncio
import magic
import pandas as pd
import pyreadstat
import pyreadr
from pypdf import PdfReader
import io
from vector_db import vector_db
from config import settings

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict] | None = None  # Each: {"role": "user"|"assistant"|"tool", "content": str}
    user_input: str | None = None
    model: str | None = None
    temperature: float | None = None
    verbosity: int | None = None
    debug: bool | None = None


@app.post("/chat")
async def chat(
    messages: str = Form(...),
    options: str = Form('{}'),
    file: UploadFile = File(None)
):
    import json

    messages_data = json.loads(messages)
    options_data = json.loads(options)

    # Basic env checks for required keys depending on model type happen in create_agent
    model = options_data.get("model") or "gemini-2.5-flash"
    temperature = options_data.get("temperature", 0.5)
    verbosity = options_data.get("verbosity", 3)
    debug = options_data.get("debug", False)

    file_content = None
    if file:
        file_content = await process_file(file)

    try:
        agent = create_agent(temperature=temperature, model=model, verbosity=verbosity, debug=debug, file_content=file_content)
    except Exception as e:
        return {"text": f"Server not configured: {e}"}

    # Build LangGraph prebuilt chat payload
    payload = {"messages": messages_data}
    if file_content:
        # This part needs to be thought out: how does the agent use the file?
        # For now, we'll just pass it in the payload.
        payload["file_content"] = file_content

    result = agent.invoke(payload)

    # Extract clean assistant markdown text
    from typing import Any
    try:
        from langchain_core.messages import AIMessage, ToolMessage, HumanMessage  # type: ignore
    except Exception:  # Fallback if types unavailable
        AIMessage = ToolMessage = HumanMessage = tuple()  # type: ignore

    def extract_markdown(r: Any) -> str:
        # Prefer traversing a message list
        msgs = None
        if hasattr(r, "messages"):
            msgs = getattr(r, "messages")
        elif isinstance(r, dict) and "messages" in r:
            msgs = r["messages"]

        if isinstance(msgs, list):
            last_text = None
            for m in msgs:
                if isinstance(m, AIMessage):
                    if isinstance(m.content, str) and m.content.strip():
                        last_text = m.content.strip()
                elif isinstance(m, dict):
                    role = m.get("role") or m.get("type")
                    content = m.get("content") or m.get("text")
                    if role in ("assistant", "ai") and isinstance(content, str) and content.strip():
                        last_text = content.strip()
                # Ignore HumanMessage and ToolMessage for user output
            if last_text:
                return last_text

        # Direct AIMessage
        if isinstance(r, AIMessage) and isinstance(r.content, str) and r.content.strip():
            return r.content.strip()

        # Dict shapes with content/output
        if isinstance(r, dict):
            for k in ("output", "content", "text"):
                v = r.get(k)
                if isinstance(v, str) and v.strip():
                    return v.strip()

        return str(r)

    text = extract_markdown(result)
    return {"text": text}


class SSEQueueHandler(BaseCallbackHandler):
    def __init__(self, queue: "asyncio.Queue[str]"):
        self.queue = queue
        self.count = 0
        self.is_done = False

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        # Forward tokens into async queue for SSE loop
        import json
        self.count += 1
        self.queue.put_nowait(json.dumps({'type': 'delta', 'text': token}))

    def on_llm_end(self, response, **kwargs) -> None:
        # Do not signal end of stream here; agent is still running
        pass

    def on_tool_start(self, serialized, input_str, **kwargs) -> None:
        import json
        tool_name = serialized.get('name')
        # Map tool names to user-friendly text
        tool_map = {
            "tavily_search": "Searching the web...",
            "search_vector_db": "Searching documents...",
            "CustomSemanticScholarQueryRun": "Searching academic papers...",
            "PythonREPLTool": "Analyzing data...",
            "crawl4ai_scraper": "Scraping website...",
        }
        message = tool_map.get(tool_name, f"Running tool: {tool_name}...")
        self.queue.put_nowait(json.dumps({'type': 'status', 'message': message}))

    def on_chain_end(self, outputs, **kwargs) -> None:
        # LangGraph chains finish, signal end of stream
        if not self.is_done:
            self.is_done = True
            self.queue.put_nowait(None)

@app.get("/thinking")
async def thinking():
    import os
    path = os.path.join(os.path.dirname(__file__), "thinking_phrases.md")
    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = [ln.strip() for ln in f.read().splitlines() if ln.strip()]
        return {"phrases": lines}
    except Exception as e:
        return {"phrases": ["Thinking…"], "error": str(e)}

@app.post("/chat/stream")
async def chat_stream(
    messages: str = Form(...),
    options: str = Form('{}'),
    file: UploadFile = File(None)
):
    import json

    messages_data = json.loads(messages)
    options_data = json.loads(options)

    model = options_data.get("model") or "gemini-2.5-flash"
    temperature = options_data.get("temperature", 0.5)
    verbosity = options_data.get("verbosity", 3)
    debug = options_data.get("debug", False)

    file_content = None
    if file:
        file_content = await process_file(file)

    async def sse_generator():
        import json
        
        q: asyncio.Queue[str | None] = asyncio.Queue()
        handler = SSEQueueHandler(q)

        # Create a streaming-capable LLM. Callbacks are now managed by the agent executor.
        if model.startswith("gemini"):
            llm = ChatGoogleGenerativeAI(
                model=model,
                temperature=temperature,
                google_api_key=settings.GOOGLE_API_KEY,
                streaming=True,
            )
        else:
            # OpenAI-compatible models
            llm = ChatOpenAI(
                model=model,
                temperature=temperature,
                streaming=True,
                openai_api_key=settings.OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
            )
        
        # Create agent with the streaming LLM
        agent_local = create_agent(
            temperature=temperature,
            model=model,
            verbosity=verbosity,
            llm=llm,
            debug=debug,
            file_content=file_content
        )
        
        payload = {"messages": messages_data}
        if file_content:
            payload["file_content"] = file_content

        # Run agent in background, passing the handler in the config
        config = {"callbacks": [handler]}
        task = asyncio.create_task(asyncio.to_thread(agent_local.invoke, payload, config))
        
        # Stream events as they arrive
        while True:
            try:
                item_json = await q.get()
                if item_json is None:  # End of stream
                    break

                # Yield the JSON data as an SSE event
                yield f"data: {item_json}\n\n"

            except asyncio.CancelledError:
                break
            except Exception:
                break
        
        # Wait for task completion and handle potential errors
        try:
            await task
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','message': str(e)})}\n\n"
        
        yield "data: {\"type\": \"done\"}\n\n"
    
    return StreamingResponse(sse_generator(), media_type="text/event-stream")


async def process_file(file: UploadFile):
    file_content = await file.read()
    mime_type = magic.from_buffer(file_content, mime=True)

    filename = file.filename
    content_str = f"File: {filename}\n"

    try:
        if mime_type == 'text/csv':
            df = pd.read_csv(io.BytesIO(file_content))
            content_str += df.to_string()
        elif mime_type == 'application/pdf':
            vector_db.add_pdf(file_content)
            content_str += f"PDF '{filename}' has been successfully indexed. You can now ask questions about it."
        elif filename and filename.endswith('.sav'):
            df, meta = pyreadstat.read_sav(io.BytesIO(file_content))
            content_str += df.to_string()
        elif filename and (filename.endswith('.rdata') or filename.endswith('.rds')):
            result = pyreadr.read_r(io.BytesIO(file_content))
            for key, value in result.items():
                content_str += f"Dataframe: {key}\n{value.to_string()}\n"
        else:
            content_str += "Unsupported file type."
    except Exception as e:
        content_str += f"Error processing file: {e}"

    return content_str


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
