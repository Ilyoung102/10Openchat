import OpenAI from "openai";

// Initialize the API key
// We check for VITE_OPENAI_API_KEY (standard Vite) and OPENAI_API_KEY (sometimes leaked/configured)
// and finally localStorage for user-entered keys.
export const getApiKey = () => {
  return (
    import.meta.env.VITE_OPENAI_API_KEY ||
    // @ts-ignore
    import.meta.env.OPENAI_API_KEY || 
    localStorage.getItem("OPENAI_API_KEY") || 
    ""
  );
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
    model: "gpt-4o", // Using latest flagship
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
