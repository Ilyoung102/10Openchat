import { useState, useEffect } from 'react';
import { useSpeechRecognition } from './use-speech-recognition';
import { useWhisperRecognition } from './use-whisper-recognition';

type SpeechMode = 'web' | 'whisper' | 'none';

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
  mode: 'none'
};

export function useVoiceRecognition(props: UseVoiceRecognitionProps): VoiceRecognitionResult {
  const [mode, setMode] = useState<SpeechMode>(() => {
    if (typeof window !== 'undefined') {
      return detectSpeechSupport();
    }
    return 'none';
  });

  useEffect(() => {
    const detected = detectSpeechSupport();
    if (detected !== mode) {
      setMode(detected);
    }
  }, []);

  const webSpeechResult = useSpeechRecognition(props);
  const whisperResult = useWhisperRecognition(props);

  if (mode === 'web') {
    return {
      ...webSpeechResult,
      isTranscribing: false,
      hasAudioInput: webSpeechResult.hasAudioInput,
      mode: 'web'
    };
  } else if (mode === 'whisper') {
    return {
      ...whisperResult,
      hasAudioInput: whisperResult.hasAudioInput,
      mode: 'whisper'
    };
  } else {
    return noopResult;
  }
}
