import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  continuous?: boolean;
  lang?: string;
  autoSendDelayMs?: number;
}

export const useSpeechRecognition = ({ 
  onResult, 
  onSpeechEnd,
  continuous = true,
  lang = 'ko-KR',
  autoSendDelayMs = 1500
}: UseSpeechRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSupport, setHasSupport] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');

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
    
    if (!finalTranscriptRef.current.trim()) return;
    
    const steps = Math.ceil(autoSendDelayMs / 100);
    let remaining = steps;
    
    setCountdown(remaining);
    
    countdownIntervalRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    }, 100);
    
    autoSendTimerRef.current = setTimeout(() => {
      const text = finalTranscriptRef.current.trim();
      if (text && onSpeechEnd) {
        onSpeechEnd(text);
        finalTranscriptRef.current = '';
        setTranscript('');
      }
      clearTimers();
    }, autoSendDelayMs);
  }, [autoSendDelayMs, onSpeechEnd, clearTimers]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasSupport(false);
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSupport(false);
      setError("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
      return;
    }

    setHasSupport(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      finalTranscriptRef.current = '';
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setTranscript(currentText);
      
      if (onResult) {
        onResult(currentText);
      }

      if (finalTranscript) {
        finalTranscriptRef.current = finalTranscript;
        startAutoSendTimer();
      }
    };

    recognition.onspeechend = () => {
      if (finalTranscriptRef.current.trim()) {
        startAutoSendTimer();
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'no-speech') {
        setError(null);
      } else if (event.error === 'not-allowed') {
        setError("마이크 권한이 필요합니다.");
      } else {
        setError(event.error);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [continuous, lang, onResult, startAutoSendTimer, clearTimers]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        finalTranscriptRef.current = '';
        setTranscript('');
        clearTimers();
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  }, [clearTimers]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    clearTimers();
  }, [clearTimers]);

  const cancelAutoSend = useCallback(() => {
    clearTimers();
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
