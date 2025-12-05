import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Settings, Menu, Plus, Sparkles, Activity } from 'lucide-react';
import { ChatInput } from '@/components/chat/chat-interface';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { ChatMessage, streamGeminiResponse, checkApiKey, saveApiKey } from '@/lib/gemini';
import generatedImage from '@assets/generated_images/futuristic_abstract_ai_core_glowing_sphere.png';

// Initial welcome message
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: "# Welcome to MAZI AI\nI am your advanced AI companion. I can assist you with code, analysis, creative writing, and more.\n\nHow can I help you today?",
  timestamp: Date.now()
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!checkApiKey()) {
      setShowKeyModal(true);
    }
    // Check for import.meta.env
    const envKey = import.meta.env.VITE_API_KEY;
    if (envKey) {
        saveApiKey(envKey);
        setShowKeyModal(false);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!checkApiKey()) {
        setShowKeyModal(true);
        return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Create a placeholder for the AI response
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now()
      }]);

      await streamGeminiResponse(
        [...messages, userMsg], // History
        text, // New message
        (chunk) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId 
              ? { ...msg, text: msg.text + chunk }
              : msg
          ));
        }
      );
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: `Error: ${error.message || "Something went wrong."}`,
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey);
      setShowKeyModal(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
      
      {/* API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <Sparkles className="text-primary" /> Setup API Key
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                To use this advanced AI interface, please provide your Google Gemini API Key.
                It will be stored locally in your browser.
              </p>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API Key"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none mb-4"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={handleSaveKey}
                  className="bg-primary text-black font-bold px-4 py-2 rounded-lg hover:bg-cyan-400 transition-colors"
                >
                  Start Experience
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="h-full bg-black/40 backdrop-blur-md border-r border-white/5 hidden md:flex flex-col overflow-hidden relative z-10"
      >
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Sparkles className="text-black" fill="black" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">MAZI AI</h1>
            <p className="text-[10px] text-primary font-mono">V 5.0.0 // ONLINE</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          <button 
            onClick={() => setMessages([WELCOME_MESSAGE])}
            className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary/20 transition-all group"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">New Chat</span>
          </button>

          <div className="pt-6 pb-2 px-2">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">System Stats</p>
          </div>

          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Model</span>
              <span className="text-white font-mono">Gemini 1.5</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Latency</span>
              <span className="text-green-400 font-mono flex items-center gap-1">
                <Activity size={10} /> 45ms
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Status</span>
              <span className="text-primary font-mono">Operational</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <Settings size={18} />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary" />
            <span className="font-bold">MAZI AI</span>
          </div>
          <button onClick={() => setShowKeyModal(true)}>
            <Settings size={20} className="text-gray-400" />
          </button>
        </header>

        {/* Background Visuals */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 mix-blend-screen">
             <img src={generatedImage} alt="AI Core" className="w-full h-full object-contain animate-pulse-slow" />
           </div>
        </div>

        {/* Toggle Sidebar Button (Desktop) */}
        <div className="absolute top-4 left-4 z-20 hidden md:block">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth" id="chat-container">
          <div className="max-w-4xl mx-auto px-4 py-10 min-h-full flex flex-col justify-end">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id}
                role={msg.role}
                text={msg.text}
                timestamp={msg.timestamp}
                isError={msg.isError}
              />
            ))}
            
            {isLoading && (
              <div className="mb-6 ml-12">
                <TypingIndicator />
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="relative z-20 bg-gradient-to-t from-background via-background to-transparent pt-10">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
