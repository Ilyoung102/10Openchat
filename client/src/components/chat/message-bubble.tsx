import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check, Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp: number;
  isError?: boolean;
  onPlayAudio?: (text: string) => void;
}

export const MessageBubble = ({ role, text, timestamp, isError, onPlayAudio }: MessageBubbleProps) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlay = () => {
    if (onPlayAudio) {
      setIsPlaying(true);
      onPlayAudio(text);
      setTimeout(() => setIsPlaying(false), 3000); // Reset icon after delay (placeholder for real state)
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] md:max-w-[75%] gap-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg",
          isUser 
            ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white" 
            : "bg-gradient-to-br from-cyan-400 to-blue-500 text-black"
        )}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Content */}
        <div className={cn(
          "relative group rounded-2xl p-5 shadow-xl backdrop-blur-md border",
          isUser 
            ? "bg-primary/10 border-primary/20 text-white rounded-tr-none" 
            : isError 
              ? "bg-red-500/10 border-red-500/30 text-red-200 rounded-tl-none"
              : "bg-secondary/40 border-white/10 text-gray-100 rounded-tl-none"
        )}>
          {/* Header (Time, Copy, Audio) */}
          <div className="flex justify-between items-center mb-2 opacity-50 text-xs">
            <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               {!isUser && onPlayAudio && (
                <button 
                  onClick={handlePlay} 
                  className="hover:text-white text-gray-400 transition-colors"
                  title="Read Aloud"
                >
                  {isPlaying ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                </button>
              )}
              {!isUser && (
                <button 
                  onClick={handleCopy} 
                  className="hover:text-white text-gray-400 transition-colors"
                  title="Copy"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>

          {/* Markdown Content */}
          <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative rounded-md overflow-hidden my-4 border border-white/10 shadow-2xl">
                      <div className="absolute top-0 left-0 right-0 h-8 bg-black/40 backdrop-blur flex items-center px-3 border-b border-white/5">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                        </div>
                        <span className="ml-3 text-xs text-white/40 font-mono">{match[1]}</span>
                      </div>
                      <SyntaxHighlighter
                        style={atomDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, padding: '2.5rem 1rem 1rem 1rem', background: 'rgba(0,0,0,0.3)' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={cn("bg-white/10 px-1.5 py-0.5 rounded text-primary font-mono text-xs", className)} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
