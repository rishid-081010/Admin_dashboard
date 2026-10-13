import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export default function SearchableCombobox({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Search...',
  allLabel = 'Any',
  className = '',
  triggerClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter options based on user typing
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options;
    }
    const q = searchTerm.toLowerCase().trim();
    return options.filter(opt => opt && String(opt).toLowerCase().includes(q));
  }, [options, searchTerm]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const isSelectedAny = !value || value === allLabel || value === 'All' || value === 'Any';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-white/70 block mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName 
          ? `${triggerClassName} ${isOpen ? '!border-blue-500 ring-2 ring-blue-500/20' : ''} flex items-center justify-between cursor-pointer transition-all select-none shadow-sm`
          : `w-full bg-[#0b162c] hover:bg-[#0f1d3a] border ${
              isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-white/15'
            } rounded-xl px-3.5 py-2.5 text-sm font-medium text-white flex items-center justify-between cursor-pointer transition-all select-none shadow-sm`
        }
      >
        <span className={`truncate mr-2 ${isSelectedAny ? 'text-white' : 'text-blue-300 font-semibold'}`}>
          {isSelectedAny ? allLabel : value}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isSelectedAny && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(allLabel);
              }}
              className="p-0.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title={`Clear ${label || 'selection'}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#040e21] border border-blue-500/30 rounded-xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col animate-fade-in max-h-72">
          
          {/* Search Box Header */}
          <div className="p-2 border-b border-white/10 bg-[#08152e]/90 flex items-center gap-2 shrink-0">
            <Search className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none py-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredOptions[0]);
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 flex-1">
            {/* Always provide the default "Any" option at the top if no search or if matching */}
            {(!searchTerm || allLabel.toLowerCase().includes(searchTerm.toLowerCase())) && (
              <button
                type="button"
                onClick={() => handleSelect(allLabel)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left ${
                  isSelectedAny 
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{allLabel.includes('All') ? allLabel : `${allLabel} (All)`}</span>
                {isSelectedAny && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                if (opt === allLabel) return null;
                const isSelected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      isSelected 
                        ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/40' 
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate mr-2">{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="py-6 px-3 text-center text-xs text-white/40">
                No matching {label ? label.toLowerCase() : 'options'} found
              </div>
            )}
          </div>

          {/* Footer Count */}
          <div className="px-3 py-1.5 border-t border-white/5 bg-[#020b18]/60 text-[10px] text-white/40 flex items-center justify-between">
            <span>Showing {filteredOptions.length} options</span>
            <span className="text-white/30">Press Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
