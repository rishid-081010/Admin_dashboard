import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const isListingActive = activeTab === 'listing' || activeTab === 'dashboard' || activeTab === 'new' || activeTab === 'detail';
  const isLeadsActive = activeTab === 'leads';

  return (
    <aside className="w-[215px] shrink-0 bg-[#021024]/80 backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-2.5 flex flex-col h-full shadow-2xl select-none overflow-hidden transition-all hidden md:flex">
      {/* Brand Header: Original Official Logo */}
      <div 
        onClick={() => setActiveTab('overview')}
        className="brand-logo flex flex-col items-center justify-center pt-1.5 pb-2.5 px-2 cursor-pointer select-none group border-b border-white/[0.06] shrink-0"
      >
        <img 
          src="./asquared-logo.png" 
          alt="A SQUARED REAL ESTATE" 
          className="w-36 h-auto object-contain transition-transform group-hover:scale-[1.03]"
        />
      </div>

      {/* Navigation Links evenly distributed across the entire vertical widget height */}
      <nav className="w-full flex-1 flex flex-col justify-between py-2 min-h-0">
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

        {/* 2. Owners Data */}
        <button 
          onClick={() => setActiveTab('owners')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'owners' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Owners Data</span>
        </button>

        {/* 3. My Activity */}
        <button 
          onClick={() => setActiveTab('activity')} 
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'activity' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>My Activity</span>
          <span className="bg-[#ef4444] text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center">3</span>
        </button>

        {/* 4. Search Engine */}
        <button 
          onClick={() => setActiveTab('search')} 
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'search' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Search Engine</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/10 font-mono tracking-tight">
            ^F6
          </span>
        </button>

        {/* 5. Team Management */}
        <button 
          onClick={() => setActiveTab('team')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'team' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Team Management</span>
        </button>

        {/* 6. Data Cleaning */}
        <button 
          onClick={() => setActiveTab('leads')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            isLeadsActive 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Data Cleaning</span>
        </button>

        {/* 7. Listing Studio */}
        <button 
          onClick={() => setActiveTab('listing')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            isListingActive 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Listing Studio</span>
        </button>

        {/* 8. Voice Agent Centre */}
        <button 
          onClick={() => setActiveTab('voice')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'voice' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Voice Agent Centre</span>
        </button>

        {/* 9. Buildings */}
        <button 
          onClick={() => setActiveTab('buildings')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'buildings' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Buildings</span>
        </button>

        {/* 10. Data library */}
        <button 
          onClick={() => setActiveTab('sources')} 
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'sources' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Data library</span>
          <span className="text-[10px] text-slate-400 font-medium">1.38k</span>
        </button>

        {/* 11. Transactions */}
        <a 
          href="https://transactionaldashboard.asquared.ae/" 
          target="_blank" 
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
        >
          <span>Transactions</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/50" />
        </a>

        {/* 12. Account and settings */}
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'settings' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Account and settings</span>
        </button>
      </nav>
    </aside>
  );
}
