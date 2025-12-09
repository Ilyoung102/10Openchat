import { useState, useCallback, useRef, useEffect } from 'react';

const STOP_WORDS = ['스톱', '정지', '그만', '알았어', '내말 들어봐', '내 말 들어봐', '멈춰', '중지'];

interface UseWhisperRecognitionProps {
  onResult?: (transcript: string) => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  onStopWordDetected?: () => void;
  lang?: string;
  autoSendDelayMs?: number;
  pauseWhenTTSPlaying?: boolean;
}

export const useWhisperRecognition = ({
  onResult,
  onSpeechEnd,
  onStopWordDetected,
  lang = 'ko-KR',
  autoSendDelayMs = 2000,
  pauseWhenTTSPlaying = true
}: UseWhisperRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasSupport, setHasSupport] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPausedForTTS, setIsPausedForTTS] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasAudioInput, setHasAudioInput] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef(false);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const onResultRef = useRef(onResult);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onStopWordDetectedRef = useRef(onStopWordDetected);
  const isPausedForTTSRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('audio/webm');
  const startNewRecordingRef = useRef<(() => void) | null>(null);

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

    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    
    setHasSupport(hasMediaDevices && hasMediaRecorder);
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
    setHasAudioInput(false);
  }, []);

  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
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
      const threshold = 5;

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
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
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
      setTranscript('');
      clearTimers();
    }, autoSendDelayMs);
  }, [autoSendDelayMs, clearTimers]);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<void> => {
    if (audioBlob.size === 0) return;
    
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.text) {
        const newText = data.text.trim();
        
        if (checkStopWords(newText)) {
          if (onStopWordDetectedRef.current) {
            onStopWordDetectedRef.current();
          }
          accumulatedTranscriptRef.current = '';
          setTranscript('');
          clearTimers();
          return;
        }
        
        if (accumulatedTranscriptRef.current) {
          accumulatedTranscriptRef.current += ' ' + newText;
        } else {
          accumulatedTranscriptRef.current = newText;
        }
        
        setTranscript(accumulatedTranscriptRef.current);
        if (onResultRef.current) {
          onResultRef.current(accumulatedTranscriptRef.current);
        }
        startAutoSendTimer();
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError('음성 변환 오류가 발생했습니다.');
    } finally {
      setIsTranscribing(false);
    }
  }, [checkStopWords, clearTimers, startAutoSendTimer]);

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
    }
  }, []);

  const startNewRecording = useCallback(() => {
    if (!streamRef.current || !isListeningRef.current || isPausedForTTSRef.current) {
      return;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    chunksRef.current = [];
    
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      
      mimeTypeRef.current = mimeType;
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];
        
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        if (recordingDuration > 500 && audioBlob.size > 0) {
          await transcribeAudio(audioBlob);
        }
        
        if (isListeningRef.current && !isPausedForTTSRef.current && streamRef.current && startNewRecordingRef.current) {
          startNewRecordingRef.current();
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.start();
      silenceTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } catch (e) {
      console.error('Failed to start recording:', e);
      setError('녹음을 시작할 수 없습니다.');
    }
  }, [transcribeAudio]);

  useEffect(() => {
    startNewRecordingRef.current = startNewRecording;
  }, [startNewRecording]);

  const stopListening = useCallback(() => {
    clearTimers();
    stopAudioLevelMonitoring();
    isListeningRef.current = false;
    setIsListening(false);
    setIsPausedForTTS(false);
    isPausedForTTSRef.current = false;
    
    stopRecording();
    mediaRecorderRef.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    chunksRef.current = [];
    accumulatedTranscriptRef.current = '';
    setTranscript('');
  }, [clearTimers, stopRecording, stopAudioLevelMonitoring]);

  const pauseForTTS = useCallback(() => {
    if (!pauseWhenTTSPlaying) return;
    isPausedForTTSRef.current = true;
    setIsPausedForTTS(true);
    
    stopRecording();
    clearTimers();
  }, [pauseWhenTTSPlaying, clearTimers, stopRecording]);

  const resumeFromTTS = useCallback(() => {
    if (!pauseWhenTTSPlaying) return;
    isPausedForTTSRef.current = false;
    setIsPausedForTTS(false);
    
    if (isListeningRef.current && streamRef.current) {
      startNewRecording();
    }
  }, [pauseWhenTTSPlaying, startNewRecording]);

  const startListening = useCallback(async (initialText?: string) => {
    if (typeof window === 'undefined') return;
    
    if (!hasSupport) {
      setError('이 기기에서는 음성 녹음을 지원하지 않습니다.');
      return;
    }

    clearTimers();
    accumulatedTranscriptRef.current = initialText || '';
    setTranscript(initialText || '');
    setError(null);
    isPausedForTTSRef.current = false;
    setIsPausedForTTS(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      isListeningRef.current = true;
      setIsListening(true);
      
      startAudioLevelMonitoring(stream);
      
      if (initialText && onResultRef.current) {
        onResultRef.current(initialText);
      }
      
      if (initialText) {
        startAutoSendTimer();
      }
      
      startNewRecording();
    } catch (err: any) {
      console.error('getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
      } else {
        setError('마이크에 접근할 수 없습니다.');
      }
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [hasSupport, clearTimers, startAutoSendTimer, startNewRecording, startAudioLevelMonitoring]);

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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
    isTranscribing,
    hasAudioInput
  };
};
