import React from 'react';
import { X, BookOpen, GraduationCap } from 'lucide-react';

interface EnglishLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (level: 'beginner' | 'intermediate') => void;
}

const EnglishLevelModal: React.FC<EnglishLevelModalProps> = ({ isOpen, onClose, onSelectLevel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#252525]">
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-500" />
            영어 학습 모드 선택
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-gray-400 text-sm mb-4">
            원하는 학습 난이도를 선택하세요. AI 튜터가 설정된 커리큘럼에 따라 대화를 리드합니다.
          </p>

          <button
            onClick={() => onSelectLevel('beginner')}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-700 bg-[#2a2a2a] hover:bg-[#333] hover:border-emerald-500/50 transition-all group text-left"
          >
            <div className="p-3 bg-emerald-500/20 rounded-full group-hover:bg-emerald-500/30 transition-colors">
              <BookOpen size={24} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100 mb-1">초급 (Beginner) - 튜터 지나</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                일상/여행 영어 중심. 8단계 롤플레이 학습.<br/>
                한국어 설명과 함께 친절하게 가르쳐줍니다.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectLevel('intermediate')}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-gray-700 bg-[#2a2a2a] hover:bg-[#333] hover:border-blue-500/50 transition-all group text-left"
          >
            <div className="p-3 bg-blue-500/20 rounded-full group-hover:bg-blue-500/30 transition-colors">
              <GraduationCap size={24} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100 mb-1">중급 (Intermediate) - 튜터 알렉스</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                최신 뉴스 토론 & 비즈니스 영어.<br/>
                100% 영어 진행, 심층 피드백 및 쉐도잉.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnglishLevelModal;