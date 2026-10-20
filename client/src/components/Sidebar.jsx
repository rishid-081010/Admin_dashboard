import React from 'react';
import { ExternalLink, LogOut, User } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
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

      {/* Navigation Links grouped into 3 logical sections: PORTFOLIO, OPERATIONS, ADMIN (UI-005) */}
      <nav className="w-full flex-1 flex flex-col py-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5">
        
        {/* ── SECTION 1: PORTFOLIO ── */}
        <div className="space-y-0.5">
          <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Portfolio
          </div>

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

          {/* 5. Transactions (External link to DLD Transaction Dashboard) */}
          <a 
            href="https://transactionaldashboard.asquared.ae/" 
            target="_blank" 
            rel="noreferrer"
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
          >
            <span>Transactions</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/50" />
          </a>
        </div>

        {/* ── SECTION 2: OPERATIONS ── */}
        <div className="space-y-0.5 pt-1 border-t border-white/[0.06]">
          <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Operations
          </div>

          {/* 6. Workflows */}
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

          {/* 8. Data Library */}
          <button 
            onClick={() => setActiveTab('sources')} 
            className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
              activeTab === 'sources' 
                ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
                : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Data Library</span>
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

          {/* 11. AI Agent */}
          <button 
            onClick={() => setActiveTab('agent')} 
            className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
              activeTab === 'agent' 
                ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
                : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>AI Agent</span>
          </button>

          {/* 12. My Activity */}
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
        </div>

        {/* ── SECTION 3: ADMIN ── */}
        <div className="space-y-0.5 pt-1 border-t border-white/[0.06]">
          <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Admin
          </div>

          {/* 13. Roles */}
          <button 
            onClick={() => setActiveTab('roles')} 
            className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
              activeTab === 'roles' 
                ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
                : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Roles</span>
          </button>

          {/* 14. Account & Settings */}
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
              activeTab === 'settings' 
                ? 'bg-[#183153] text-white border border-white/[0.15] shadow-sm' 
                : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Account &amp; Settings</span>
          </button>
        </div>
      </nav>

      {/* User Session & Logout Footer */}
      {currentUser && (
        <div className="pt-2.5 mt-auto border-t border-white/[0.08] shrink-0 flex items-center justify-between px-1.5 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-xs uppercase shrink-0">
              {currentUser.name ? currentUser.name.charAt(0) : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate leading-tight">
                {currentUser.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                <span className="capitalize">{currentUser.role || 'admin'}</span>
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
