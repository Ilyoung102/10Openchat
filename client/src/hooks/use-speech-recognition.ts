import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  lang?: string;
  autoSendDelayMs?: number;
}

export const useSpeechRecognition = ({ 
  onResult, 
  onSpeechEnd,
  lang = 'ko-KR',
  autoSendDelayMs = 2000
}: UseSpeechRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSupport, setHasSupport] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const onResultRef = useRef(onResult);
  const onSpeechEndRef = useRef(onSpeechEnd);

  useEffect(() => {
    onResultRef.current = onResult;
    onSpeechEndRef.current = onSpeechEnd;
  }, [onResult, onSpeechEnd]);

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
      setTranscript('');
      clearTimers();
    }, autoSendDelayMs);
  }, [autoSendDelayMs, clearTimers]);

  const stopListening = useCallback(() => {
    clearTimers();
    isListeningRef.current = false;
    setIsListening(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      recognitionRef.current = null;
    }
    
    accumulatedTranscriptRef.current = '';
    setTranscript('');
  }, [clearTimers]);

  const startListening = useCallback(() => {
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
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        accumulatedTranscriptRef.current += finalTranscript;
        setTranscript(accumulatedTranscriptRef.current);
        if (onResultRef.current) {
          onResultRef.current(accumulatedTranscriptRef.current);
        }
        startAutoSendTimer();
      } else if (interimTranscript) {
        const displayText = accumulatedTranscriptRef.current + interimTranscript;
        setTranscript(displayText);
        if (onResultRef.current) {
          onResultRef.current(displayText);
        }
        clearTimers();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      if (event.error === 'no-speech') {
        // 음성이 감지되지 않음 - 조용히 처리
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setError("마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.");
        stopListening();
      } else if (event.error === 'aborted') {
        // 사용자가 취소함 - 정상
      } else {
        setError(`음성 인식 오류: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
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
  }, [lang, clearTimers, startAutoSendTimer, stopListening]);

  const cancelAutoSend = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [clearTimers]);

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    cancelAutoSend,
    error, 
    hasSupport,
    countdown,
    isCountingDown: countdown !== null && countdown > 0
  };
};
