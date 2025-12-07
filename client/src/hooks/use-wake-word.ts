import { useState, useCallback, useRef, useEffect } from 'react';

const WAKE_WORDS = [
  '마지야', '마지아', '마지', '맞이야', '맞이', '마찌야', '마찌', 
  '마즈야', '마즈', '마쥐야', '마쥐', '마지요', '마지얌',
  'mazi', 'majiya', 'maji', 'maziya'
];

interface UseWakeWordProps {
  onWakeWordDetected?: (remainingText?: string) => void;
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
  const lastDetectedTimeRef = useRef(0);

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

  const checkWakeWord = useCallback((text: string): { found: boolean; remainingText?: string } => {
    const lowerText = text.toLowerCase().trim();
    const normalizedText = lowerText
      .replace(/\s+/g, '')
      .replace(/[.,!?]/g, '');
    
    for (const word of WAKE_WORDS) {
      const lowerWord = word.toLowerCase();
      const normalizedWord = lowerWord.replace(/\s+/g, '');
      
      const index = normalizedText.indexOf(normalizedWord);
      if (index !== -1) {
        const originalIndex = lowerText.indexOf(lowerWord);
        const remaining = originalIndex !== -1 
          ? text.trim().substring(originalIndex + word.length).trim()
          : '';
        return { found: true, remainingText: remaining || undefined };
      }
      
      if (normalizedText.includes(normalizedWord)) {
        return { found: true, remainingText: undefined };
      }
    }
    return { found: false };
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
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      isWakeListeningRef.current = true;
      setIsWakeListening(true);
    };

    recognition.onresult = (event: any) => {
      const now = Date.now();
      if (now - lastDetectedTimeRef.current < 2000) {
        return;
      }

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        for (let j = 0; j < result.length; j++) {
          const text = result[j].transcript;
          const confidence = result[j].confidence;
          
          const wakeResult = checkWakeWord(text);
          if (wakeResult.found) {
            if (result.isFinal || confidence > 0.5) {
              lastDetectedTimeRef.current = now;
              if (onWakeWordDetectedRef.current) {
                onWakeWordDetectedRef.current(wakeResult.remainingText);
              }
              return;
            }
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Ignore - normal behavior
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
        }, 50);
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
