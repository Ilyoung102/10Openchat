import { useState, useCallback, useRef, useEffect } from 'react';

// 정지 신호 단어 목록
const STOP_WORDS = ['스톱', '정지', '그만', '알았어', '내말 들어봐', '내 말 들어봐', '멈춰', '중지'];

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  onStopWordDetected?: () => void;
  lang?: string;
  autoSendDelayMs?: number;
  pauseWhenTTSPlaying?: boolean;
}

export const useSpeechRecognition = ({ 
  onResult, 
  onSpeechEnd,
  onStopWordDetected,
  lang = 'ko-KR',
  autoSendDelayMs = 2000,
  pauseWhenTTSPlaying = true
}: UseSpeechRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSupport, setHasSupport] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPausedForTTS, setIsPausedForTTS] = useState(false);
  const [hasAudioInput, setHasAudioInput] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const onResultRef = useRef(onResult);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onStopWordDetectedRef = useRef(onStopWordDetected);
  const isPausedForTTSRef = useRef(false);
  const lastFinalResultRef = useRef<string>('');

  useEffect(() => {
    onResultRef.current = onResult;
    onSpeechEndRef.current = onSpeechEnd;
    onStopWordDetectedRef.current = onStopWordDetected;
  }, [onResult, onSpeechEnd, onStopWordDetected]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasSupport(false);
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSupport(false);
      return;
    }

    setHasSupport(true);
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setHasAudioInput(false);
  }, []);

  const startAudioLevelMonitoring = useCallback(async () => {
    if (streamRef.current) return;
    
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        } 
      });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const threshold = 10;

      audioLevelIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setHasAudioInput(average > threshold);
      }, 50);
    } catch (e) {
      console.error('Failed to start audio level monitoring:', e);
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  const checkStopWords = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    return STOP_WORDS.some(word => lowerText.includes(word.toLowerCase()));
  }, []);

  const startAutoSendTimer = useCallback(() => {
    clearTimers();
    
    const text = accumulatedTranscriptRef.current.trim();
    if (!text) return;
    
    const steps = Math.ceil(autoSendDelayMs / 100);
    let remaining = steps;
    
    setCountdown(remaining);
    
    countdownIntervalRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 100);
    
    autoSendTimerRef.current = setTimeout(() => {
      const finalText = accumulatedTranscriptRef.current.trim();
      if (finalText && onSpeechEndRef.current) {
        onSpeechEndRef.current(finalText);
      }
      accumulatedTranscriptRef.current = '';
      lastFinalResultRef.current = '';
      setTranscript('');
      clearTimers();
    }, autoSendDelayMs);
  }, [autoSendDelayMs, clearTimers]);

  const stopListening = useCallback(() => {
    clearTimers();
    stopAudioLevelMonitoring();
    isListeningRef.current = false;
    setIsListening(false);
    setIsPausedForTTS(false);
    isPausedForTTSRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      recognitionRef.current = null;
    }
    
    accumulatedTranscriptRef.current = '';
    lastFinalResultRef.current = '';
    setTranscript('');
  }, [clearTimers, stopAudioLevelMonitoring]);

  // TTS 재생 중 마이크 일시 정지/재개
  const pauseForTTS = useCallback(() => {
    if (!pauseWhenTTSPlaying) return;
    isPausedForTTSRef.current = true;
    setIsPausedForTTS(true);
    
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null; // Clear ref so resumeFromTTS can restart
    }
  }, [pauseWhenTTSPlaying]);

  const resumeFromTTS = useCallback(() => {
    if (!pauseWhenTTSPlaying) return;
    isPausedForTTSRef.current = false;
    setIsPausedForTTS(false);
    
    // 음성 인식이 활성 상태였다면 재시작
    if (isListeningRef.current && !recognitionRef.current) {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setError(null);
      };

      recognition.onresult = handleRecognitionResult;

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // 무시
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError("마이크 권한이 필요합니다.");
          stopListening();
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && !isPausedForTTSRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (e) {}
    }
  }, [pauseWhenTTSPlaying, lang, stopListening]);

  const handleRecognitionResult = useCallback((event: any) => {
    // TTS 재생 중이면 입력 무시 (에코 캔슬링)
    if (isPausedForTTSRef.current) return;

    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        const text = result[0].transcript;
        // 중복 방지: 이전 final result와 동일하면 무시
        if (text !== lastFinalResultRef.current) {
          finalTranscript += text;
          lastFinalResultRef.current = text;
        }
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      // 정지 단어 감지
      if (checkStopWords(finalTranscript)) {
        if (onStopWordDetectedRef.current) {
          onStopWordDetectedRef.current();
        }
        // 정지 단어가 감지되면 해당 텍스트를 전송하지 않고 무시
        accumulatedTranscriptRef.current = '';
        setTranscript('');
        clearTimers();
        return;
      }

      accumulatedTranscriptRef.current += finalTranscript;
      setTranscript(accumulatedTranscriptRef.current);
      if (onResultRef.current) {
        onResultRef.current(accumulatedTranscriptRef.current);
      }
      startAutoSendTimer();
    } else if (interimTranscript) {
      // 정지 단어 실시간 감지
      if (checkStopWords(interimTranscript)) {
        if (onStopWordDetectedRef.current) {
          onStopWordDetectedRef.current();
        }
      }
      
      const displayText = accumulatedTranscriptRef.current + interimTranscript;
      setTranscript(displayText);
      if (onResultRef.current) {
        onResultRef.current(displayText);
      }
      clearTimers();
    }
  }, [checkStopWords, clearTimers, startAutoSendTimer]);

  const startListening = useCallback((initialText?: string) => {
    if (typeof window === 'undefined') return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("음성 인식을 지원하지 않는 브라우저입니다.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    clearTimers();
    accumulatedTranscriptRef.current = initialText || '';
    lastFinalResultRef.current = '';
    setTranscript(initialText || '');
    setError(null);
    isPausedForTTSRef.current = false;
    setIsPausedForTTS(false);
    
    if (initialText && onResultRef.current) {
      onResultRef.current(initialText);
    }
    
    if (initialText) {
      startAutoSendTimer();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setError(null);
      setDebugInfo('Started');
      startAudioLevelMonitoring();
    };

    recognition.onresult = (event: any) => {
      setDebugInfo(`Result: ${event.results.length} items`);
      handleRecognitionResult(event);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setDebugInfo(`Error: ${event.error}`);
      
      if (event.error === 'no-speech') {
        setDebugInfo('No speech detected');
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setError("마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.");
        stopListening();
      } else if (event.error === 'aborted') {
        setDebugInfo('Aborted');
      } else {
        setError(`음성 인식 오류: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setDebugInfo('Ended, restarting...');
      if (isListeningRef.current && !isPausedForTTSRef.current) {
        try {
          recognition.start();
          setDebugInfo('Restarted');
        } catch (e) {
          console.error('Failed to restart recognition:', e);
          setDebugInfo('Restart failed');
          isListeningRef.current = false;
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start recognition:', e);
      setError("음성 인식을 시작할 수 없습니다.");
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [lang, clearTimers, handleRecognitionResult, stopListening, startAutoSendTimer, startAudioLevelMonitoring]);

  const cancelAutoSend = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const seedTranscript = useCallback((text: string) => {
    if (!text || text.length < 2) return;
    
    const currentText = accumulatedTranscriptRef.current;
    if (!currentText) {
      accumulatedTranscriptRef.current = text;
    } else {
      accumulatedTranscriptRef.current = text + ' ' + currentText;
    }
    setTranscript(accumulatedTranscriptRef.current);
    if (onResultRef.current) {
      onResultRef.current(accumulatedTranscriptRef.current);
    }
    startAutoSendTimer();
  }, [startAutoSendTimer]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopAudioLevelMonitoring();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [clearTimers, stopAudioLevelMonitoring]);

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    cancelAutoSend,
    seedTranscript,
    pauseForTTS,
    resumeFromTTS,
    isPausedForTTS,
    error, 
    hasSupport,
    countdown,
    isCountingDown: countdown !== null && countdown > 0,
    hasAudioInput,
    debugInfo
  };
};
