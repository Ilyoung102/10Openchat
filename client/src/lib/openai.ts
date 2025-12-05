import OpenAI from "openai";

// Initialize the API key
export const getApiKey = () => {
  return (
    import.meta.env.VITE_OPENAI_API_KEY ||
    // @ts-ignore
    import.meta.env.OPENAI_API_KEY || 
    localStorage.getItem("OPENAI_API_KEY") || 
    ""
  );
};

export const getModel = () => {
  return localStorage.getItem("OPENAI_MODEL") || "gpt-4o";
};

export const saveModel = (model: string) => {
  localStorage.setItem("OPENAI_MODEL", model);
};

export const checkApiKey = () => {
  return !!getApiKey();
};

export const saveApiKey = (key: string) => {
  localStorage.setItem("OPENAI_API_KEY", key);
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
  isError?: boolean;
}

export const streamOpenAIResponse = async (
  history: ChatMessage[],
  newMessage: string,
  onChunk: (text: string) => void
) => {
  const apiKey = getApiKey();
  const model = getModel();
  
  if (!apiKey) throw new Error("API Key not found");

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });

  // Filter out error messages and ensure proper format
  const validHistory = history
    .filter(msg => !msg.isError && msg.id !== 'welcome') // Remove welcome/error messages from context
    .map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.text
    }));

  const stream = await openai.chat.completions.create({
    model: model, 
    messages: [
      { role: "system", content: "You are MAZI AI, a futuristic, advanced AI companion. You are helpful, precise, and have a slight cyberpunk personality." },
      ...validHistory,
      { role: "user", content: newMessage }
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      onChunk(content);
    }
  }
};
