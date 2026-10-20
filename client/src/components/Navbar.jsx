import React from 'react';
import { Building2, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand: A SQUARED REAL ESTATE */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center gap-3.5 cursor-pointer group select-none"
        >
          {/* Stylized AS Monogram Emblem */}
          <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.12] flex items-center justify-center shadow-lg shadow-black/40 group-hover:border-blue-400/60 transition-all duration-300 backdrop-blur-md">
            <svg viewBox="0 0 100 100" className="w-8 h-8 text-blue-400 group-hover:scale-105 transition-transform" fill="currentColor">
              <text 
                x="50%" 
                y="66%" 
                textAnchor="middle" 
                fontFamily="Inter, -apple-system, sans-serif" 
                fontSize="46" 
                fontWeight="800" 
                fill="#3b82f6"
                letterSpacing="-2"
              >
                AS
              </text>
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-[0.15em] text-white group-hover:text-blue-300 transition-colors">
                A SQUARED
              </span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-400/80">
                Listing Studio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold tracking-[0.28em] text-blue-500 uppercase">
                REAL ESTATE
              </span>
              <span className="text-[9px] text-white/40 font-bold">•</span>
              <span className="text-[9px] text-white/60 tracking-wider">
                DUBAI
              </span>
            </div>
          </div>
        </div>

        {/* Listing Studio Direct Actions */}
        <nav className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'dashboard' || activeTab === 'detail'
                ? 'glass-pill-active font-bold text-white shadow-md'
                : 'glass-pill text-white/80 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
            All Properties
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
              activeTab === 'new'
                ? 'bg-white/[0.06] text-white shadow-lg shadow-blue-950/40'
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + New Listing & Photos
          </button>
        </nav>
      </div>
    </header>
  );
}
