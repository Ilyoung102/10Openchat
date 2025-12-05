
import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { Source } from "../types";

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const MODEL_NAME = 'gemini-2.5-flash';
const TTS_MODEL_NAME = 'gemini-2.5-flash-preview-tts';

const DEFAULT_SYSTEM_INSTRUCTION = `
당신은 도움이 되고 친절한 AI 비서입니다. 
한국어로 자연스럽게 대화하세요.
사용자의 질문에 대해 명확하고 정확한 정보를 제공하세요.
정보가 필요하면 Google 검색 도구를 적극적으로 활용하세요.
답변은 읽기 쉽게 서식을 갖추어 작성하세요.
`;

// Helper to initialize AI client lazily and safely
const getAIClient = (): GoogleGenAI => {
  if (!ai) {
    let apiKey = '';
    
    // 1. Try Vite standard (import.meta.env)
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
         // @ts-ignore
         apiKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || '';
      }
    } catch (e) {
      console.warn("import.meta.env access failed", e);
    }

    // 2. Fallback to process.env (for compatibility or other build tools)
    if (!apiKey) {
      apiKey = process.env.API_KEY || 
               (process.env as any).VITE_API_KEY || 
               (process.env as any).NEXT_PUBLIC_API_KEY || 
               (process.env as any).REACT_APP_API_KEY ||
               '';
    }

    // Clean and validate
    apiKey = apiKey.trim();

    // Check for "undefined" string literal which can happen in some build replacements
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      throw new Error("API 키가 설정되지 않았습니다. Vercel 환경 변수 이름을 'VITE_API_KEY'로 변경하고 재배포해주세요.");
    }

    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const initializeChat = (customSystemInstruction?: string): boolean => {
  try {
    const client = getAIClient();
    chatSession = client.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to initialize chat session:", error);
    return false;
  }
};

export const sendMessageStream = async (
  message: string,
  onChunk: (text: string, sources?: Source[]) => void
): Promise<void> => {
  // Ensure client is initialized
  if (!chatSession) {
    const success = initializeChat();
    if (!success) {
       throw new Error("채팅 세션을 초기화할 수 없습니다. API 키 설정을 확인해주세요.");
    }
  }

  if (!chatSession) {
    throw new Error("Chat session is not available.");
  }

  try {
    const resultStream = await chatSession.sendMessageStream({
      message: message,
    });

    let accumulatedText = "";

    for await (const chunk of resultStream) {
      const text = chunk.text || "";
      accumulatedText += text;
      
      let sources: Source[] | undefined = undefined;
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      if (groundingChunks) {
        sources = groundingChunks
          .map((c: any) => c.web)
          .filter((w: any) => w && w.uri)
          .map((w: any) => ({
            title: w.title || "출처",
            uri: w.uri
          }))
          .slice(0, 5); // Limit to maximum 5 reliable sources
      }

      onChunk(accumulatedText, sources);
    }
  } catch (error: any) {
    console.error("Error sending message:", error);
    
    // Detect Quota errors (429)
    const msg = error.message || '';
    if (error.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("AI 모델 사용량이 초과되었습니다. (Quota Exceeded)\n잠시 후 다시 시도하거나 내일 이용해 주세요.");
    }

    throw error;
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Strip emojis and non-standard chars that might confuse TTS
const cleanTextForTTS = (text: string): string => {
  if (!text) return "";
  // Remove common emoji ranges and specific symbols but keep punctuation
  return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
};

export const generateSpeech = async (text: string, voiceName: string = "Kore"): Promise<string> => {
  // Reduce max retries to 2 to prevent hitting quota limits (429) too fast
  const MAX_RETRIES = 2; 
  let lastError: any;
  
  // Clean text before sending to API to reduce "OTHER" errors caused by complex emojis
  const cleanedText = cleanTextForTTS(text);
  if (!cleanedText || cleanedText.length === 0) {
      throw new Error("TTS 텍스트가 비어 있습니다.");
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = getAIClient();
      
      // Attempt to catch generic network failures (like offline) from the SDK call
      const response = await client.models.generateContent({
        model: TTS_MODEL_NAME,
        contents: [{ parts: [{ text: cleanedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });
      
      // Check for candidates
      const candidate = response.candidates?.[0];
      
      if (!candidate) {
         throw new Error("응답 후보(Candidate)가 없습니다.");
      }

      // Handle specific finish reasons that block generation
      if (candidate.finishReason === "SAFETY") {
          throw new Error("안전 정책에 의해 음성이 차단되었습니다.");
      }
      if (candidate.finishReason === "RECITATION") {
          throw new Error("저작권/암기 컨텐츠 감지로 인해 음성이 차단되었습니다.");
      }
      
      // 'OTHER' is often transient (server load, internal error). Treat as retryable error.
      if (candidate.finishReason === "OTHER") {
          throw new Error(`모델 일시적 오류 (FinishReason: OTHER)`);
      }

      const audioData = candidate.content?.parts?.[0]?.inlineData?.data;
      
      if (!audioData) {
        // Sometimes the model returns text in part.text if it refuses to generate audio but doesn't set a flag
        const textFallback = candidate.content?.parts?.[0]?.text;
        if (textFallback) {
             console.warn("TTS fallback text:", textFallback);
             // If model returns text saying "I cannot...", treat as safety/refusal -> do not retry
             if (textFallback.includes("sorry") || textFallback.includes("cannot")) {
                 throw new Error(`모델이 음성 생성을 거부했습니다: ${textFallback}`);
             }
        }
        throw new Error(`오디오 데이터가 수신되지 않았습니다. (FinishReason: ${candidate.finishReason})`);
      }
      
      return audioData;

    } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      
      // Log warning with attempt number
      if (attempt < MAX_RETRIES) {
          console.warn(`TTS Attempt ${attempt + 1}/${MAX_RETRIES} failed:`, msg);
      }

      // Fatal errors - do not retry
      // 429/Quota errors should NOT be retried to avoid ban
      if (msg.includes("API key") || msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("안전 정책") || msg.includes("거부했습니다")) {
          break;
      }
      
      // Retry for network/RPC/Empty/Transient/OTHER errors
      if (attempt < MAX_RETRIES) {
          // Increase delay significantly to give quota bucket time to refill and reduce server load
          // Base 4s -> 4s, 8s
          const delay = 4000 * Math.pow(2, attempt); 
          await wait(delay);
          continue;
      }
    }
  }
  
  // If we reached here, all attempts failed
  console.error("TTS Final generation error:", lastError);
  
  let userMessage = "음성 생성 오류";
  const msg = lastError?.message || "";

  if (msg.includes("API key")) {
      userMessage = "API 키 오류";
  } else if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      userMessage = "TTS 할당량 초과 (Quota Exceeded)";
  } else if (msg.includes("fetch failed") || msg.includes("network")) {
      userMessage = "네트워크 연결 오류";
  } else if (msg.includes("Rpc failed") || msg.includes("xhr error")) {
      userMessage = "서버 연결 불안정 (재시도 실패)";
  } else if (msg.includes("empty") || msg.includes("수신되지")) {
      userMessage = "오디오 데이터 수신 실패";
  } else if (msg.includes("안전 정책") || msg.includes("차단")) {
      userMessage = "안전 정책으로 인해 음성을 생성할 수 없습니다";
  }
  
  throw new Error(userMessage);
};
