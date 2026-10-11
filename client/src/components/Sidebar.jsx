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

        {/* 2. Owners Data (formerly Reported unit owners) */}
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

        {/* 3. Data Cleaning */}
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

        {/* 4. Listing Dashboard */}
        <button 
          onClick={() => setActiveTab('listing')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            isListingActive 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Listing Dashboard</span>
        </button>

        {/* 5. Buildings & Areas */}
        <button 
          onClick={() => setActiveTab('buildings')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'buildings' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Buildings &amp; Areas</span>
        </button>

        {/* 6. Data Sources */}
        <button 
          onClick={() => setActiveTab('sources')} 
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'sources' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Data Sources</span>
          <span className="bg-[#1e3a5f] text-[#60a5fa] border border-[#3b82f6]/30 text-[9.5px] font-bold px-2 py-0.5 rounded-full">1.38k</span>
        </button>

        {/* 7. Search & Review */}
        <button 
          onClick={() => setActiveTab('search')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'search' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Search &amp; Review</span>
        </button>

        {/* 8. Transactions */}
        <a 
          href="https://transactionaldashboard.asquared.ae/" 
          target="_blank" 
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
        >
          <span>Transactions</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/50" />
        </a>

        {/* 9. Market Registry */}
        <button 
          onClick={() => setActiveTab('open-data')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'open-data' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Market Registry</span>
        </button>

        {/* 10. Data Quality */}
        <button 
          onClick={() => setActiveTab('data-health')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'data-health' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Data Quality</span>
        </button>

        {/* 11. My Tasks */}
        <button 
          onClick={() => setActiveTab('activity')} 
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'activity' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>My Tasks</span>
          <span className="bg-[#ef4444] text-white text-[9.5px] font-bold w-4 h-4 rounded-full flex items-center justify-center">3</span>
        </button>

        {/* 12. Voice Agent Centre */}
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
      </nav>
    </aside>
  );
}
