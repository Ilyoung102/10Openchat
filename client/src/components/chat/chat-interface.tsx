import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, StopCircle, Sparkles, Paperclip, X, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { useWakeWord } from '@/hooks/use-wake-word';
import { cn } from '@/lib/utils';
import { playWakeSound } from '@/lib/sounds';

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  isTTSPlaying?: boolean;
  onStopWordDetected?: () => void;
  wakeWordEnabled?: boolean;
  onWakeWordEnabledChange?: (enabled: boolean) => void;
  onWakeWordTriggered?: () => void;
}

export const ChatInput = ({ 
  onSend, 
  isLoading, 
  isTTSPlaying = false, 
  onStopWordDetected,
  wakeWordEnabled = false,
  onWakeWordEnabledChange,
  onWakeWordTriggered
}: ChatInputProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onSendRef = useRef(onSend);
  const isLoadingRef = useRef(isLoading);
  
  useEffect(() => {
    onSendRef.current = onSend;
    isLoadingRef.current = isLoading;
  }, [onSend, isLoading]);

  const handleSpeechEnd = useCallback((text: string) => {
    if (text.trim() && !isLoadingRef.current) {
      onSendRef.current(text);
      setInput('');
    }
  }, []);

  const { 
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
    isCountingDown,
    isTranscribing,
    hasAudioInput,
    mode
  } = useVoiceRecognition({
    onResult: (text: string) => setInput(text),
    onSpeechEnd: handleSpeechEnd,
    onStopWordDetected: onStopWordDetected,
    lang: 'ko-KR',
    autoSendDelayMs: 1500,
    pauseWhenTTSPlaying: true
  });

  const useWhisperFallback = mode === 'whisper';

  const handleWakeWordDetected = useCallback((remainingText?: string) => {
    if (isLoadingRef.current) return;
    
    playWakeSound();
    onWakeWordTriggered?.();
    
    const textToSeed = remainingText && remainingText.length >= 2 ? remainingText : undefined;
    
    if (!isListening) {
      startListening(textToSeed);
    } else if (textToSeed) {
      seedTranscript(textToSeed);
    }
  }, [isListening, startListening, seedTranscript, onWakeWordTriggered]);

  const { isWakeListening, hasSupport: wakeHasSupport } = useWakeWord({
    onWakeWordDetected: handleWakeWordDetected,
    enabled: wakeWordEnabled && !isListening && !isTTSPlaying,
    lang: 'ko-KR'
  });

  // TTS 재생 상태에 따라 마이크 일시 정지/재개
  useEffect(() => {
    if (isTTSPlaying) {
      pauseForTTS();
    } else {
      resumeFromTTS();
    }
  }, [isTTSPlaying, pauseForTTS, resumeFromTTS]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    cancelAutoSend();
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && isCountingDown) {
      cancelAutoSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    cancelAutoSend();
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setInput('');
      startListening();
    }
  };

  const countdownProgress = countdown ? (countdown / 15) * 100 : 0;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 pb-6">
      {/* Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border",
              isPausedForTTS 
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
            )}
          >
            {/* Audio Input LED - Blue blinking when mic receives audio */}
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-all duration-75",
                hasAudioInput 
                  ? "bg-cyan-400 border-cyan-300 shadow-[0_0_20px_8px_rgba(34,211,238,1),0_0_40px_16px_rgba(34,211,238,0.6)]" 
                  : "bg-gray-600 border-gray-500"
              )}
              data-testid="led-audio-input"
            />
            <div className={cn(
              "w-2 h-2 rounded-full",
              isPausedForTTS ? "bg-yellow-500" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-xs font-medium">
              {isPausedForTTS ? "TTS 재생 중 (대기)" : isTranscribing ? "음성 변환 중..." : useWhisperFallback ? "녹음 중..." : "음성 인식 중..."}
            </span>
            {/* Debug info */}
            <span className="text-[10px] text-gray-400 ml-2">
              [{mode}] {hasAudioInput ? "🎤" : "🔇"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel - shows when listening */}
      {isListening && (
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700">
          <div>Mode: <span className="text-cyan-400">{mode}</span></div>
          <div>Audio: <span className={hasAudioInput ? "text-green-400" : "text-red-400"}>{hasAudioInput ? "감지됨" : "없음"}</span></div>
          <div>Transcribing: <span className={isTranscribing ? "text-yellow-400" : "text-gray-400"}>{isTranscribing ? "변환중" : "대기"}</span></div>
          {error && <div className="text-red-400">Error: {error}</div>}
        </div>
      )}

      {/* Auto-send Countdown Indicator */}
      <AnimatePresence>
        {isCountingDown && !isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full backdrop-blur-md border border-primary/30"
          >
            <div className="relative w-4 h-4">
              <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${countdownProgress * 0.377} 100`}
                  className="transition-all duration-100"
                />
              </svg>
            </div>
            <span className="text-xs font-medium">곧 전송합니다...</span>
            <button 
              onClick={cancelAutoSend}
              className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
              data-testid="button-cancel-autosend"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full backdrop-blur-md border border-yellow-500/30"
          >
            <span className="text-xs font-medium">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group">
        {/* Glow Effect */}
        <div className={cn(
          "absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl transition duration-500 blur",
          isListening ? "opacity-50" : "opacity-20 group-hover:opacity-50"
        )} />
        
        <div className="relative flex items-end gap-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl">
          
          {/* Wake Word Toggle */}
          {wakeHasSupport && onWakeWordEnabledChange && (
            <button 
              onClick={() => onWakeWordEnabledChange(!wakeWordEnabled)}
              className={cn(
                "p-2 rounded-lg transition-all duration-300 relative",
                wakeWordEnabled
                  ? isWakeListening
                    ? "text-green-400 bg-green-500/20"
                    : "text-green-400 bg-green-500/10"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              )}
              title={wakeWordEnabled ? "웨이크 워드 끄기" : "웨이크 워드 켜기 ('마지야')"}
              data-testid="button-wake-word"
            >
              <Radio size={20} />
              {wakeWordEnabled && isWakeListening && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </button>
          )}

          {/* Attachments (Visual only for now) */}
          <button 
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-attachment"
          >
            <Paperclip size={20} />
          </button>
          
          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="무엇이든 물어보세요..."
            className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-500 resize-none py-2 max-h-[200px] min-h-[44px] scrollbar-hide focus:outline-none"
            rows={1}
            data-testid="input-chat"
          />

          {/* Voice Input - Always show if supported */}
          <button 
            onClick={toggleListening}
            disabled={!hasSupport}
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              !hasSupport 
                ? "text-gray-600 cursor-not-allowed"
                : isListening 
                  ? isPausedForTTS
                    ? "text-yellow-400 bg-yellow-500/20"
                    : "text-red-400 bg-red-500/20 animate-pulse"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
            title={!hasSupport ? "음성 인식을 지원하지 않습니다" : isListening ? (isPausedForTTS ? "TTS 재생 중" : "음성 인식 중지") : "음성으로 입력"}
            data-testid="button-voice"
          >
            {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
          </button>

          {/* Send Button */}
          <button 
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-2 rounded-lg transition-all duration-300",
              input.trim() && !isLoading
                ? "bg-primary text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transform hover:-translate-y-0.5" 
                : "bg-white/5 text-gray-500 cursor-not-allowed"
            )}
            data-testid="button-send"
          >
            {isLoading ? (
              <Sparkles size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
