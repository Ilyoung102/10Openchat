
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SERVICE_DATA, ServiceItem } from '../Service_Prompts';

interface ServiceSubMenuProps {
  activeCategoryId: string | null;
  isLoading: boolean;
  onSelect: (item: ServiceItem) => void;
  onClose: () => void;
}

const ServiceSubMenu: React.FC<ServiceSubMenuProps> = ({ 
  activeCategoryId, 
  isLoading, 
  onSelect, 
  onClose 
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Reset selection when category changes
  useEffect(() => {
    setSelectedItemId(null);
  }, [activeCategoryId]);

  const category = SERVICE_DATA.find(c => c.id === activeCategoryId);

  if (!category) return null;

  const handleItemClick = (item: ServiceItem) => {
    setSelectedItemId(item.id);
    onSelect(item);
  };

  return (
    <div className="border-t border-gray-800 bg-[#1e1e1e]/95 backdrop-blur-sm animate-in slide-in-from-bottom-5 fade-in duration-300 relative">
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-1 right-1 p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700 transition-colors z-10"
      >
        <X size={12} />
      </button>

      {/* Grid Layout: 6 columns. Text size increased to 14px for better readability */}
      <div className="grid grid-cols-6 gap-2 p-2 pt-5 max-w-4xl mx-auto">
        {category.items.map((item) => {
          const isSelected = selectedItemId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={isLoading}
              className={`
                flex items-center justify-center py-1 px-0.5 rounded-md text-[14px] font-medium transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-[#252525] text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <span className="truncate w-full text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceSubMenu;
