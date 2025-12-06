import { useState, useCallback, useRef, useEffect } from 'react';

const WAKE_WORDS = ['마지야', '마지아', '마지', 'mazi', 'majiya'];

interface UseWakeWordProps {
  onWakeWordDetected?: () => void;
  enabled?: boolean;
  lang?: string;
}

export const useWakeWord = ({
  onWakeWordDetected,
  enabled = false,
  lang = 'ko-KR'
}: UseWakeWordProps = {}) => {
  const [isWakeListening, setIsWakeListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const isWakeListeningRef = useRef(false);
  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasSupport(false);
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSupport(false);
    }
  }, []);

  const checkWakeWord = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    return WAKE_WORDS.some(word => lowerText.includes(word.toLowerCase()));
  }, []);

  const stopWakeListening = useCallback(() => {
    isWakeListeningRef.current = false;
    setIsWakeListening(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  const startWakeListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isWakeListeningRef.current = true;
      setIsWakeListening(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        
        if (checkWakeWord(text)) {
          if (onWakeWordDetectedRef.current) {
            onWakeWordDetectedRef.current();
          }
          return;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Ignore
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        stopWakeListening();
      }
    };

    recognition.onend = () => {
      if (isWakeListeningRef.current && enabledRef.current) {
        setTimeout(() => {
          if (isWakeListeningRef.current && enabledRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      isWakeListeningRef.current = false;
      setIsWakeListening(false);
    }
  }, [lang, checkWakeWord, stopWakeListening]);

  useEffect(() => {
    if (enabled && hasSupport) {
      startWakeListening();
    } else {
      stopWakeListening();
    }
    
    return () => {
      stopWakeListening();
    };
  }, [enabled, hasSupport, startWakeListening, stopWakeListening]);

  return {
    isWakeListening,
    hasSupport,
    startWakeListening,
    stopWakeListening
  };
};
