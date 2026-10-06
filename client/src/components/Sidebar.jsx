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
        <nav className="w-full space-y-[6px] px-1">
          {/* 1. Data Cleaning Dashboard */}
          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center justify-between px-4 py-[11px] rounded-[10px] text-[14px] font-semibold tracking-wide transition-all text-left ${
              isLeadsActive
                ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm'
                : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span>Data Cleaning Dashboard</span>
          </button>

          {/* 2. Listing Studio */}
          <button
            onClick={() => setActiveTab('listing')}
            className={`w-full flex items-center justify-between px-4 py-[11px] rounded-[10px] text-[14px] font-semibold tracking-wide transition-all text-left ${
              isListingActive
                ? 'bg-white/[0.14] text-white border border-white/[0.04] shadow-sm'
                : 'text-[#e2e8f0] hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span>Listing Studio</span>
          </button>

          {/* 3. Market Analytics */}
          <a
            href="https://transactionaldashboard.asquared.ae/"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-4 py-[11px] rounded-[10px] text-[14px] font-semibold tracking-wide text-[#e2e8f0] hover:text-white hover:bg-white/[0.05] transition-all group"
          >
            <span>Market Analytics</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
          </a>
        </nav>
      </div>
    </aside>
  );
}
