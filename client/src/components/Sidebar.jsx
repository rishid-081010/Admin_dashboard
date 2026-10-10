import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const isListingActive = activeTab === 'listing' || activeTab === 'dashboard' || activeTab === 'new' || activeTab === 'detail';
  const isLeadsActive = activeTab === 'leads';

  return (
    <aside className="w-64 shrink-0 bg-[#0a1321] border border-[#1c2738] rounded-[28px] p-6 flex flex-col justify-between h-[calc(100vh-3rem)] sticky top-6 hidden md:flex select-none overflow-hidden">
      <div>
        {/* Brand: A SQUARED REAL ESTATE (Exact Official Logo) */}
        <div 
          onClick={() => setActiveTab('listing')}
          className="brand-logo flex flex-col items-center justify-center pt-1 pb-7 border-b border-[#ffffff0a] -mx-6 px-6 mb-5 cursor-pointer group select-none"
        >
          <img 
            src="./asquared-logo.png" 
            alt="A SQUARED REAL ESTATE" 
            className="w-48 h-auto object-contain transition-transform group-hover:scale-[1.02]"
          />
        </div>

        {/* Navigation Links */}
        <nav className="w-full space-y-[4px] px-1 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
          {/* 1. Dashboard */}
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'overview' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Overview Dashboard</span>
          </button>
          
          {/* 2. Owners Directory */}
          <button onClick={() => setActiveTab('owners')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'owners' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Owners Directory</span>
          </button>

          {/* 3. Buildings */}
          <button onClick={() => setActiveTab('buildings')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'buildings' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Buildings</span>
          </button>

          {/* 4. Omni-Search */}
          <button onClick={() => setActiveTab('search')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'search' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Omni-Search</span>
          </button>

          {/* 5. My Activity */}
          <button onClick={() => setActiveTab('activity')} className={`w-full flex items-center justify-between px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'activity' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>My Activity (Bitrix24)</span>
            <span className="bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
          </button>

          {/* 6. Voice Agent Centre */}
          <button onClick={() => setActiveTab('voice')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'voice' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Voice Agent Centre</span>
          </button>

          {/* 7. Data Cleaning (Existing) */}
          <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${isLeadsActive ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Data Cleaning</span>
          </button>

          {/* 8. Listing Studio (Existing) */}
          <button onClick={() => setActiveTab('listing')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${isListingActive ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Listing Studio</span>
          </button>

          {/* 9. Team Management */}
          <button onClick={() => setActiveTab('team')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'team' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Team Management</span>
          </button>

          {/* 10. Account & Settings */}
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide transition-all text-left ${activeTab === 'settings' ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm' : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'}`}>
            <span>Account & Settings</span>
          </button>

          <a href="https://transactionaldashboard.asquared.ae/" target="_blank" rel="noreferrer" className="w-full flex items-center justify-between px-4 py-[10px] rounded-[10px] text-[13px] font-semibold tracking-wide text-[#e2e8f0] hover:text-white hover:bg-white/[0.05] transition-all group mt-2 border-t border-white/5 pt-3">
            <span>Market Analytics</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
          </a>
        </nav>
      </div>
    </aside>
  );
}
