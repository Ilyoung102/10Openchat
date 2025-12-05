
import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquarePlus, Settings, BookOpen, MoreVertical, Trash2, Edit2, ArrowUp, Pin, MessageSquare, ChevronRight, Utensils, Heart, Lightbulb, Download, Upload, CloudSun } from 'lucide-react';
import { ChatSession } from '../types';
import { SERVICE_DATA } from '../Service_Prompts';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  activeCategoryId?: string | null; 
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  onOpenSettings: () => void;
  onOpenEnglish: () => void;
  onSelectServiceCategory: (categoryId: string) => void; 
  onClose?: () => void; 
  onImportSessions: (sessions: ChatSession[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  sessions,
  currentSessionId,
  activeCategoryId,
  onNewChat, 
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onTogglePin,
  onOpenSettings, 
  onOpenEnglish, 
  onSelectServiceCategory,
  onClose,
  onImportSessions
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
    setMenuOpenId(null);
  };

  const handleFinishEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  // --- Import / Export Handlers ---

  const handleExport = () => {
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
            const parsed = JSON.parse(event.target?.result as string);
            onImportSessions(parsed);
        } catch (err) {
            console.error("Failed to parse backup file", err);
            alert("파일을 읽는 중 오류가 발생했습니다.");
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };


  const getServiceIcon = (id: string) => {
    // Icons 20% smaller (18 * 0.8 ~= 14.4 -> 15)
    switch(id) {
      case 'weather_news': return <CloudSun size={15} />;
      case 'english': return <BookOpen size={15} />;
      case 'cooking': return <Utensils size={15} />;
      case 'health': return <Heart size={15} />;
      case 'life': return <Lightbulb size={15} />;
      default: return <BookOpen size={15} />;
    }
  };

  // Sort sessions: Pinned first, then by updatedAt desc
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <aside 
      className={`
        bg-[#1a1a1a] border-r border-gray-800 flex flex-col shadow-2xl z-20
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'w-[210px] min-w-[210px] opacity-100' : 'w-0 min-w-0 opacity-0'}
      `}
    >
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1e1e1e] min-w-[210px]">
        <h2 className="font-bold text-base text-gray-100 pl-2">메뉴</h2>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 min-w-[210px] custom-scrollbar">
        {/* Main Actions */}
        <div className="px-3 pb-4 border-b border-gray-800">
            <button 
            onClick={onNewChat} 
            className="w-full text-left px-4 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 mb-4 group"
            >
              <MessageSquarePlus size={24} className="group-hover:scale-110 transition-transform" />
              <div className="flex items-baseline gap-1.5">
                 <span className="font-bold text-2xl">MAZI</span>
                 <span className="font-medium text-[10px] text-slate-200">Service</span>
              </div>
            </button>
            
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">기능 서비스</p>
              {SERVICE_DATA.map((service) => {
                const isActive = activeCategoryId === service.id;
                return (
                  <button 
                    key={service.id}
                    onClick={() => onSelectServiceCategory(service.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-all border group
                      ${isActive 
                        ? 'bg-gray-800 text-emerald-400 border-gray-700' 
                        : 'bg-[#252525] text-gray-300 border-gray-800 hover:bg-gray-700 hover:text-emerald-400 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`${isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-emerald-400'}`}>
                        {getServiceIcon(service.id)}
                      </span>
                      {/* Text 20% smaller (text-sm is 14px, text-xs is 12px) */}
                      <span className="font-medium text-xs truncate max-w-[120px]">{service.label}</span>
                    </div>
                    <ChevronRight size={12} className={`${isActive ? 'text-emerald-400' : 'text-gray-600 group-hover:text-emerald-400'}`} />
                  </button>
                );
              })}
            </div>
        </div>

        {/* History List */}
        <div className="mt-4">
            <div className="px-5 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>대화 기록</span>
              
              <div className="flex items-center gap-1">
                 {/* Export Button */}
                 <button 
                   onClick={handleExport} 
                   className="p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors" 
                   title="전체 저장 (Backup)"
                 >
                    <Download size={12} />
                 </button>
                 {/* Import Button */}
                 <button 
                   onClick={handleImportClick} 
                   className="p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors" 
                   title="불러오기 (Restore)"
                 >
                    <Upload size={12} />
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   className="hidden" 
                   accept=".json" 
                 />
                 
                 <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded ml-1">{sessions.length}</span>
              </div>
            </div>

            <div className="space-y-0.5 mt-1">
              {sortedSessions.length === 0 ? (
                  <div className="px-6 py-4 text-center text-gray-600 text-xs">
                      저장된 대화가 없습니다.
                  </div>
              ) : (
                  sortedSessions.map(session => (
                    <div key={session.id} className="relative group px-2">
                        {editingId === session.id ? (
                            <div className="px-3 py-2">
                                <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onBlur={handleFinishEdit}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-gray-900 border border-emerald-500 text-white text-xs rounded px-2 py-1 focus:outline-none"
                                />
                            </div>
                        ) : (
                            <div 
                                className={`
                                    flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors
                                    ${currentSessionId === session.id ? 'bg-gray-800 text-emerald-400' : 'text-gray-300 hover:bg-gray-800/50'}
                                `}
                                onClick={() => onSelectSession(session.id)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {session.pinned ? (
                                        <Pin size={12} className="flex-shrink-0 text-amber-500 fill-amber-500/20" />
                                    ) : (
                                        <MessageSquare size={12} className="flex-shrink-0 opacity-70" />
                                    )}
                                    <span className="truncate text-xs w-[130px]">{session.title}</span>
                                </div>

                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenId(menuOpenId === session.id ? null : session.id);
                                    }}
                                    className={`p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity ${menuOpenId === session.id ? 'opacity-100 bg-gray-700 text-white' : ''}`}
                                >
                                    <MoreVertical size={12} />
                                </button>
                            </div>
                        )}

                        {/* Context Menu */}
                        {menuOpenId === session.id && (
                            <div 
                                ref={menuRef}
                                className="absolute right-2 top-8 w-36 bg-[#252525] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button 
                                    onClick={() => {
                                        onTogglePin(session.id);
                                        setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-xs text-gray-300 hover:bg-emerald-600 hover:text-white flex items-center gap-2"
                                >
                                    {session.pinned ? <ArrowUp size={12} className="rotate-180" /> : <ArrowUp size={12} />}
                                    {session.pinned ? '고정 해제' : '맨 위로 이동'}
                                </button>
                                <button 
                                    onClick={() => handleStartEdit(session)}
                                    className="w-full text-left px-3 py-2.5 text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                                >
                                    <Edit2 size={12} />
                                    이름 변경
                                </button>
                                <button 
                                    onClick={() => {
                                        onDeleteSession(session.id);
                                        setMenuOpenId(null);
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-red-400 hover:bg-red-900/50 hover:text-red-300 flex items-center gap-2 border-t border-gray-700"
                                >
                                    <Trash2 size={12} />
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

      <div className="p-4 border-t border-gray-800 bg-[#1e1e1e] min-w-[210px]">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
            <Settings size={16} />
            <span className="text-xs font-medium">설정</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
