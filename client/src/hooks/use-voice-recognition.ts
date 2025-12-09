import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from './use-speech-recognition';
import { useWhisperRecognition } from './use-whisper-recognition';

type SpeechMode = 'web' | 'whisper' | 'none';
const AUTO_FALLBACK_TIMEOUT_MS = 5000;

function detectSpeechSupport(): SpeechMode {
  if (typeof window === 'undefined') {
    return 'none';
  }

  // @ts-ignore
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    return 'web';
  }

  const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  if (hasMediaDevices && hasMediaRecorder) {
    return 'whisper';
  }

  return 'none';
}

interface UseVoiceRecognitionProps {
  onResult?: (transcript: string) => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  onStopWordDetected?: () => void;
  lang?: string;
  autoSendDelayMs?: number;
  pauseWhenTTSPlaying?: boolean;
  forceWhisper?: boolean;
}

interface VoiceRecognitionResult {
  isListening: boolean;
  transcript: string;
  startListening: (initialText?: string) => void;
  stopListening: () => void;
  cancelAutoSend: () => void;
  seedTranscript: (text: string) => void;
  pauseForTTS: () => void;
  resumeFromTTS: () => void;
  isPausedForTTS: boolean;
  error: string | null;
  hasSupport: boolean;
  countdown: number | null;
  isCountingDown: boolean;
  isTranscribing: boolean;
  hasAudioInput: boolean;
  debugInfo: string;
  mode: SpeechMode;
}

const noopResult: VoiceRecognitionResult = {
  isListening: false,
  transcript: '',
  startListening: () => {},
  stopListening: () => {},
  cancelAutoSend: () => {},
  seedTranscript: () => {},
  pauseForTTS: () => {},
  resumeFromTTS: () => {},
  isPausedForTTS: false,
  error: null,
  hasSupport: false,
  countdown: null,
  isCountingDown: false,
  isTranscribing: false,
  hasAudioInput: false,
  debugInfo: '',
  mode: 'none'
};

export function useVoiceRecognition(props: UseVoiceRecognitionProps): VoiceRecognitionResult {
  const { forceWhisper = false } = props;
  
  const [detectedMode, setDetectedMode] = useState<SpeechMode>(() => {
    if (typeof window !== 'undefined') {
      return detectSpeechSupport();
    }
    return 'none';
  });
  
  const [autoFallbackActive, setAutoFallbackActive] = useState(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hadResultRef = useRef(false);
  const wasListeningRef = useRef(false);
  const activeEngineRef = useRef<'web' | 'whisper' | null>(null);

  useEffect(() => {
    const detected = detectSpeechSupport();
    if (detected !== detectedMode) {
      setDetectedMode(detected);
    }
  }, []);

  const webSpeechResult = useSpeechRecognition(props);
  const whisperResult = useWhisperRecognition(props);

  const hasWhisperSupport = typeof window !== 'undefined' && 
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';
  
  const effectiveMode: SpeechMode = (forceWhisper || autoFallbackActive) && hasWhisperSupport 
    ? 'whisper' 
    : detectedMode;

  useEffect(() => {
    if (forceWhisper && autoFallbackActive) {
      setAutoFallbackActive(false);
    }
  }, [forceWhisper]);

  useEffect(() => {
    if (detectedMode !== 'web' || forceWhisper || autoFallbackActive) {
      return;
    }

    const justStartedListening = webSpeechResult.isListening && !wasListeningRef.current;
    const justStoppedListening = !webSpeechResult.isListening && wasListeningRef.current;
    wasListeningRef.current = webSpeechResult.isListening;

    if (justStartedListening && webSpeechResult.hasAudioInput && !hadResultRef.current) {
      fallbackTimerRef.current = setTimeout(() => {
        if (!hadResultRef.current && hasWhisperSupport) {
          webSpeechResult.stopListening();
          activeEngineRef.current = null;
          setAutoFallbackActive(true);
        }
        fallbackTimerRef.current = null;
      }, AUTO_FALLBACK_TIMEOUT_MS);
    }
    
    if (webSpeechResult.transcript) {
      hadResultRef.current = true;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    }
    
    if (justStoppedListening) {
      hadResultRef.current = false;
      activeEngineRef.current = null;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    }
  }, [webSpeechResult.isListening, webSpeechResult.hasAudioInput, webSpeechResult.transcript, 
      detectedMode, forceWhisper, autoFallbackActive, hasWhisperSupport]);

  useEffect(() => {
    if (!whisperResult.isListening && activeEngineRef.current === 'whisper') {
      activeEngineRef.current = null;
    }
  }, [whisperResult.isListening]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  const wrappedStartListening = useCallback((initialText?: string) => {
    hadResultRef.current = false;
    
    if (activeEngineRef.current === 'web') {
      webSpeechResult.stopListening();
    } else if (activeEngineRef.current === 'whisper') {
      whisperResult.stopListening();
    }
    
    const shouldResetFallback = autoFallbackActive && !forceWhisper;
    if (shouldResetFallback) {
      setAutoFallbackActive(false);
      activeEngineRef.current = 'web';
      webSpeechResult.startListening(initialText);
    } else if (forceWhisper || autoFallbackActive) {
      activeEngineRef.current = 'whisper';
      whisperResult.startListening(initialText);
    } else if (detectedMode === 'web') {
      activeEngineRef.current = 'web';
      webSpeechResult.startListening(initialText);
    } else if (detectedMode === 'whisper') {
      activeEngineRef.current = 'whisper';
      whisperResult.startListening(initialText);
    }
  }, [detectedMode, forceWhisper, autoFallbackActive, webSpeechResult.startListening, whisperResult.startListening, webSpeechResult.stopListening, whisperResult.stopListening]);

  const wrappedStopListening = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (activeEngineRef.current === 'web') {
      webSpeechResult.stopListening();
    } else if (activeEngineRef.current === 'whisper') {
      whisperResult.stopListening();
    }
    activeEngineRef.current = null;
  }, [webSpeechResult.stopListening, whisperResult.stopListening]);

  const isAnyEngineListening = webSpeechResult.isListening || whisperResult.isListening;
  const reportedMode: SpeechMode = isAnyEngineListening 
    ? (activeEngineRef.current || effectiveMode)
    : effectiveMode;

  if (reportedMode === 'web') {
    return {
      ...webSpeechResult,
      startListening: wrappedStartListening,
      stopListening: wrappedStopListening,
      isTranscribing: false,
      hasAudioInput: webSpeechResult.hasAudioInput,
      debugInfo: webSpeechResult.debugInfo || 'Web Speech',
      mode: 'web'
    };
  } else if (reportedMode === 'whisper') {
    return {
      ...whisperResult,
      startListening: wrappedStartListening,
      stopListening: wrappedStopListening,
      hasAudioInput: whisperResult.hasAudioInput,
      debugInfo: autoFallbackActive ? `${whisperResult.debugInfo} (auto)` : whisperResult.debugInfo,
      mode: 'whisper'
    };
  } else {
    return noopResult;
  }
}
