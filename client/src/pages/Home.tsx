import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Menu, Plus, Sparkles, Activity, Key, Cpu, ChevronRight, CloudSun, Utensils, Heart, Lightbulb, BookOpen, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { ChatInput } from '@/components/chat/chat-interface';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { ChatMessage, streamOpenAIResponse, checkApiKey, saveApiKey, getModel, saveModel, generateSpeech } from '@/lib/openai';
import { SERVICE_DATA, ServiceItem } from '@/lib/prompts';
import { audioPlayer } from '@/lib/audio-player';
import { cn } from '@/lib/utils';
import generatedImage from '@assets/generated_images/futuristic_abstract_ai_core_glowing_sphere.png';

// App Version - 코드 수정 시 반드시 +0.01 업데이트
const APP_VERSION = "v1.15";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Service Menu State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Audio State
  const [isTTSActive, setIsTTSActive] = useState(true);
  const isTTSActiveRef = useRef(isTTSActive);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isTTSActiveRef.current = isTTSActive;
  }, [isTTSActive]);

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

  const handleSend = async (text: string, displayText?: string) => {
    if (!checkApiKey()) {
        setShowSettingsModal(true);
        return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: displayText || text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Stop any current audio
    audioPlayer.stop();

    try {
      // Create a placeholder for the AI response
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'assistant',
        text: '',
        timestamp: Date.now()
      }]);

      let fullResponse = "";

      await streamOpenAIResponse(
        messages, // Pass history
        text, // Actual prompt to send (not displayText)
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId 
              ? { ...msg, text: msg.text + chunk, isSearching: false }
              : msg
          ));
        },
        (query) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId 
              ? { ...msg, text: `🔍 웹 검색 중: "${query}"...`, isSearching: true }
              : msg
          ));
        }
      );

      // Auto-play audio if enabled (use ref to get latest state)
      if (isTTSActiveRef.current && fullResponse) {
        try {
          const audioBuffer = await generateSpeech(fullResponse);
          audioPlayer.play(audioBuffer);
        } catch (e) {
          console.error("Auto-TTS failed", e);
        }
      }

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

  const handlePlayAudio = async (text: string) => {
    if (!text) return;
    try {
      audioPlayer.stop();
      const audioBuffer = await generateSpeech(text);
      audioPlayer.play(audioBuffer);
    } catch (e) {
      console.error("Manual TTS failed", e);
    }
  };

  const handleServiceItemClick = (item: ServiceItem) => {
    handleSend(item.prompt, item.label);
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
                Configure your Pure fragrance connection settings.
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
                      <Cpu size={12} /> CORE MODEL
                    </label>
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-[10px] text-gray-400">현재:</span>
                      <span className="text-sm text-primary font-mono font-semibold">{model}</span>
                    </div>
                    <input 
                        type="text" 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="gpt-4o"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none font-mono text-sm transition-all"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      gpt-4o, gpt-4-turbo, gpt-5 등 모델 ID 입력
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

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 280 : 0, 
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : -280
        }}
        className={cn(
          "h-full bg-black/95 md:bg-black/40 backdrop-blur-md border-r border-white/5 flex flex-col overflow-hidden z-40",
          "fixed md:relative left-0 top-0"
        )}
      >
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Sparkles className="text-black" fill="black" />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-tight text-white">Pure fragrance <span className="text-primary text-base font-mono">{APP_VERSION}</span></h1>
            <p className="text-[10px] text-green-400 font-mono tracking-wider uppercase">● CONNECTED</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
          <button 
            onClick={() => {
              setMessages([]);
              setActiveCategory(null);
              audioPlayer.stop();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/20 text-primary rounded-xl border border-primary/40 hover:bg-primary/30 transition-all group mb-4 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
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
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex gap-2">
            <button 
                onClick={() => setIsTTSActive(!isTTSActive)}
                className={cn(
                    "flex items-center justify-center p-3 rounded-xl transition-colors flex-1 border",
                    isTTSActive 
                        ? "bg-primary/20 text-primary border-primary/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                        : "text-gray-400 border-white/20 bg-white/5 hover:bg-white/10"
                )}
            >
                {isTTSActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center justify-center p-3 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex-1 border border-white/20"
            >
                <Settings size={18} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-md z-20">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-3 active:opacity-70 transition-opacity"
          >
            <Menu className="text-primary" size={20} />
            <span className="font-bold text-xl text-white">Pure fragrance <span className="text-primary text-sm font-mono">{APP_VERSION}</span></span>
          </button>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsTTSActive(!isTTSActive)}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    isTTSActive ? "text-primary" : "text-gray-400"
                )}
             >
                 {isTTSActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
             </button>
             <button onClick={() => setShowSettingsModal(true)}>
               <Settings size={20} className="text-gray-400" />
             </button>
          </div>
        </header>

        {/* Background Visuals */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 mix-blend-screen">
             <img src={generatedImage} alt="AI Core" className="w-full h-full object-contain animate-pulse-slow" />
           </div>
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        </div>

        {/* Toggle Sidebar Button (Desktop) */}
        <div className="absolute top-4 right-4 z-20 hidden md:block">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur rounded-lg transition-colors border border-white/5"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth custom-scrollbar" id="chat-container">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  GOOD TIME
                </h2>
                <p className="text-lg md:text-xl text-gray-400 mt-4">
                  <span className="text-[1.5em] text-white font-bold tracking-wider" style={{fontFamily: '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'}}>순향</span>과 함께 좋은 시간 보내요.
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-10 min-h-full flex flex-col justify-end">
              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id}
                  role={msg.role === 'user' ? 'user' : 'model'}
                  text={msg.text}
                  timestamp={msg.timestamp}
                  isError={msg.isError}
                  onPlayAudio={handlePlayAudio}
                />
              ))}
              
              {isLoading && (
                <div className="mb-6 ml-12">
                  <TypingIndicator />
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="relative z-20 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4">
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
