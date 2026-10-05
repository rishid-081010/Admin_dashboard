import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const isListingActive = activeTab === 'listing' || activeTab === 'dashboard' || activeTab === 'new' || activeTab === 'detail';
  const isLeadsActive = activeTab === 'leads';

  return (
    <aside className="w-64 shrink-0 bg-[#001e39] border border-[#00284b] rounded-[28px] p-6 flex flex-col justify-between h-[calc(100vh-3rem)] sticky top-6 hidden md:flex select-none">
      <div>
        {/* Brand: A SQUARED REAL ESTATE (Exact Official Logo) */}
        <div 
          onClick={() => setActiveTab('listing')}
          className="brand-logo flex flex-col items-center justify-center mb-7 mt-1 cursor-pointer group select-none"
        >
          <img 
            src="./asquared-logo.png" 
            alt="A SQUARED REAL ESTATE" 
            className="w-36 h-auto object-contain transition-transform group-hover:scale-[1.02]"
          />
        </div>

        {/* Navigation Links */}
        <nav className="w-full space-y-1">
          {/* 1. Lead Ingestion Studio */}
          <button
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all text-left ${
              isLeadsActive
                ? 'bg-[#00284b] text-white border border-[#003d73] shadow-md font-bold'
                : 'text-[#8da4be] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Lead Ingestion Studio</span>
          </button>

          {/* 2. Listing Studio */}
          <button
            onClick={() => setActiveTab('listing')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all text-left ${
              isListingActive
                ? 'bg-[#00284b] text-white border border-[#003d73] shadow-md font-bold'
                : 'text-[#8da4be] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Listing Studio</span>
          </button>

          {/* 3. Market Analytics */}
          <a
            href="https://rishid-081010.github.io/transactional_dashboard/"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-[#8da4be] hover:text-white hover:bg-white/[0.04] transition-all group"
          >
            <span>Market Analytics</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
          </a>


        </nav>
      </div>

      {/* Footer Status Badge */}
      <div className="border-t border-[#1a273b] pt-4 flex items-center gap-2 px-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        <div className="text-[10px] text-gray-400 leading-tight">
          <span className="font-bold text-white text-xs block">39,144 Leads</span>
          Hostinger Cloud DB
        </div>
      </div>
    </aside>
  );
}
