export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
  isError?: boolean;
  isSearching?: boolean;
}

export const getModel = () => {
  return localStorage.getItem("OPENAI_MODEL") || "gpt-4o";
};

export const saveModel = (model: string) => {
  localStorage.setItem("OPENAI_MODEL", model);
};

export const checkApiKey = () => {
  return true;
};

export const saveApiKey = (key: string) => {
};

export const streamOpenAIResponse = async (
  history: ChatMessage[],
  newMessage: string,
  onChunk: (text: string) => void,
  onSearching?: (query: string) => void
) => {
  const model = getModel();

  const validHistory = history
    .filter(msg => !msg.isError && msg.id !== 'welcome')
    .map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.text
    }));

  const messages = [
    ...validHistory,
    { role: "user" as const, content: newMessage }
  ];

  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get response");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("data: ")) {
        const jsonStr = trimmedLine.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        
        try {
          const data = JSON.parse(jsonStr);
          
          if (data.type === "content") {
            onChunk(data.content);
          } else if (data.type === "searching" && onSearching) {
            onSearching(data.query);
          } else if (data.type === "error") {
            throw new Error(data.error);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            console.warn("JSON parse warning:", jsonStr);
            continue;
          }
          throw e;
        }
      }
    }
  }
};

export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, voice: "alloy" }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate speech");
  }

  return response.arrayBuffer();
};

export const searchWeb = async (query: string) => {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to search");
  }

  return response.json();
};
