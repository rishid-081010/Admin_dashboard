import React from 'react';
import { 
  LayoutDashboard, Users, Building2, Search, AlertTriangle, 
  BarChart3, Sparkles, PhoneCall, FileSpreadsheet, Layers, 
  ExternalLink, Settings, Activity, FileCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const isListingActive = activeTab === 'listing' || activeTab === 'dashboard' || activeTab === 'new' || activeTab === 'detail';
  const isLeadsActive = activeTab === 'leads';

  return (
    <aside className="w-[250px] shrink-0 bg-[#021024]/80 backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-2.5 flex flex-col h-full shadow-2xl select-none overflow-hidden transition-all hidden md:flex">
      {/* Brand Header */}
      <div 
        onClick={() => setActiveTab('overview')}
        className="brand-logo flex flex-col items-center justify-center py-2 px-1 cursor-pointer select-none group border-b border-white/[0.06] shrink-0"
      >
        <img 
          src="./asquared-logo.png" 
          alt="A SQUARED REAL ESTATE" 
          className="w-[220px] max-w-full h-auto object-contain transition-transform group-hover:scale-[1.03]"
        />
      </div>

      {/* Navigation Links evenly distributed across the entire vertical widget height */}
      <nav className="w-full flex-1 flex flex-col justify-between py-2 min-h-0 space-y-0.5">
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

        {/* 3. Buildings & Communities */}
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

        {/* 4. Search Engine */}
        <button 
          onClick={() => setActiveTab('search')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'search' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Search Engine</span>
        </button>

        {/* 5. Review Queue */}
        <button 
          onClick={() => setActiveTab('reviews')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'reviews' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Review Queue</span>
        </button>

        {/* 6. Workflows (n8n Automations) */}
        <button 
          onClick={() => setActiveTab('workflows')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'workflows' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Workflows</span>
        </button>

        {/* 7. Data Cleaning */}
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

        {/* 8. Data library */}
        <button 
          onClick={() => setActiveTab('sources')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'sources' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>Data library</span>
        </button>

        {/* 9. Listing Studio */}
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

        {/* 10. Voice Agent Centre */}
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

        {/* 11. My Activity */}
        <button 
          onClick={() => setActiveTab('activity')} 
          className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
            activeTab === 'activity' 
              ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
              : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>My Activity</span>
        </button>

        {/* 12. Transactions (External link to DLD Transaction Dashboard) */}
        <a 
          href="https://transactionaldashboard.asquared.ae/" 
          target="_blank" 
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
        >
          <span>Transactions</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/50" />
        </a>

        {/* 13. Account and settings */}
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
