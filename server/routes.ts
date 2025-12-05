import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  query: string;
  answer: string;
  results: TavilySearchResult[];
}

async function searchWeb(query: string): Promise<TavilyResponse> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.statusText}`);
  }

  return response.json();
}

const webSearchTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "web_search",
    description: "Search the web for current information, news, weather, or any real-time data. Use this when the user asks about current events, recent news, live data, or anything that requires up-to-date information.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to look up on the web",
        },
      },
      required: ["query"],
    },
  },
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { messages, model = "gpt-4o" } = req.body as {
        messages: ChatMessage[];
        model?: string;
      };

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const systemMessage: ChatMessage = {
        role: "system",
        content: `You are MAZI Service, a futuristic, advanced AI companion with real-time web search capabilities. You are helpful, precise, and have a slight cyberpunk personality.

**중요: 모든 답변은 반드시 한국어로 작성해야 합니다.**

When users ask about current events, news, weather, stock prices, or anything that requires up-to-date information, use the web_search function to get real-time data.

Always provide accurate, current information by searching the web when needed. Remember to always respond in Korean.`,
      };

      const allMessages = [systemMessage, ...messages];

      const response = await openai.chat.completions.create({
        model: model,
        messages: allMessages,
        tools: [webSearchTool],
        tool_choice: "auto",
        stream: true,
      });

      let toolCallId = "";
      let toolCallName = "";
      let toolCallArguments = "";
      let collectedMessages: any[] = [];

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.id) {
              toolCallId = toolCall.id;
            }
            if (toolCall.function?.name) {
              toolCallName = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              toolCallArguments += toolCall.function.arguments;
            }
          }
        }

        if (delta?.content) {
          res.write(`data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`);
        }

        if (chunk.choices[0]?.finish_reason === "tool_calls") {
          if (toolCallName === "web_search") {
            try {
              const args = JSON.parse(toolCallArguments);
              res.write(`data: ${JSON.stringify({ type: "searching", query: args.query })}\n\n`);

              const searchResults = await searchWeb(args.query);

              const toolResultMessage = {
                role: "tool" as const,
                tool_call_id: toolCallId,
                content: JSON.stringify({
                  answer: searchResults.answer,
                  sources: searchResults.results.map((r) => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content,
                  })),
                }),
              };

              const continuationMessages = [
                ...allMessages,
                {
                  role: "assistant" as const,
                  tool_calls: [
                    {
                      id: toolCallId,
                      type: "function" as const,
                      function: {
                        name: toolCallName,
                        arguments: toolCallArguments,
                      },
                    },
                  ],
                },
                toolResultMessage,
              ];

              const continuationStream = await openai.chat.completions.create({
                model: model,
                messages: continuationMessages,
                stream: true,
              });

              for await (const contChunk of continuationStream) {
                const contContent = contChunk.choices[0]?.delta?.content;
                if (contContent) {
                  res.write(`data: ${JSON.stringify({ type: "content", content: contContent })}\n\n`);
                }
              }
            } catch (toolError: any) {
              res.write(`data: ${JSON.stringify({ type: "error", error: toolError.message })}\n\n`);
            }
          }
        }
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Chat stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else {
        res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
        res.end();
      }
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "alloy" } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const truncatedText = text.substring(0, 4096);

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: truncatedText,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error: any) {
      console.error("TTS error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const results = await searchWeb(query);
      res.json(results);
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
