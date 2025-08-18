---
title: ESI Advanced Agent
emoji: 🤖
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# ESI Advanced Research Agent

This Hugging Face Space hosts an advanced research agent designed to assist with a variety of tasks, including data analysis, web research, and document comprehension.

## 🚀 How to Use

1.  **Enter your query:** Type your research question or task in the chatbox.
2.  **Upload a file (Optional):** You can upload various file types for the agent to analyze, including:
    *   CSV, SAV, Rdata
    *   PDF
3.  **Interact:** The agent will process your request, perform the necessary actions (like searching the web, analyzing data, or reading documents), and provide a comprehensive response. It may also generate artifacts like plots or tables.

## 🛠️ Configuration

This application requires API keys for its tools to function correctly. Please add the following as **Secrets** in your Hugging Face Space settings:

*   `GOOGLE_API_KEY`: Your Google API key for Gemini models.
*   `TAVILY_API_KEY`: Your API key for the Tavily search tool.
*   `OPENROUTER_API_KEY`: Your OpenRouter API key (if you plan to use models from OpenRouter).

## ⚙️ Technical Details

*   **Frontend:** The user interface is built with React and Vite.
*   **Backend:** The server is a Python application using the FastAPI framework.
*   **Containerization:** The application is containerized using Docker for easy deployment on Hugging Face Spaces.
