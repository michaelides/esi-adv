import axios from 'axios';

const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Preferred: send full chat history
export async function runChatWithHistory(messages, options = {}, file = null) {
  try {
    const payload = new FormData();
    if (file) {
      payload.append('file', file);
    }
    payload.append('messages', JSON.stringify(messages));
    payload.append('options', JSON.stringify(options));

    const { data } = await axios.post(`${BACKEND_URL}/chat`, payload);
    return data; // { text }
  } catch (error) {
    console.error('Error communicating with the API:', error);
    return { text: "Sorry, I can't complete that request. Please try again." };
  }
}

// Legacy one-shot: wrap single prompt into messages
export default async function runChat(prompt, options = {}) {
  const messages = [{ role: 'user', content: String(prompt ?? '').trim() }];
  return runChatWithHistory(messages, options);
}

export async function streamChatWithHistory(messages, options = {}, file = null, onDelta) {
  try {
    const payload = new FormData();
    if (file) {
      payload.append('file', file);
    }
    payload.append('messages', JSON.stringify(messages));
    payload.append('options', JSON.stringify(options));

    const response = await fetch(`${BACKEND_URL}/chat/stream`, {
      method: 'POST',
      body: payload,
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last partial line

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr.trim() === '{"type": "done"}') {
            console.log('Stream finished.');
            return;
          }
          try {
            const data = JSON.parse(jsonStr);
            if (onDelta) {
              onDelta(data);
            }
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error communicating with the streaming API:', error);
    if (onDelta) {
      onDelta({ type: 'error', message: "Sorry, I can't complete that request. Please try again." });
    }
  }
}