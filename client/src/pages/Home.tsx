import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Menu, Plus, Sparkles, Activity, Key, Cpu, ChevronRight, CloudSun, Utensils, Heart, Lightbulb, BookOpen, ArrowLeft, Volume2, VolumeX, MoreVertical, Trash2, Edit2, ArrowUp, Pin, MessageSquare, Download, Upload, Save, X, ExternalLink, Radio, MessageCircle } from 'lucide-react';
import { ChatInput } from '@/components/chat/chat-interface';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { ChatMessage, streamOpenAIResponse, checkApiKey, saveApiKey, getModel, saveModel, generateSpeech } from '@/lib/openai';
import { SERVICE_DATA, ServiceItem } from '@/lib/prompts';
import { audioPlayer } from '@/lib/audio-player';
import { cn } from '@/lib/utils';
import generatedImage from '@assets/generated_images/futuristic_abstract_ai_core_glowing_sphere.png';
import { ChatSession } from '@/types';

// App Version - 코드 수정 시 반드시 +0.01 업데이트
const APP_VERSION = "v1.54";

const SESSIONS_STORAGE_KEY = 'mazi-chat-sessions';
const CURRENT_SESSION_KEY = 'mazi-current-session';

const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateSessionTitle = (messages: ChatMessage[]): string => {
  if (messages.length === 0) return '새 대화';
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const text = firstUserMsg.text.slice(0, 30);
    return text.length < firstUserMsg.text.length ? text + '...' : text;
  }
  return '새 대화';
};

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
  const [isTTSActive, setIsTTSActive] = useState(false);
  const isTTSActiveRef = useRef(isTTSActive);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingAudioMessageId, setLoadingAudioMessageId] = useState<string | null>(null);

  // Wake Word State
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);

  // Conversation Mode State
  const [conversationMode, setConversationMode] = useState(false);
  const conversationModeRef = useRef(conversationMode);
  
  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);

  // Conversation mode toggle handler - enables TTS and wake word when turning on
  const handleConversationModeToggle = () => {
    const newValue = !conversationMode;
    setConversationMode(newValue);
    if (newValue) {
      if (!isTTSActive) {
        setIsTTSActive(true);
        isTTSActiveRef.current = true;
      }
      if (!wakeWordEnabled) {
        setWakeWordEnabled(true);
      }
    }
  };

  // Wake word triggered - enable TTS for voice response
  const handleWakeWordTriggered = () => {
    setIsTTSActive(true);
    isTTSActiveRef.current = true;
  };

  // TTS toggle handler - immediately stop audio when toggled off
  const handleTTSToggle = () => {
    if (isTTSActive) {
      audioPlayer.stop();
    }
    setIsTTSActive(!isTTSActive);
  };

  // Stop TTS when stop word is detected
  const handleStopWordDetected = () => {
    audioPlayer.stop();
  };

  // Connect audio player to TTS playing state
  useEffect(() => {
    audioPlayer.setOnPlayStateChange((playing) => {
      setIsTTSPlaying(playing);
      if (!playing) {
        setPlayingMessageId(null);
      }
    });
    return () => {
      audioPlayer.setOnPlayStateChange(null);
    };
  }, []);

  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load sessions from localStorage on mount (but always start with new chat)
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
      
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions) as ChatSession[];
        setSessions(parsed);
      }
      // Always start with empty new chat state
      setCurrentSessionId(null);
      setMessages([]);
    } catch (e) {
      console.error('Failed to load sessions', e);
    }
  }, []);

  // Save sessions to localStorage when changed (including empty array for deletions)
  useEffect(() => {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Save current session ID
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
    }
  }, [currentSessionId]);

  // Sync messages to current session (including when cleared)
  useEffect(() => {
    if (currentSessionId) {
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              messages, 
              title: messages.length > 0 ? generateSessionTitle(messages) : '새 대화',
              updatedAt: Date.now() 
            }
          : session
      ));
    }
  }, [messages, currentSessionId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus edit input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  // Session handlers
  const handleNewSession = () => {
    // Save current messages to a new session if there are any
    if (messages.length > 0 && !currentSessionId) {
      const newSession: ChatSession = {
        id: generateSessionId(),
        title: generateSessionTitle(messages),
        messages: messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false
      };
      setSessions(prev => [newSession, ...prev]);
    }
    
    // Clear messages and start fresh
    setMessages([]);
    setCurrentSessionId(null);
    setActiveCategory(null);
    audioPlayer.stop();
  };

  const handleSaveCurrentChat = () => {
    if (messages.length === 0) return;
    
    if (currentSessionId) {
      // Already in a session, just update it
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages, title: generateSessionTitle(messages), updatedAt: Date.now() }
          : session
      ));
    } else {
      // Create a new session
      const newSession: ChatSession = {
        id: generateSessionId(),
        title: generateSessionTitle(messages),
        messages: messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    }
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setMessages(session.messages);
      setCurrentSessionId(id);
    }
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setMessages([]);
      setCurrentSessionId(null);
    }
    setMenuOpenId(null);
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s
    ));
    setEditingId(null);
  };

  const handleTogglePin = (id: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, pinned: !s.pinned, updatedAt: Date.now() } : s
    ));
    setMenuOpenId(null);
  };

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
    setMenuOpenId(null);
  };

  const handleFinishEdit = () => {
    if (editingId && editTitle.trim()) {
      handleRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleExportSessions = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const date = new Date().toISOString().slice(0, 10);
    downloadAnchorNode.setAttribute("download", `mazi-chat-backup-${date}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as ChatSession[];
        setSessions(prev => [...parsed, ...prev]);
      } catch (err) {
        console.error("Failed to parse backup file", err);
        alert("파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Sort sessions: Pinned first, then by updatedAt desc
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

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

    // Build updated history including the new user message
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
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
        updatedHistory, // Pass history including current user message
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
        },
        conversationModeRef.current
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

  const handlePlayAudio = async (text: string, messageId?: string) => {
    if (!text) return;
    try {
      audioPlayer.stop();
      setLoadingAudioMessageId(messageId || null);
      
      // Detect if this is English learning content (has bold English sentences with Korean translations)
      const isEnglishLearning = /\*\*[A-Za-z].*\*\*/.test(text) && 
        (text.includes('📝') || /[가-힣]{2,}/.test(text));
      
      const audioBuffer = await generateSpeech(text, { 
        repeatEnglish: isEnglishLearning,
        speed: 1.0
      });
      setLoadingAudioMessageId(null);
      setPlayingMessageId(messageId || null);
      audioPlayer.play(audioBuffer);
    } catch (e) {
      console.error("Manual TTS failed", e);
      setLoadingAudioMessageId(null);
      setPlayingMessageId(null);
    }
  };

  const handleStopAudio = () => {
    audioPlayer.stop();
    setPlayingMessageId(null);
  };

  const handleServiceItemClick = (item: ServiceItem) => {
    if (item.link) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    } else {
      handleSend(item.prompt, item.label);
    }
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
      case 'travel_guide': return <Activity size={16} />;
      case 'multi_enter': return <Sparkles size={16} />;
      case 'ott_links': return <ExternalLink size={16} />;
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
                Configure your MAZI Service connection settings.
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
                        data-testid="input-api-key"
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
                        data-testid="input-model"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      gpt-4o, gpt-4-turbo, gpt-5 등 모델 ID 입력
                    </p>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                    <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
                    data-testid="button-settings-cancel"
                    >
                    Cancel
                    </button>
                    <button 
                    onClick={handleSaveSettings}
                    className="bg-primary text-black font-bold px-6 py-2 rounded-lg hover:bg-cyan-400 transition-colors shadow-lg shadow-primary/20"
                    data-testid="button-settings-save"
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
            <h1 className="font-bold text-2xl tracking-tight text-white">MAZI Service <span className="text-primary text-base font-mono">{APP_VERSION}</span></h1>
            <p className="text-[10px] text-green-400 font-mono tracking-wider uppercase">● CONNECTED</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
          {/* New Session Button */}
          <div className="mb-4">
            <button 
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-green-500/40 hover:opacity-90 transition-all group shadow-[0_0_10px_rgba(34,197,94,0.2)]"
              style={{ backgroundColor: '#166534', color: '#ffffff' }}
              data-testid="button-new-session"
            >
              <Plus size={18} />
              <span className="font-medium text-sm" style={{ color: '#ffffff' }}>New</span>
            </button>
          </div>

          {/* Services Menu - Categories Only */}
          <div className="space-y-0.5 border-b border-white/5 pb-3">
            <p className="px-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Functions</p>
            {SERVICE_DATA.map((category, index) => (
              <React.Fragment key={category.id}>
                {/* Separator after travel_guide (before multi_enter) */}
                {category.id === 'multi_enter' && (
                  <div className="my-1.5 mx-2 border-t border-white/10" />
                )}
                {/* Separator after ott_links (before english) */}
                {category.id === 'english' && (
                  <div className="my-1.5 mx-2 border-t border-white/10" />
                )}
                <button 
                  onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all group hover:bg-white/5"
                  style={{ 
                    backgroundColor: activeCategory === category.id ? '#1e3a5f' : 'transparent',
                    color: activeCategory === category.id ? '#4ade80' : '#d1d5db' 
                  }}
                  data-testid={`button-category-${category.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="transition-colors"
                      style={{ color: activeCategory === category.id ? '#4ade80' : '#9ca3af' }}
                    >
                      {getCategoryIcon(category.id)}
                    </span>
                    <span className="text-xs" style={{ color: activeCategory === category.id ? '#4ade80' : '#d1d5db' }}>{category.label}</span>
                  </div>
                  <ChevronRight size={12} className={cn(
                    "transition-transform",
                    activeCategory === category.id ? "rotate-90" : ""
                  )} style={{ color: activeCategory === category.id ? '#4ade80' : '#6b7280' }} />
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Chat History */}
          <div className="flex-1 min-h-0 flex flex-col pt-1">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">기록</span>
              <div className="flex items-center gap-0.5">
                <button 
                  onClick={handleSaveCurrentChat}
                  disabled={messages.length === 0}
                  className={cn(
                    "p-1 rounded transition-colors",
                    messages.length === 0 ? "text-gray-600 cursor-not-allowed" : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  )}
                  title="현재 대화 저장"
                  data-testid="button-save-chat"
                >
                  <Save size={11} />
                </button>
                <button 
                  onClick={handleExportSessions}
                  disabled={sessions.length === 0}
                  className={cn(
                    "p-1 rounded transition-colors",
                    sessions.length === 0 ? "text-gray-600 cursor-not-allowed" : "text-gray-500 hover:text-white hover:bg-white/10"
                  )}
                  title="전체 저장 (Backup)"
                  data-testid="button-export-sessions"
                >
                  <Download size={11} />
                </button>
                <button 
                  onClick={handleImportClick}
                  className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="불러오기 (Restore)"
                  data-testid="button-import-sessions"
                >
                  <Upload size={11} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".json" 
                />
                <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded ml-0.5 text-gray-400">{sessions.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0">
              {sortedSessions.length === 0 ? (
                <div className="px-2 py-3 text-center text-gray-600 text-[10px]">
                  저장된 대화 없음
                </div>
              ) : (
                sortedSessions.map(session => (
                  <div key={session.id} className="relative group" data-testid={`session-item-${session.id}`}>
                    {editingId === session.id ? (
                      <div className="px-1 py-0.5">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={handleFinishEdit}
                          onKeyDown={handleEditKeyDown}
                          className="w-full bg-black/50 border border-primary/50 text-white text-[11px] rounded px-2 py-1 focus:outline-none focus:border-primary"
                          data-testid={`input-session-rename-${session.id}`}
                        />
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors hover:bg-white/5"
                        style={{ 
                          backgroundColor: currentSessionId === session.id ? '#1e3a5f' : 'transparent',
                          color: currentSessionId === session.id ? '#4ade80' : '#d1d5db'
                        }}
                        onClick={() => handleSelectSession(session.id)}
                        data-testid={`button-select-session-${session.id}`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {session.pinned ? (
                            <Pin size={10} className="flex-shrink-0 text-amber-500 fill-amber-500/20" />
                          ) : (
                            <MessageSquare size={10} className="flex-shrink-0 opacity-60" />
                          )}
                          <span className="truncate text-[11px]">{session.title}</span>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === session.id ? null : session.id);
                          }}
                          className={cn(
                            "p-0.5 rounded text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity",
                            menuOpenId === session.id && "opacity-100 bg-white/10 text-white"
                          )}
                          data-testid={`button-session-menu-${session.id}`}
                        >
                          <MoreVertical size={10} />
                        </button>
                      </div>
                    )}

                    {/* Context Menu */}
                    {menuOpenId === session.id && (
                      <div 
                        ref={menuRef}
                        className="absolute right-1 top-7 w-28 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          onClick={() => handleTogglePin(session.id)}
                          className="w-full text-left px-2 py-1.5 text-[10px] text-gray-300 hover:bg-[#1e3a5f] hover:text-green-400 flex items-center gap-1.5"
                          data-testid={`button-session-pin-${session.id}`}
                        >
                          {session.pinned ? <ArrowUp size={10} className="rotate-180" /> : <ArrowUp size={10} />}
                          {session.pinned ? '고정 해제' : '맨 위로'}
                        </button>
                        <button 
                          onClick={() => handleStartEdit(session)}
                          className="w-full text-left px-2 py-1.5 text-[10px] text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 flex items-center gap-1.5"
                          data-testid={`button-session-rename-${session.id}`}
                        >
                          <Edit2 size={10} />
                          이름 변경
                        </button>
                        <button 
                          onClick={() => handleDeleteSession(session.id)}
                          className="w-full text-left px-2 py-1.5 text-[10px] text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-1.5 border-t border-white/5"
                          data-testid={`button-session-delete-${session.id}`}
                        >
                          <Trash2 size={10} />
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex gap-2 mb-2">
            <button 
                onClick={handleConversationModeToggle}
                className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-xl transition-colors flex-1 border relative",
                    conversationMode 
                        ? "bg-purple-500/20 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                )}
                style={{ color: conversationMode ? '#c084fc' : '#9ca3af' }}
                title={conversationMode ? "대화 모드 끄기" : "대화 모드 켜기"}
                data-testid="button-conversation-mode-toggle"
            >
                <MessageCircle size={18} />
                <span className="text-xs" style={{ color: conversationMode ? '#c084fc' : '#9ca3af' }}>대화</span>
            </button>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                className={cn(
                    "flex items-center justify-center p-3 rounded-xl transition-colors flex-1 border relative",
                    wakeWordEnabled 
                        ? "bg-green-500/20 border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                )}
                style={{ color: wakeWordEnabled ? '#4ade80' : '#9ca3af' }}
                title={wakeWordEnabled ? "웨이크 워드 끄기" : "웨이크 워드 켜기 ('마지야')"}
                data-testid="button-wake-word-toggle"
            >
                <Radio size={18} />
            </button>
            <button 
                onClick={handleTTSToggle}
                className={cn(
                    "flex items-center justify-center p-3 rounded-xl transition-colors flex-1 border",
                    isTTSActive 
                        ? "border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                )}
                style={{ 
                  backgroundColor: isTTSActive ? '#1e3a5f' : undefined,
                  color: isTTSActive ? '#60a5fa' : '#9ca3af' 
                }}
                data-testid="button-tts-toggle"
            >
                {isTTSActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center justify-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex-1 border border-white/20"
                style={{ color: '#9ca3af' }}
                data-testid="button-settings"
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
            data-testid="button-mobile-menu"
          >
            <Menu className="text-primary" size={20} />
            <span className="font-bold text-xl text-white">MAZI Service <span className="text-primary text-sm font-mono">{APP_VERSION}</span></span>
          </button>
          <div className="flex items-center gap-2">
             <button 
                onClick={handleConversationModeToggle}
                className={cn(
                    "p-2 rounded-lg transition-colors relative",
                    conversationMode ? "text-purple-400 bg-purple-500/20" : "text-gray-400"
                )}
                title={conversationMode ? "대화 모드 끄기" : "대화 모드 켜기"}
                data-testid="button-mobile-conversation-mode"
             >
                 <MessageCircle size={20} />
                 {conversationMode && (
                   <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                 )}
             </button>
             <button 
                onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    wakeWordEnabled ? "text-green-400" : "text-gray-400"
                )}
                title={wakeWordEnabled ? "웨이크 워드 끄기" : "웨이크 워드 켜기 ('마지야')"}
                data-testid="button-mobile-wake-word-toggle"
             >
                 <Radio size={20} />
             </button>
             <button 
                onClick={handleTTSToggle}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    isTTSActive ? "text-primary" : "text-gray-400"
                )}
                data-testid="button-mobile-tts-toggle"
             >
                 {isTTSActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
             </button>
             <button onClick={() => setShowSettingsModal(true)} data-testid="button-mobile-settings">
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

        {/* Toggle Sidebar Button & Conversation Mode (Desktop) */}
        <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-2">
          <button 
            onClick={handleConversationModeToggle}
            className={cn(
                "p-2 rounded-lg transition-colors border relative",
                conversationMode 
                    ? "text-purple-400 bg-purple-500/20 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]" 
                    : "text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur border-white/5"
            )}
            title={conversationMode ? "대화 모드 끄기" : "대화 모드 켜기"}
            data-testid="button-desktop-conversation-mode"
          >
            <MessageCircle size={20} />
            {conversationMode && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur rounded-lg transition-colors border border-white/5"
            data-testid="button-desktop-menu"
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
                <h2 
                  className="text-4xl md:text-5xl font-bold mb-6 tracking-tight"
                  style={{
                    background: 'linear-gradient(to right, #22d3ee, #a855f7, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#a855f7',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif'
                  }}
                >
                  GOOD TIME
                </h2>
                <p className="text-lg md:text-xl text-gray-400 mt-4" style={{fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif'}}>
                  <span className="text-[1.95em] text-white font-bold tracking-wider" style={{fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", sans-serif'}}>마지</span>와 함께 하세요.
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
                  onPlayAudio={(text) => handlePlayAudio(text, msg.id)}
                  onStopAudio={handleStopAudio}
                  isCurrentlyPlaying={playingMessageId === msg.id && isTTSPlaying}
                  isLoadingAudio={loadingAudioMessageId === msg.id}
                  isAnyAudioBusy={isTTSPlaying || loadingAudioMessageId !== null}
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

        {/* Input Area with Service Submenu */}
        <div className="relative z-20">
          {/* Service Submenu Grid - Above Input */}
          <AnimatePresence>
            {activeCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="border-t border-white/10 bg-transparent backdrop-blur-sm relative"
              >
                <button 
                  onClick={() => setActiveCategory(null)}
                  className="absolute top-1 right-2 p-1 text-gray-500 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
                  data-testid="button-close-submenu"
                >
                  <X size={14} />
                </button>
                
                <div className="grid grid-cols-6 gap-1 p-1.5 pt-3 pb-1 max-w-4xl mx-auto">
                  {SERVICE_DATA.find(c => c.id === activeCategory)?.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleServiceItemClick(item);
                      }}
                      disabled={isLoading}
                      className="flex flex-col items-center justify-center py-1 px-0.5 rounded text-[9px] font-medium transition-all
                        disabled:opacity-50 disabled:cursor-not-allowed
                        bg-[#1a1a1a] text-gray-300 hover:bg-[#1e3a5f] hover:text-green-400 border border-white/5 hover:border-green-500/30"
                      data-testid={`button-service-${item.id}`}
                    >
                      <span className="text-sm mb-0">{item.icon}</span>
                      <span className="truncate w-full text-center leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Input */}
          <div className="bg-gradient-to-t from-background via-background to-transparent pt-2 pb-2">
            <ChatInput 
              onSend={handleSend} 
              isLoading={isLoading}
              isTTSPlaying={isTTSPlaying}
              onStopWordDetected={handleStopWordDetected}
              wakeWordEnabled={wakeWordEnabled}
              onWakeWordEnabledChange={setWakeWordEnabled}
              onWakeWordTriggered={handleWakeWordTriggered}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
