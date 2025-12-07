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
      const { messages, model = "gpt-4o", conversationMode = false } = req.body as {
        messages: ChatMessage[];
        model?: string;
        conversationMode?: boolean;
      };

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const currentDate = new Date().toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
      
      let systemContent = `You are MAZI Service, a futuristic, advanced AI companion with real-time web search capabilities. You are helpful, precise, and have a slight cyberpunk personality.

**현재 날짜: ${currentDate}**

**중요: 모든 답변은 반드시 한국어로 작성해야 합니다.**

**웹 검색 필수 사용 조건:**
다음과 같은 질문에는 반드시 web_search 함수를 사용하세요:
- 현재 날씨, 뉴스, 시사 정보
- 인기 음악, K-POP 차트, 최신 노래 순위
- 유명인, 연예인, 아이돌 관련 최신 정보
- 영화, 드라마, TV 프로그램 정보
- 스포츠 경기 결과, 선수 정보
- 주식, 환율, 경제 정보
- 맛집, 여행지, 장소 추천
- 제품 가격, 쇼핑 정보
- 기술, IT, 앱, 게임 관련 정보
- 2023년 이후의 모든 사건이나 정보

당신의 학습 데이터는 2023년까지만 있으므로, 현재 정보가 필요한 모든 질문에는 웹 검색을 사용하세요.
확실하지 않으면 항상 웹 검색을 먼저 하세요.`;

      if (conversationMode) {
        systemContent += `

**[대화 모드 활성화]**
현재 대화 모드입니다. 음성으로 자연스럽게 대화하는 것처럼 응답하세요.

**대화 모드 규칙:**
1. **응답 길이 제한**: 반드시 100자(한글 기준) 이내로 간결하게 답변하세요. 사람은 한 번에 100자 이상을 말하지 않습니다.
2. **자연스러운 말투**: 친근하고 자연스러운 구어체로 답변하세요.
3. **핵심만 전달**: 불필요한 설명 없이 핵심 정보만 전달하세요.
4. **긴 자료 요청 시**: 사용자가 목록, 상세 설명, 코드, 긴 정보를 요청하면: "대화 모드에서는 간단한 답변만 드릴 수 있어요. 자세한 내용은 대화 모드를 끄고 다시 물어봐 주세요!" 라고 안내하세요.

예시:
- "오늘 날씨 어때?" → "서울 오늘 맑고 15도예요. 가벼운 겉옷 챙기세요!"
- "점심 뭐 먹을까?" → "김치찌개 어때요? 든든하고 맛있잖아요."`;
      }

      const systemMessage: ChatMessage = {
        role: "system",
        content: systemContent,
      };

      const allMessages = [systemMessage, ...messages];

      const response = await openai.chat.completions.create({
        model: model,
        messages: allMessages,
        tools: [webSearchTool],
        tool_choice: "auto",
        stream: true,
      });

      // Track multiple parallel tool calls by index
      const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;
            if (!toolCalls.has(index)) {
              toolCalls.set(index, { id: "", name: "", arguments: "" });
            }
            const tc = toolCalls.get(index)!;
            if (toolCall.id) {
              tc.id = toolCall.id;
            }
            if (toolCall.function?.name) {
              tc.name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              tc.arguments += toolCall.function.arguments;
            }
          }
        }

        if (delta?.content) {
          res.write(`data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`);
        }

        if (chunk.choices[0]?.finish_reason === "tool_calls") {
          // Process all tool calls
          const webSearchCalls = Array.from(toolCalls.values()).filter(tc => tc.name === "web_search");
          
          if (webSearchCalls.length > 0) {
            try {
              // Execute all web searches in parallel
              const searchPromises = webSearchCalls.map(async (tc) => {
                const args = JSON.parse(tc.arguments.trim());
                res.write(`data: ${JSON.stringify({ type: "searching", query: args.query })}\n\n`);
                const results = await searchWeb(args.query);
                return { tc, results, args };
              });

              const searchResults = await Promise.all(searchPromises);

              // Build tool calls array and tool result messages
              const assistantToolCalls = searchResults.map(({ tc }) => ({
                id: tc.id,
                type: "function" as const,
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              }));

              const toolResultMessages = searchResults.map(({ tc, results }) => ({
                role: "tool" as const,
                tool_call_id: tc.id,
                content: JSON.stringify({
                  answer: results.answer,
                  sources: results.results.map((r) => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content,
                  })),
                }),
              }));

              const continuationMessages = [
                ...allMessages,
                {
                  role: "assistant" as const,
                  tool_calls: assistantToolCalls,
                },
                ...toolResultMessages,
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
              console.error("Tool call error:", toolError.message);
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
