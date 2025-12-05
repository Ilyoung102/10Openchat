
import React from 'react';
import { X, Check, History, AlertTriangle, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  isHistoryEnabled: boolean;
  onHistoryEnabledChange: (enabled: boolean) => void;
  onFactoryReset: () => void;
}

const VOICES = [
  { id: 'Kore', name: 'Kore (여성/기본)', desc: '차분하고 또렷한 목소리' },
  { id: 'Puck', name: 'Puck (남성)', desc: '부드럽고 안정적인 목소리' },
  { id: 'Charon', name: 'Charon (남성)', desc: '깊고 신뢰감 있는 목소리' },
  { id: 'Fenrir', name: 'Fenrir (남성)', desc: '강하고 에너지 넘치는 목소리' },
  { id: 'Zephyr', name: 'Zephyr (여성)', desc: '상쾌하고 밝은 목소리' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedVoice, 
  onVoiceChange,
  isHistoryEnabled,
  onHistoryEnabledChange,
  onFactoryReset
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#252525]">
          <h2 className="text-lg font-bold text-gray-100">설정</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* History Setting */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              대화 설정
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-700 bg-[#2a2a2a]">
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isHistoryEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                    <History size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-200">대화 기록 저장</span>
                    <span className="text-xs text-gray-500">대화 내용을 기기에 자동 저장합니다.</span>
                  </div>
               </div>
               <button 
                 onClick={() => onHistoryEnabledChange(!isHistoryEnabled)}
                 className={`w-12 h-6 rounded-full transition-colors relative ${isHistoryEnabled ? 'bg-emerald-600' : 'bg-gray-600'}`}
               >
                 <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isHistoryEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
            </div>
          </div>

          {/* Voice Setting */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              음성 선택 (TTS Voice)
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => onVoiceChange(voice.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedVoice === voice.id 
                      ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                      : 'bg-[#2a2a2a] border-gray-700 hover:border-gray-600 hover:bg-[#333]'
                  }`}
                >
                  <div className="flex flex-col items-start text-left gap-0.5">
                    <span className={`font-medium ${selectedVoice === voice.id ? 'text-emerald-400' : 'text-gray-200'}`}>
                      {voice.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {voice.desc}
                    </span>
                  </div>
                  {selectedVoice === voice.id && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Danger Zone (App Reset) */}
          <div>
             <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
               <AlertTriangle size={14} />
               초기화 (Danger Zone)
             </h3>
             <div className="p-4 rounded-xl border border-red-900/30 bg-red-900/10">
                <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                  앱이 동작하지 않거나 설정을 초기 상태로 되돌리고 싶을 때 사용하세요.<br/>
                  <span className="text-red-400 font-bold">주의: 모든 대화 기록과 설정이 삭제됩니다.</span>
                </p>
                <button 
                  onClick={() => {
                      if(window.confirm("정말로 앱을 초기화하시겠습니까? 모든 데이터가 삭제됩니다.")) {
                          onFactoryReset();
                      }
                  }}
                  className="w-full py-2.5 bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  앱 초기화 (Factory Reset)
                </button>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#1a1a1a] border-t border-gray-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
