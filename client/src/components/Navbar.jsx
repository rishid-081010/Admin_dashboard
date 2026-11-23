import React from 'react';
import { Building2, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header className="bg-[#070e1c] sticky top-0 z-50 border-b border-[#1b2b3d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand: A SQUARED REAL ESTATE */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center gap-3.5 cursor-pointer group select-none"
        >
          {/* Stylized AS Monogram Emblem */}
          <div className="w-11 h-11 rounded-2xl bg-[#0c1829] border border-[#1b2b3d] flex items-center justify-center shadow-lg shadow-black/40 group-hover:border-[#b7a990]/60 transition-all duration-300">
            <svg viewBox="0 0 128 128" className="w-8 h-8 group-hover:scale-105 transition-transform">
              <g fill="#e2e0cc" transform="translate(64, 64) scale(1.15)">
                <path d="M-18,24 L-12,24 L-3,-18 L3,-18 L12,24 L18,24 L18,26 L10,26 L10,24 L6,6 L-6,6 L-10,24 L-10,26 L-18,26 Z M-4.5,2 L4.5,2 L0,-12 Z" />
                <path d="M-8,-16 C-2,-24 14,-22 14,-12 C14,-5 6,-2 0,2 C-7,6 -13,10 -13,18 C-13,27 2,30 9,25 L8,21 C3,25 -8,23 -8,17 C-8,12 -3,9 4,5 C12,0 18,-4 18,-13 C18,-24 3,-28 -7,-20 Z" opacity="0.95" />
              </g>
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-[0.15em] text-white font-editorial group-hover:text-[#e2e0cc] transition-colors">
                A SQUARED
              </span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#b7a990]">
                Listing Studio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold tracking-[0.28em] text-[#e2e0cc] uppercase">
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              activeTab === 'dashboard' || activeTab === 'detail'
                ? 'bg-[#183153] text-[#e2e0cc] border-[#b7a990] shadow-sm font-semibold'
                : 'bg-[#0c1829] text-[#94a3b8] hover:text-white border-[#1b2b3d]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#b7a990]" />
            All Properties
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              activeTab === 'new'
                ? 'bg-[#183153] text-[#e2e0cc] border-[#b7a990] shadow-sm font-semibold'
                : 'bg-[#0c1829] hover:bg-[#122238] border-[#1b2b3d] text-[#e2e0cc]'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + New Listing &amp; Photos
          </button>
        </nav>
      </div>
    </header>
  );
}
