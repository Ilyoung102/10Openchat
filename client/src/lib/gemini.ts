import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API key
// In a real app, this would come from env vars.
// For this prototype, we'll try to read it from localStorage or env
const getApiKey = () => {
  return import.meta.env.VITE_API_KEY || localStorage.getItem("GEMINI_API_KEY") || "";
};

export const checkApiKey = () => {
  return !!getApiKey();
};

export const saveApiKey = (key: string) => {
  localStorage.setItem("GEMINI_API_KEY", key);
};

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
  isError?: boolean;
}

export const streamGeminiResponse = async (
  history: ChatMessage[],
  newMessage: string,
  onChunk: (text: string) => void
) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const chat = model.startChat({
    history: history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    })),
  });

  const result = await chat.sendMessageStream(newMessage);
  
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    onChunk(chunkText);
  }
};
