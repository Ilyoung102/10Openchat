import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Menu, Plus, Sparkles, Activity, Key, Cpu, ChevronRight, CloudSun, Utensils, Heart, Lightbulb, BookOpen, ArrowLeft } from 'lucide-react';
import { ChatInput } from '@/components/chat/chat-interface';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { ChatMessage, streamOpenAIResponse, checkApiKey, saveApiKey, getModel, saveModel } from '@/lib/openai';
import { SERVICE_DATA, ServiceItem } from '@/lib/prompts';
import generatedImage from '@assets/generated_images/futuristic_abstract_ai_core_glowing_sphere.png';

// Initial welcome message
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "# MAZI AI: ONLINE\nSystem initialized. Connected to Neural Network.\n\nI am ready to assist you with advanced analysis, coding, and creative tasks. How shall we proceed?",
  timestamp: Date.now()
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Service Menu State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved settings
    setModel(getModel());
    
    if (!checkApiKey()) {
      setShowSettingsModal(true);
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
        setShowSettingsModal(true);
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
        role: 'assistant',
        text: '',
        timestamp: Date.now()
      }]);

      await streamOpenAIResponse(
        messages, // Pass history
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
        role: 'assistant',
        text: `**System Error:** ${error.message || "Connection interrupted."}`,
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceItemClick = (item: ServiceItem) => {
    // Send the prompt as a user message, but maybe visually show the label?
    // For now, just send the prompt directly as if the user typed it, 
    // or maybe show the label as the user message and send the prompt as the actual payload?
    // The legacy app sent the prompt directly.
    handleSend(item.prompt);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }
  };

  const handleSaveSettings = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey);
    }
    if (model.trim()) {
      saveModel(model);
    }
    setShowSettingsModal(false);
  };

  const getCategoryIcon = (id: string) => {
    switch(id) {
      case 'weather_news': return <CloudSun size={16} />;
      case 'cooking': return <Utensils size={16} />;
      case 'health': return <Heart size={16} />;
      case 'life': return <Lightbulb size={16} />;
      case 'english': return <BookOpen size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-primary/20 p-6 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden"
            >
              {/* Decor elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                <Settings className="text-primary" size={20} /> System Configuration
              </h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Configure your MAZI AI connection settings.
              </p>
              
              <div className="space-y-4">
                <div>
                    <label className="text-xs font-mono text-primary mb-1 flex items-center gap-2">
                      <Key size={12} /> API KEY
                    </label>
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={checkApiKey() ? "(Hidden)" : "sk-..."}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none font-mono text-sm transition-all"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Leave blank to keep existing key.
                    </p>
                </div>

                <div>
                    <label className="text-xs font-mono text-primary mb-1 flex items-center gap-2">
                      <Cpu size={12} /> MODEL ID
                    </label>
                    <input 
                        type="text" 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="gpt-4o"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none font-mono text-sm transition-all"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Enter "gpt-4o", "gpt-4-turbo", or "gpt-5" (when released).
                    </p>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                    <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
                    >
                    Cancel
                    </button>
                    <button 
                    onClick={handleSaveSettings}
                    className="bg-primary text-black font-bold px-6 py-2 rounded-lg hover:bg-cyan-400 transition-colors shadow-lg shadow-primary/20"
                    >
                    Save Configuration
                    </button>
                </div>
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
            <h1 className="font-bold text-lg tracking-tight text-white">MAZI AI</h1>
            <p className="text-[10px] text-primary font-mono tracking-wider uppercase">{model} // CONNECTED</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
          <button 
            onClick={() => {
              setMessages([WELCOME_MESSAGE]);
              setActiveCategory(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary/20 transition-all group mb-4"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">New Session</span>
          </button>

          {/* Services Menu */}
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Functions</p>
            
            {activeCategory ? (
               // Submenu View
               <div className="animate-in slide-in-from-right-4 duration-200">
                 <button 
                   onClick={() => setActiveCategory(null)}
                   className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white mb-2 text-sm"
                 >
                   <ArrowLeft size={14} /> Back
                 </button>
                 
                 <div className="space-y-1">
                   {SERVICE_DATA.find(c => c.id === activeCategory)?.items.map((item) => (
                     <button
                       key={item.id}
                       onClick={() => handleServiceItemClick(item)}
                       className="w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-primary transition-colors text-xs truncate"
                     >
                       {item.label}
                     </button>
                   ))}
                 </div>
               </div>
            ) : (
               // Main Categories
               SERVICE_DATA.map((category) => (
                <button 
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 group-hover:text-primary transition-colors">
                      {getCategoryIcon(category.id)}
                    </span>
                    <span className="text-sm">{category.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-white" />
                </button>
              ))
            )}
          </div>

          <div className="pt-6 pb-2 px-2 mt-4 border-t border-white/5">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Network Stats</p>
          </div>

          <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Core</span>
              <span className="text-white font-mono">{model}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Latency</span>
              <span className="text-green-400 font-mono flex items-center gap-1">
                <Activity size={10} /> 12ms
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <Settings size={18} />
            <span className="text-sm">System Settings</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary" size={20} />
            <span className="font-bold text-white">MAZI AI</span>
          </div>
          <button onClick={() => setShowSettingsModal(true)}>
            <Settings size={20} className="text-gray-400" />
          </button>
        </header>

        {/* Background Visuals */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 mix-blend-screen">
             <img src={generatedImage} alt="AI Core" className="w-full h-full object-contain animate-pulse-slow" />
           </div>
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        </div>

        {/* Toggle Sidebar Button (Desktop) */}
        <div className="absolute top-4 left-4 z-20 hidden md:block">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur rounded-lg transition-colors border border-white/5"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth custom-scrollbar" id="chat-container">
          <div className="max-w-4xl mx-auto px-4 py-10 min-h-full flex flex-col justify-end">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id}
                role={msg.role === 'user' ? 'user' : 'model'} // Map assistant to model for Bubble component
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
        <div className="relative z-20 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
