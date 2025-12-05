
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Menu, Sparkles, Volume2, VolumeX, MicOff, AlertCircle, Clock } from 'lucide-react';
import { Message, Source, ChatSession } from './types';
import { initializeChat, sendMessageStream, generateSpeech } from './services/geminiService';
import { stopAudio, enqueueAudio, enqueueSilence, clearAudioQueue, setPlayStateCallback, resetAudioContext, initAudioContext, setAudioErrorCallback, getAudioContextState } from './utils/audio';
import MessageBubble from './components/MessageBubble';
import TypingIndicator from './components/TypingIndicator';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import EnglishLevelModal from './components/EnglishLevelModal';
import ServiceSubMenu from './components/ServiceSubMenu'; 
import { prompts } from './prompts';
import { ServiceItem } from './Service_Prompts'; 

export type TTSStatus = 'idle' | 'loading' | 'playing' | 'suspended' | 'error';

const App: React.FC = () => {
  // Session & History State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false); 
  const [currentVoice, setCurrentVoice] = useState('Kore');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEnglishModalOpen, setIsEnglishModalOpen] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'error'|'info'} | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);
  
  // Rate Limit Cooldown State
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  // Service Menu State
  const [activeServiceCategoryId, setActiveServiceCategoryId] = useState<string | null>(null);
  // Drill Mode (3x repetition)
  const [isDrillMode, setIsDrillMode] = useState(false);

  // Audio UI States
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  // Diagnostic State for LED
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diagnosticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Refs for logic consistency
  const isContinuousModeRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isDrillModeRef = useRef(false);
  
  const currentSessionIdRef = useRef<string | null>(null);
  const handleSendMessageRef = useRef<(text?: string, displayText?: string) => Promise<void>>(async () => {});

  // TTS Batching & Queue Refs
  const ttsBufferRef = useRef<string>("");
  const audioCharCountRef = useRef<number>(0);
  const ttsQueueRef = useRef<{text: string, isDrill: boolean}[]>([]);
  const isGeneratingTTS = useRef<boolean>(false);
  
  // IMPORTANT: Audio Session ID to invalidate old TTS requests
  const audioSessionIdRef = useRef<number>(0);
  
  const AUDIO_CHAR_LIMIT = 600; 
  
  // Keywords for barge-in
  const INTERRUPTION_KEYWORDS = ["잠깐", "잠시만", "멈춰", "아니", "그게 아니고", "스톱", "stop", "wait"];

  // --- GLOBAL EVENTS ---

  // Add global touch listener for Android/iOS Audio Unlock
  useEffect(() => {
    const handleTouchStart = () => {
        // Unlock audio on first touch
        initAudioContext();
    };
    window.addEventListener('touchstart', handleTouchStart, { once: true });
    return () => window.removeEventListener('touchstart', handleTouchStart);
  }, []);

  // --- HISTORY & STORAGE EFFECTS ---

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('chatSessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        const revived = parsed.map((s: any) => ({
          ...s,
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        setSessions(revived);
      }
      const savedHistoryPref = localStorage.getItem('isHistoryEnabled');
      if (savedHistoryPref !== null) setIsHistoryEnabled(savedHistoryPref === 'true');
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  useEffect(() => {
    if (isHistoryEnabled) localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions, isHistoryEnabled]);

  useEffect(() => {
    localStorage.setItem('isHistoryEnabled', String(isHistoryEnabled));
    if (!isHistoryEnabled) localStorage.removeItem('chatSessions');
  }, [isHistoryEnabled]);

  useEffect(() => {
    if (!currentSessionId || !isHistoryEnabled) return;
    setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
            return { ...session, messages: messages, updatedAt: Date.now() };
        }
        return session;
    }));
  }, [messages, currentSessionId, isHistoryEnabled]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    isContinuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);

  useEffect(() => {
    isDrillModeRef.current = isDrillMode;
  }, [isDrillMode]);

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
    
    // TURN-TAKING LOGIC:
    if (isAiSpeaking) {
        setIsAudioLoading(false); 
        setTtsStatus('playing');
        
        if (loadingSafetyTimerRef.current) clearTimeout(loadingSafetyTimerRef.current);
        
        if (isListening) {
            try { 
                // Abort is cleaner than stop for avoiding speaker conflict on Android
                recognitionRef.current?.abort(); 
            } catch(e) {}
        }
    } else {
        if (!isAudioLoading) {
            setTtsStatus('idle');
        }
        
        // If we were waiting for audio to start, and now it's "stopped" (meaning finished queue), cleanup
        if (!isGeneratingTTS.current && ttsQueueRef.current.length === 0) {
            setPlayingMessageId(null);
            
            // Resume listening if in continuous mode
            if (isContinuousModeRef.current && !isLoadingRef.current && !isAudioLoading) {
                setTimeout(() => {
                    startRecognitionSafe();
                }, 800); // Increased delay for safety
            }
        }
    }
  }, [isAiSpeaking, isListening]);


  // --- AUDIO DIAGNOSTICS ---
  useEffect(() => {
    // Poll audio state every 1 second if app thinks it is speaking
    // This helps detect the "Silent Playback" issue where context is suspended
    diagnosticTimerRef.current = setInterval(() => {
        if (isAiSpeakingRef.current) {
            const state = getAudioContextState();
            if (state === 'suspended' || state === 'closed') {
                setTtsStatus('suspended');
            } else if (state === 'running') {
                setTtsStatus('playing');
            }
        }
    }, 1000);

    return () => {
        if (diagnosticTimerRef.current) clearInterval(diagnosticTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (isAudioLoading) setTtsStatus('loading');
    else if (isAiSpeaking) setTtsStatus('playing');
    else setTtsStatus('idle');
  }, [isAudioLoading, isAiSpeaking]);

  // --- COOLDOWN TIMER EFFECT ---
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldownSeconds > 0) {
        timer = setInterval(() => {
            setCooldownSeconds(prev => prev - 1);
        }, 1000);
    }
    return () => {
        if (timer) clearInterval(timer);
    };
  }, [cooldownSeconds]);


  // --- SESSION MANAGEMENT ---

  const createNewSession = (initialTitle: string = "새로운 대화") => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: initialTitle,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false
    };
    if (isHistoryEnabled) setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  };

  // Robustly Reset Audio State
  const startNewAudioSession = () => {
      // Increment ID to invalidate any pending/old TTS requests
      audioSessionIdRef.current += 1;
      
      clearAudioQueue();
      stopAudio();
      
      setIsAudioLoading(false);
      setPlayingMessageId(null);
      setTtsStatus('idle');
      ttsQueueRef.current = [];
      isGeneratingTTS.current = false;
  };
  
  // Factory Reset Handler
  const handleFactoryReset = () => {
      // Clear all local storage
      localStorage.clear();
      // Reload page to reset state
      window.location.reload();
  };

  const handleNewChat = async () => {
    if (cooldownSeconds > 0) {
        showToast(`사용량 초과로 인해 ${cooldownSeconds}초 대기 중입니다.`, 'error');
        return;
    }
    startNewAudioSession();
    await resetAudioContext();
    setMessages([]);
    setCurrentSessionId(null);
    setIsAiSpeaking(false);
    setActiveServiceCategoryId(null);
    setIsDrillMode(false);
    initializeChat(); 
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectSession = async (sessionId: string) => {
      startNewAudioSession();
      await resetAudioContext();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
          setMessages(session.messages);
          setCurrentSessionId(sessionId);
          setIsAiSpeaking(false);
          setActiveServiceCategoryId(null);
          setIsDrillMode(false);
          initializeChat(); 
          if (window.innerWidth < 768) setIsSidebarOpen(false);
      }
  };

  const handleDeleteSession = (sessionId: string) => {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) handleNewChat();
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
  };

  const handleTogglePin = (sessionId: string) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, pinned: !s.pinned } : s));
  };

  const handleImportSessions = (importedSessions: ChatSession[]) => {
      setSessions(prev => {
          const currentIds = new Set(prev.map(s => s.id));
          const newSessions = importedSessions.filter(s => !currentIds.has(s.id));
          if (newSessions.length === 0) {
              showToast("추가할 새로운 대화 기록이 없습니다.", 'info');
              return prev;
          }
          const merged = [...newSessions, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
          if (isHistoryEnabled) {
              localStorage.setItem('chatSessions', JSON.stringify(merged));
          }
          return merged;
      });
      showToast("대화 기록을 성공적으로 불러왔습니다.");
  };

  const handleSelectServiceCategory = (categoryId: string) => {
      setActiveServiceCategoryId(categoryId);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleServiceItemSelect = (item: ServiceItem) => {
      if (cooldownSeconds > 0) {
          showToast(`사용량 초과로 인해 ${cooldownSeconds}초 대기 중입니다.`, 'error');
          return;
      }

      if (activeServiceCategoryId === 'english') {
          setIsDrillMode(true);
      } else {
          setIsDrillMode(false);
      }

      if (!currentSessionIdRef.current) {
          const newSessionId = createNewSession(item.label);
          setCurrentSessionId(newSessionId);
      }
      
      handleSendMessage(item.prompt, item.label);
  };

  const handleCloseServiceMenu = () => {
      setActiveServiceCategoryId(null);
  };

  // --- AUDIO & LOGIC ---

  const showToast = (message: string, type: 'error'|'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isAudioLoading, activeServiceCategoryId]);

  // Main Effect for Speech Recognition and Init
  useEffect(() => {
    setPlayStateCallback((playing) => {
      setIsAiSpeaking(playing);
      if (playing) {
          setIsAudioLoading(false);
      }
    });

    setAudioErrorCallback((errorMsg) => {
       console.error("Audio Error Callback:", errorMsg);
       showToast(errorMsg, 'error');
       
       setTtsStatus('error');
       startNewAudioSession();
    });

    initializeChat();

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; 
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ko-KR';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Continuous mode logic
        if (isContinuousModeRef.current && !isAiSpeakingRef.current && !isLoadingRef.current && cooldownSeconds === 0) {
             startRecognitionSafe();
        }
      };

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        
        // Smart Barge-in Logic
        if (isAiSpeakingRef.current) {
             const isKeyword = INTERRUPTION_KEYWORDS.some(k => transcript.includes(k));
             if (isKeyword || transcript.length > 10) {
                 startNewAudioSession(); // Stop speaking instantly
             } else {
                 return; // Ignore noise
             }
        }
        
        if (isLoadingRef.current) return;
        
        setInputValue(transcript);

        if (event.results[0].isFinal) {
             if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
             if (transcript.trim().length > 0) {
                 handleSendMessageRef.current(transcript);
             }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsContinuousMode(false);
          setIsListening(false);
          showToast("마이크 권한이 필요합니다.", "error");
        }
      };
    }
  }, []);

  const startRecognitionSafe = () => {
    try {
        if (recognitionRef.current && !isListening && cooldownSeconds === 0) {
            recognitionRef.current.start();
        }
    } catch (e) {
        // ignore
    }
  };

  const processTTSQueue = async () => {
    // 1. Capture the session ID when we start processing
    const currentSession = audioSessionIdRef.current;

    // 2. Checks
    if (isGeneratingTTS.current || ttsQueueRef.current.length === 0) return;

    isGeneratingTTS.current = true;
    const task = ttsQueueRef.current.shift();

    if (task) {
      try {
        // 3. Double Check Session before API call
        if (audioSessionIdRef.current !== currentSession) {
            console.log("Session changed before TTS generation. Aborting.");
            isGeneratingTTS.current = false;
            return;
        }

        const audioData = await generateSpeech(task.text, currentVoice);
        
        // 4. Final Check Session after API call
        if (audioSessionIdRef.current !== currentSession) {
            console.log("Session changed during TTS generation. Discarding result.");
            isGeneratingTTS.current = false;
            return;
        }

        if (task.isDrill) {
            // Drill Mode: Play 3 times with slower speed and gaps
            enqueueAudio(audioData, 0.8); // 0.8x speed
            enqueueSilence(1500);         // 1.5s gap
            enqueueAudio(audioData, 0.8);
            enqueueSilence(1500);
            enqueueAudio(audioData, 0.8);
        } else {
            // Normal Mode
            enqueueAudio(audioData, 1.0);
        }

      } catch (error: any) {
        console.error("TTS Processing Error:", error);
        
        // CRITICAL ERROR HANDLING
        let errorMsg = "음성 생성 오류";
        const msg = error.message || "";
        
        let shouldDisable = false;

        if (msg.includes("quota") || msg.includes("429") || msg.includes("할당량") || msg.includes("RESOURCE_EXHAUSTED")) {
            errorMsg = "음성 할당량 초과 (1분 대기)";
            shouldDisable = true;
            setCooldownSeconds(60); 
        } else if (msg.includes("API key")) {
            errorMsg = "API 키 오류 (기능 해제됨)";
            shouldDisable = true;
        } else if (msg.includes("network") || msg.includes("xhr") || msg.includes("Rpc")) {
            errorMsg = "네트워크 연결이 불안정하여 음성을 건너뜁니다.";
            shouldDisable = false;
        } else if (msg.includes("empty") || msg.includes("수신되지")) {
            errorMsg = "음성 데이터 수신 실패 (건너뜀)";
            shouldDisable = false;
        }

        showToast(errorMsg, 'error');
        setTtsStatus('error');
        
        if (shouldDisable) {
            setIsTTSActive(false); 
        }

        // Cleanup
        setIsAudioLoading(false);
        isGeneratingTTS.current = false;
        
        if (shouldDisable) {
            startNewAudioSession();
            return;
        }

        if (audioSessionIdRef.current === currentSession) {
             processTTSQueue();
        }
        return;
      }
    }

    isGeneratingTTS.current = false;
    
    // Check session again before continuing loop
    if (audioSessionIdRef.current === currentSession) {
        processTTSQueue();
    }
  };

  const cleanTextForEnglishDrill = (text: string) => {
    // 1. Remove Korean characters
    let cleaned = text.replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
    // 2. Remove parentheticals (often used for translations or notes)
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    
    // 3. Remove Emojis and Special Symbols that trigger TTS errors
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    // 4. Filter out metadata lines
    const lines = cleaned.split('\n');
    const cleanedLines = lines.map(line => {
       const trimmed = line.trim();
       if (!trimmed) return '';
       const lower = trimmed.toLowerCase();
       if (lower.startsWith('scenario:') || 
           lower.startsWith('situation:') || 
           lower.startsWith('mission:') || 
           lower.startsWith('roleplay:') ||
           lower.startsWith('tip:') ||
           lower.startsWith('key expression:') ||
           lower.startsWith('expression:') ||
           lower.startsWith('dialogue:') ||
           /^(scene|part|step)\s+\d+/i.test(trimmed)
       ) {
           return '';
       }
       return trimmed;
    }).filter(l => l.length > 0);
    
    return cleanedLines.join(' ');
  };

  const addToTTSQueue = (text: string) => {
    if (!text) return;
    
    const currentSession = audioSessionIdRef.current;
    
    if (isDrillModeRef.current) {
        const englishOnlyText = cleanTextForEnglishDrill(text);
        if (englishOnlyText.trim().length > 0) {
            // Queue once, logic handles the 3x repetition inside processTTSQueue
            ttsQueueRef.current.push({ text: englishOnlyText, isDrill: true });
        }
    } else {
        const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        if (cleanText.trim().length > 0) {
            ttsQueueRef.current.push({ text: cleanText, isDrill: false });
        }
    }
    
    if (audioSessionIdRef.current === currentSession) {
        processTTSQueue();
    }
  };

  const toggleListening = async () => {
    if (cooldownSeconds > 0) return;
    // Warm up audio context
    await initAudioContext();

    if (isContinuousMode) {
      setIsContinuousMode(false);
      try { 
        recognitionRef.current?.abort(); // Use abort for faster stop
      } catch(e) {}
    } else {
      setIsContinuousMode(true);
      setIsTTSActive(true); 
      startNewAudioSession();
      startRecognitionSafe();
    }
  };

  const toggleTTS = async () => {
      // Don't allow toggling on if waiting for quota
      if (cooldownSeconds > 0 && !isTTSActive) {
          showToast(`사용량 초과로 인해 ${cooldownSeconds}초 대기 중입니다.`, 'error');
          return;
      }

      const newState = !isTTSActive;
      setIsTTSActive(newState);
      
      if (!newState) {
          startNewAudioSession();
      } else {
          // IMPORTANT: Initialize audio context immediately on user gesture
          await initAudioContext();
          showToast("음성 답변이 활성화되었습니다.");
      }
  };

  const handleManualPlay = async (text: string, id: string) => {
      if (cooldownSeconds > 0) {
          showToast(`사용량 초과로 인해 ${cooldownSeconds}초 대기 중입니다.`, 'error');
          return;
      }

      // Warm up and reset session
      await initAudioContext();
      startNewAudioSession();
      
      setPlayingMessageId(id);
      setIsAudioLoading(true);
      setTtsStatus('loading');

      if (loadingSafetyTimerRef.current) clearTimeout(loadingSafetyTimerRef.current);
      loadingSafetyTimerRef.current = setTimeout(() => {
          if (isAudioLoading) {
              setIsAudioLoading(false);
              setPlayingMessageId(null);
              setTtsStatus('idle');
          }
      }, 10000);

      ttsQueueRef.current = [];
      let textToPlay = text.length > AUDIO_CHAR_LIMIT ? text.slice(0, AUDIO_CHAR_LIMIT) : text;
      addToTTSQueue(textToPlay);
  };

  const handleManualStop = () => {
      startNewAudioSession();
      setIsAiSpeaking(false);
  };

  const handleSendMessage = async (text: string = inputValue, displayText?: string) => {
    if (cooldownSeconds > 0) {
        showToast(`사용량 초과로 인해 ${cooldownSeconds}초 대기 중입니다.`, 'error');
        return;
    }
    if (!text.trim() || isLoading) return;

    // Reset Audio State & Session
    startNewAudioSession();
    // Warm up context for response
    await initAudioContext();
    
    // Stop Recognition IMMEDIATELY and SAFELY (Android fix)
    try { 
        if (isListening || recognitionRef.current) {
            recognitionRef.current?.abort(); // Abort releases mic faster than stop
        }
    } catch(e) {}

    // Add a small delay for Android Audio Focus to return to speaker from mic
    if (isTTSActive) {
        setIsAudioLoading(true);
        setTtsStatus('loading');
        // Wait 300ms for Mic to release focus
        await new Promise(resolve => setTimeout(resolve, 300));
    } else {
        setPlayingMessageId(null);
        setIsAudioLoading(false);
    }
    
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    let activeSessionId = currentSessionIdRef.current;
    if (!activeSessionId) {
        const summaryText = displayText || text;
        const summary = summaryText.slice(0, 20) + (summaryText.length > 20 ? '...' : '');
        activeSessionId = createNewSession(summary);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: displayText || text, 
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    isLoadingRef.current = true;
    
    ttsBufferRef.current = "";
    ttsQueueRef.current = [];
    isGeneratingTTS.current = false;

    const aiMessageId = (Date.now() + 1).toString();
    if (isTTSActive) setPlayingMessageId(aiMessageId);

    const aiMessage: Message = {
      id: aiMessageId,
      role: 'model',
      text: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      let fullText = "";
      
      await sendMessageStream(text, (chunkText, sources) => {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.id === aiMessageId) {
              return { ...msg, text: chunkText, sources: sources || msg.sources };
            }
            return msg;
          });
        });

        // Only process TTS if session hasn't changed
        if (isTTSActive) {
            const newContent = chunkText.slice(fullText.length);
            fullText = chunkText;
            
            if (audioCharCountRef.current < AUDIO_CHAR_LIMIT) {
                ttsBufferRef.current += newContent;
                const isFirstBatch = audioCharCountRef.current === 0;
                // Drill mode needs larger chunks to detect English
                const batchThreshold = isDrillModeRef.current ? 150 : (isFirstBatch ? 10 : 50);

                if (ttsBufferRef.current.length >= batchThreshold) {
                    const match = ttsBufferRef.current.match(/[.?!。？！\n]/);
                    if (match && match.index !== undefined) {
                        const splitIndex = match.index + 1;
                        const sentence = ttsBufferRef.current.slice(0, splitIndex);
                        const remaining = ttsBufferRef.current.slice(splitIndex);

                        if (audioCharCountRef.current + sentence.length <= AUDIO_CHAR_LIMIT) {
                            addToTTSQueue(sentence);
                            audioCharCountRef.current += sentence.length;
                        }
                        ttsBufferRef.current = remaining;
                    }
                }
            }
        } else {
             fullText = chunkText;
        }
      });

      // Process remaining text in buffer
      if (isTTSActive && ttsBufferRef.current.trim().length > 0) {
          if (audioCharCountRef.current < AUDIO_CHAR_LIMIT) {
              addToTTSQueue(ttsBufferRef.current);
          }
      }

    } catch (error: any) {
      console.error("Streaming error:", error);
      
      const errMsg = error.message || "응답 오류가 발생했습니다.";
      showToast(errMsg, 'error');
      
      if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          setCooldownSeconds(60); 
      }
      
      setMessages((prev) => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: msg.text + `\n(⚠️ ${errMsg})` } : msg));
      setIsAudioLoading(false);
      startNewAudioSession();
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      setMessages((prev) => prev.map((msg) => (msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg)));
      
      if (isTTSActive && ttsQueueRef.current.length === 0 && !isGeneratingTTS.current && !isAiSpeakingRef.current) {
          setIsAudioLoading(false);
      }
    }
  };
  
  handleSendMessageRef.current = handleSendMessage;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEnglishMode = (level: 'beginner' | 'intermediate') => {
      setIsEnglishModalOpen(false);
      const prompt = prompts[level];
      const newSessionTitle = level === 'beginner' ? '영어 기초 (지나)' : '영어 중급 (알렉스)';
      const newSessionId = createNewSession(newSessionTitle);
      
      setMessages([]);
      setCurrentSessionId(newSessionId);
      currentSessionIdRef.current = newSessionId; 
      
      startNewAudioSession();

      setIsDrillMode(false); 

      initializeChat(prompt);
      handleSendMessage("시작"); 
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#121212] text-gray-100 overflow-hidden font-sans">
      
      <Sidebar 
        isOpen={isSidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        activeCategoryId={activeServiceCategoryId} 
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onTogglePin={handleTogglePin}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenEnglish={() => setIsEnglishModalOpen(true)}
        onSelectServiceCategory={handleSelectServiceCategory}
        onClose={() => setIsSidebarOpen(false)}
        onImportSessions={handleImportSessions}
      />

      <div className="flex-1 flex flex-col h-full relative w-full">
        <header className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e1e] border-b border-gray-800 shadow-md z-10">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
              >
                <Menu size={18} />
              </button>
            )}
            <div className="flex flex-col">
                <h1 className="text-sm md:text-base font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
                    <Sparkles size={14} className="text-emerald-400" />
                    MAZI AI v1.51
                </h1>
            </div>
          </div>
        </header>

        {isConfigError && (
           <div className="bg-red-900/20 border-b border-red-900/50 p-2 text-center text-xs text-red-200 flex items-center justify-center gap-2">
              <AlertCircle size={14} />
              <span>API 키 설정 오류. Vercel 환경 변수(VITE_API_KEY)를 확인해주세요.</span>
           </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#121212]">
          <div className="max-w-4xl mx-auto flex flex-col min-h-full">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-60 mt-10 md:mt-0">
                <div className="w-20 h-20 bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                    <Sparkles size={40} className="text-emerald-600" />
                </div>
                <p className="text-lg font-medium mb-2">좋은 시간 함께 해요</p>
                <p className="text-sm text-center max-w-xs">
                  다양한 작업을 도와드립니다
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isTTSActive={isTTSActive}
                    isPlaying={playingMessageId === msg.id} 
                    isAudioLoading={playingMessageId === msg.id && isAudioLoading}
                    ttsStatus={playingMessageId === msg.id ? ttsStatus : 'idle'}
                    onPlay={handleManualPlay}
                    onStop={handleManualStop}
                  />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} className="h-4" />
              </>
            )}
          </div>
        </main>

        <ServiceSubMenu 
          activeCategoryId={activeServiceCategoryId}
          isLoading={isLoading || cooldownSeconds > 0}
          onSelect={handleServiceItemSelect}
          onClose={handleCloseServiceMenu}
        />

        <div className="p-4 bg-[#1e1e1e] border-t border-gray-800">
          <div className="max-w-4xl mx-auto flex items-end gap-2">
            
            <button
               onClick={toggleTTS}
               disabled={cooldownSeconds > 0}
               className={`p-3 mb-1 rounded-full transition-all border ${
                 isTTSActive 
                   ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' 
                   : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-800'
               } ${cooldownSeconds > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
               title="음성 답변 (TTS) 켜기/끄기"
            >
               {isTTSActive ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>

            <div className={`flex-1 relative bg-[#2a2a2a] rounded-2xl border border-gray-700 flex items-end transition-colors ${cooldownSeconds > 0 ? 'opacity-50' : 'focus-within:border-emerald-500/50'}`}>
              <button
                onClick={toggleListening}
                disabled={cooldownSeconds > 0}
                className={`p-2 ml-1 my-1 rounded-xl transition-all ${
                  isContinuousMode 
                    ? 'bg-red-500/20 text-red-500 animate-pulse' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                } ${cooldownSeconds > 0 ? 'cursor-not-allowed' : ''}`}
                title="마이크 켜기"
              >
                {isContinuousMode ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={cooldownSeconds > 0 ? `서비스 사용량 초과. ${cooldownSeconds}초 후 이용 가능합니다.` : (isContinuousMode ? "말씀해 주세요..." : "메시지를 입력하세요...")}
                className="flex-1 bg-transparent border-none text-white p-3 max-h-32 min-h-[48px] resize-none focus:ring-0 custom-scrollbar text-base disabled:cursor-not-allowed"
                rows={1}
                disabled={(isContinuousMode && isListening) || cooldownSeconds > 0}
              />
            </div>
            
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading || cooldownSeconds > 0}
              className={`p-3 mb-1 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px] ${
                  cooldownSeconds > 0 ? 'bg-gray-700 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {cooldownSeconds > 0 ? (
                  <span className="text-xs font-bold font-mono">{cooldownSeconds}</span>
              ) : (
                  <Send size={20} />
              )}
            </button>
          </div>
        </div>

        {toast && (
            <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-xl border text-sm animate-in fade-in slide-in-from-top-2 z-50 ${
                toast.type === 'error' ? 'bg-red-900/90 border-red-800 text-white' : 'bg-gray-800/90 border-gray-700 text-white'
            }`}>
                {toast.message}
            </div>
        )}

        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            selectedVoice={currentVoice}
            onVoiceChange={setCurrentVoice}
            isHistoryEnabled={isHistoryEnabled}
            onHistoryEnabledChange={setIsHistoryEnabled}
            onFactoryReset={handleFactoryReset}
        />
        <EnglishLevelModal 
            isOpen={isEnglishModalOpen} 
            onClose={() => setIsEnglishModalOpen(false)}
            onSelectLevel={handleEnglishMode}
        />
      </div>
    </div>
  );
};

export default App;
