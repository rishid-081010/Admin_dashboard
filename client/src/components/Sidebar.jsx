import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const isListingActive = activeTab === 'listing' || activeTab === 'dashboard' || activeTab === 'new' || activeTab === 'detail';
  const isLeadsActive = activeTab === 'leads';

  return (
    <aside className="w-[215px] shrink-0 bg-[#021024]/80 backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-2.5 flex flex-col h-full shadow-2xl select-none overflow-hidden transition-all hidden md:flex">
      {/* Brand Header: Original Official Logo (Image 1) */}
      <div 
        onClick={() => setActiveTab('overview')}
        className="brand-logo flex flex-col items-center justify-center pt-1.5 pb-3 px-2 cursor-pointer select-none group border-b border-white/[0.06] mb-2 shrink-0"
      >
        <img 
          src="./asquared-logo.png" 
          alt="A SQUARED REAL ESTATE" 
          className="w-36 h-auto object-contain transition-transform group-hover:scale-[1.03]"
        />
      </div>

      {/* Section Subheader */}
      <div className="px-2.5 pt-1 pb-1 text-[9.5px] font-bold tracking-widest text-[#94a3b8]/70 uppercase font-mono shrink-0">
        Owners Intelligence
      </div>

      {/* Navigation Links matching Image 2 */}
      <nav className="w-full flex flex-col flex-1 gap-0.5 overflow-y-auto custom-scrollbar pr-0.5 min-h-0">
        {/* 1. Overview */}
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'overview' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Overview</span>
        </button>

        {/* 2. Reported unit owners */}
        <button 
          onClick={() => setActiveTab('owners')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'owners' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Reported unit owners</span>
        </button>

        {/* 3. Prospects & contacts */}
        <button 
          onClick={() => setActiveTab('leads')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            isLeadsActive 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Prospects &amp; contacts</span>
        </button>

        {/* 4. Properties */}
        <button 
          onClick={() => setActiveTab('listing')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            isListingActive 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Properties</span>
        </button>

        {/* 5. Buildings & areas */}
        <button 
          onClick={() => setActiveTab('buildings')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'buildings' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Buildings &amp; areas</span>
        </button>

        {/* 6. Sources */}
        <button 
          onClick={() => setActiveTab('sources')} 
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'sources' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Sources</span>
          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full">1.38k</span>
        </button>

        {/* 7. Review queue */}
        <button 
          onClick={() => setActiveTab('search')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'search' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Review queue</span>
        </button>

        {/* 8. Transactions */}
        <a 
          href="https://transactionaldashboard.asquared.ae/" 
          target="_blank" 
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
        >
          <span>Transactions</span>
          <ExternalLink className="w-3 h-3 text-white/40" />
        </a>

        {/* 9. Official open data */}
        <button 
          onClick={() => setActiveTab('open-data')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'open-data' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Official open data</span>
        </button>

        {/* 10. Data health (Matching Image 4) */}
        <button 
          onClick={() => setActiveTab('data-health')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'data-health' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Data health</span>
        </button>

        {/* 11. My Day */}
        <button 
          onClick={() => setActiveTab('activity')} 
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'activity' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>My Day</span>
          <span className="bg-[#ef4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">3</span>
        </button>

        {/* 12. Smart agent */}
        <button 
          onClick={() => setActiveTab('voice')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'voice' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Smart agent</span>
        </button>
      </nav>

      {/* Bottom Section: INTELLIGENCE */}
      <div className="pt-2 border-t border-white/[0.06] mt-1 space-y-0.5 shrink-0">
        <div className="px-2.5 pt-1 text-[9.5px] font-bold tracking-widest text-[#94a3b8]/60 uppercase font-mono">
          Intelligence
        </div>
        <button 
          onClick={() => setActiveTab('voice')}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] text-[#94a3b8] hover:text-white hover:bg-white/[0.04] transition-all text-left"
        >
          <span className="text-blue-400">✧</span>
          <span>Assistant</span>
        </button>
      </div>
    </aside>
  );
}
