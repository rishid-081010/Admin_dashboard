import React, { useState, useEffect } from 'react';
import { ExternalLink, LogOut } from 'lucide-react';
import { rbacService, FEATURE_ACCESS_EVENT } from '../utils/rbacService';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const isListingActive = activeTab === 'listing' || activeTab === 'dashboard' || activeTab === 'new' || activeTab === 'detail' || activeTab.startsWith('detail');
  const isLeadsActive = activeTab === 'leads' || activeTab === 'sources';
  const [, setRbacVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRbacVersion(v => v + 1);
    window.addEventListener(FEATURE_ACCESS_EVENT, handleUpdate);
    rbacService.fetchFromCloud();
    return () => window.removeEventListener(FEATURE_ACCESS_EVENT, handleUpdate);
  }, []);

  const role = currentUser?.role || 'admin';
  const isAllowed = (featKey) => rbacService.isFeatureAllowed(role, featKey);
  const showPortfolio = rbacService.isSectionVisible(role, 'portfolio');
  const showOperations = rbacService.isSectionVisible(role, 'operations');
  const showAdmin = rbacService.isSectionVisible(role, 'admin');

  return (
    <aside 
      className="w-[240px] shrink-0 backdrop-blur-2xl border border-white/15 rounded-2xl p-2.5 flex flex-col h-full shadow-2xl select-none overflow-hidden transition-all hidden md:flex relative z-10"
      style={{
        background: 'rgba(7, 14, 28, 0.45)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)'
      }}
    >
      {/* Brand Header */}
      <div 
        onClick={() => {
          const target = isAllowed('overview') ? 'overview' : rbacService.getFirstAccessibleTab(role);
          setActiveTab(target);
        }}
        className="brand-logo flex flex-col items-center justify-center py-2.5 px-2 cursor-pointer select-none group border-b border-white/10 shrink-0"
      >
        <img 
          src="./asquared-logo-transparent.png" 
          alt="A SQUARED REAL ESTATE" 
          className="w-[160px] max-w-full h-auto object-contain transition-transform group-hover:scale-[1.02] drop-shadow-md" 
        />
      </div>

      {/* Grouped Section Navigation */}
      <nav className="w-full flex-1 flex flex-col py-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5">
        {/* ── SECTION 1: PORTFOLIO ── */}
        {showPortfolio && (
          <div className="space-y-0.5">
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#b7a990] font-sans">
              Portfolio
            </div>

            {isAllowed('overview') && (
              <button 
                onClick={() => setActiveTab('overview')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'overview' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Overview</span>
              </button>
            )}

            {isAllowed('owners') && (
              <button 
                onClick={() => setActiveTab('owners')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'owners' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Owners Data</span>
              </button>
            )}

            {isAllowed('buildings') && (
              <button 
                onClick={() => setActiveTab('buildings')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'buildings' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Buildings</span>
              </button>
            )}

            {isAllowed('search') && (
              <button 
                onClick={() => setActiveTab('search')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'search' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Search Engine</span>
              </button>
            )}

            {isAllowed('transactions') && (
              <a 
                href="https://transactionaldashboard.asquared.ae/" 
                target="_blank" 
                rel="noreferrer" 
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
              >
                <span>Transactions</span>
                <ExternalLink className="w-3.5 h-3.5 text-white/50" />
              </a>
            )}
          </div>
        )}

        {/* ── SECTION 2: OPERATIONS ── */}
        {showOperations && (
          <div className="space-y-0.5 pt-1 border-t border-white/[0.06]">
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#b7a990] font-sans">
              Operations
            </div>

            {isAllowed('workflows') && (
              <button 
                onClick={() => setActiveTab('workflows')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'workflows' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Workflows</span>
              </button>
            )}

            {isAllowed('leads') && (
              <button 
                onClick={() => setActiveTab('leads')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  isLeadsActive 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Data Cleaning</span>
              </button>
            )}

            {isAllowed('listing') && (
              <button 
                onClick={() => setActiveTab('listing')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  isListingActive 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Listing Studio</span>
              </button>
            )}

            {isAllowed('voice') && (
              <button 
                onClick={() => setActiveTab('voice')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'voice' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Voice Agent Centre</span>
              </button>
            )}

            {isAllowed('agent') && (
              <button 
                onClick={() => setActiveTab('agent')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'agent' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>AI Agent</span>
              </button>
            )}

            {isAllowed('activity') && (
              <button 
                onClick={() => setActiveTab('activity')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'activity' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>My Activity</span>
              </button>
            )}
          </div>
        )}

        {/* ── SECTION 3: ADMIN ── */}
        {showAdmin && (
          <div className="space-y-0.5 pt-1 border-t border-white/[0.06]">
            <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#b7a990] font-sans">
              Admin
            </div>

            {isAllowed('roles') && (
              <button 
                onClick={() => setActiveTab('roles')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'roles' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Roles</span>
              </button>
            )}

            {isAllowed('settings') && (
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`w-full flex items-center px-3 py-1.5 rounded-xl text-[13px] font-medium tracking-wide transition-all text-left ${
                  activeTab === 'settings' 
                    ? 'bg-[#183153]/85 text-[#e2e0cc] border border-[#b7a990]/40 shadow-lg backdrop-blur-md' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>Account &amp; Settings</span>
              </button>
            )}
          </div>
        )}
      </nav>

      {/* User Session & Logout Footer */}
      {currentUser && (
        <div className="pt-2.5 mt-auto border-t border-white/10 shrink-0 flex items-center justify-between px-1.5 py-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#122238]/80 border border-[#b7a990]/40 flex items-center justify-center text-[#e2e0cc] font-bold text-xs uppercase shrink-0 shadow-sm">
              {currentUser.name ? currentUser.name.charAt(0) : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate leading-tight">
                {currentUser.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-300 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
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
