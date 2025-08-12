import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Preferred: send full chat history
export async function runChatWithHistory(messages, options = {}) {
  try {
    const payload = { messages, ...options }; // options: { model, temperature, verbosity }
    const { data } = await axios.post(`${BACKEND_URL}/chat`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
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