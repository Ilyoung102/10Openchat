import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check, Volume2, VolumeX, FileText, Printer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp: number;
  isError?: boolean;
  onPlayAudio?: (text: string) => void;
  onStopAudio?: () => void;
  isCurrentlyPlaying?: boolean;
  isLoadingAudio?: boolean;
  isAnyAudioBusy?: boolean;
}

export const MessageBubble = ({ 
  role, 
  text, 
  timestamp, 
  isError, 
  onPlayAudio,
  onStopAudio,
  isCurrentlyPlaying = false,
  isLoadingAudio = false,
  isAnyAudioBusy = false
}: MessageBubbleProps) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTxt = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message_${new Date(timestamp).toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MAZI Service - 메시지</title>
          <style>
            body { 
              font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; 
              padding: 40px; 
              line-height: 1.8;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { 
              font-size: 18px; 
              color: #333; 
              border-bottom: 2px solid #06b6d4; 
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .content { 
              font-size: 14px; 
              white-space: pre-wrap; 
              color: #444;
            }
            .timestamp { 
              font-size: 12px; 
              color: #888; 
              margin-top: 20px;
              text-align: right;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>🤖 MAZI Service</h1>
          <div class="content">${text.replace(/\n/g, '<br>')}</div>
          <div class="timestamp">${new Date(timestamp).toLocaleString()}</div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePlayStop = () => {
    if (isCurrentlyPlaying) {
      onStopAudio?.();
    } else {
      onPlayAudio?.(text);
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
          {/* Header (Time only) */}
          <div className="flex justify-between items-center mb-2 opacity-50 text-xs">
            <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

          {/* Action Icons Bar - Only for AI messages */}
          {!isUser && text && !isError && (
            <div className="flex items-center gap-1 mt-4 pt-3 border-t border-white/10">
              {/* Copy */}
              <button 
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all",
                  copied 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                )}
                title="복사"
                data-testid="button-copy-message"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copied ? '복사됨' : '복사'}</span>
              </button>

              {/* Save TXT */}
              <button 
                onClick={handleSaveTxt}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                title="TXT 저장"
                data-testid="button-save-txt"
              >
                <FileText size={14} />
                <span className="hidden sm:inline">TXT</span>
              </button>

              {/* Print PDF */}
              <button 
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                title="인쇄/PDF"
                data-testid="button-print-pdf"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">인쇄</span>
              </button>

              {/* Play/Stop Audio */}
              {onPlayAudio && (
                <button 
                  onClick={handlePlayStop}
                  disabled={isLoadingAudio || (isAnyAudioBusy && !isCurrentlyPlaying)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ml-auto",
                    isLoadingAudio
                      ? "bg-yellow-500/20 text-yellow-400 cursor-wait"
                      : isCurrentlyPlaying 
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                        : isAnyAudioBusy
                          ? "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                          : "bg-primary/20 text-primary hover:bg-primary/30"
                  )}
                  title={isLoadingAudio ? "준비 중..." : isCurrentlyPlaying ? "정지" : isAnyAudioBusy ? "다른 음성 재생 중" : "음성 재생"}
                  data-testid="button-play-audio"
                >
                  {isLoadingAudio ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCurrentlyPlaying ? (
                    <VolumeX size={14} />
                  ) : (
                    <Volume2 size={14} />
                  )}
                  <span className="hidden sm:inline">
                    {isLoadingAudio ? '준비 중' : isCurrentlyPlaying ? '정지' : '재생'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
