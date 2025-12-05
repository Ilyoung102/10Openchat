import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, StopCircle, Sparkles, Paperclip, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onSendRef = useRef(onSend);
  const isLoadingRef = useRef(isLoading);
  
  useEffect(() => {
    onSendRef.current = onSend;
    isLoadingRef.current = isLoading;
  }, [onSend, isLoading]);

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    cancelAutoSend,
    error,
    hasSupport,
    countdown,
    isCountingDown
  } = useSpeechRecognition({
    onResult: (text) => setInput(text),
    onSpeechEnd: useCallback((text: string) => {
      if (text.trim() && !isLoadingRef.current) {
        onSendRef.current(text);
        setInput('');
      }
    }, []),
    lang: 'ko-KR',
    autoSendDelayMs: 1500
  });

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
            className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full backdrop-blur-md border border-red-500/30"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">음성 인식 중...</span>
          </motion.div>
        )}
      </AnimatePresence>

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
                  ? "text-red-400 bg-red-500/20 animate-pulse" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
            title={!hasSupport ? "음성 인식을 지원하지 않습니다" : isListening ? "음성 인식 중지" : "음성으로 입력"}
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
      
      <div className="text-center mt-3">
        <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
          <Sparkles size={10} />
          고급 AI 모델로 구동됩니다. 응답이 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
};
