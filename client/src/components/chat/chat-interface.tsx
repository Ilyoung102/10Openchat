import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, StopCircle, Sparkles, Paperclip, Image as ImageIcon } from 'lucide-react';
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
  
  const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition({
    onResult: (text) => setInput(text),
    lang: 'ko-KR' // Default to Korean as per legacy app
  });

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
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
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 pb-6">
      {/* Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full backdrop-blur-md border border-red-500/30"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Listening...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group">
        {/* Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl opacity-20 group-hover:opacity-50 transition duration-500 blur" />
        
        <div className="relative flex items-end gap-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl">
          
          {/* Attachments (Visual only for now) */}
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <Paperclip size={20} />
          </button>
          
          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-500 resize-none py-2 max-h-[200px] min-h-[44px] scrollbar-hide"
            rows={1}
          />

          {/* Voice Input */}
          {hasSupport && (
            <button 
              onClick={toggleListening}
              className={cn(
                "p-2 rounded-lg transition-all duration-300",
                isListening 
                  ? "text-red-400 bg-red-500/20 animate-pulse" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              )}
            >
              {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
          )}

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
          Powered by advanced AI models. Responses may vary.
        </p>
      </div>
    </div>
  );
};
