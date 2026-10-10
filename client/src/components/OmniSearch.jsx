import React, { useState } from 'react';
import { Search, Building2, User, Phone, MapPin, ArrowRight, Filter } from 'lucide-react';

export default function OmniSearch() {
  const [query, setQuery] = useState('');

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300">
      <div className="flex flex-col items-center justify-center mt-12 mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
          GLOBAL OMNI-SEARCH
        </h1>
        <p className="text-[#94a3b8] text-[16px] max-w-xl text-center">
          Query the entire 2.2 million row database instantly. Press <kbd className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono mx-1 border border-white/20">Ctrl</kbd> + <kbd className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono mx-1 border border-white/20">F6</kbd> anywhere to trigger.
        </p>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <div className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-[#3b82f6]" />
          <input
            type="text"
            placeholder="Search for an Owner Name, Phone Number, or Building..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#0f172a]/80 border-2 border-[#1e293b] focus:border-[#3b82f6] rounded-[24px] pl-20 pr-6 py-6 text-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/20 transition-all shadow-2xl"
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#3b82f6] hover:bg-[#2563eb] text-white p-3 rounded-[16px] transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-12">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Search Filters:</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-full text-sm font-medium bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20">Everything</button>
            <button className="px-4 py-2 rounded-full text-sm font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-colors">Owners Only</button>
            <button className="px-4 py-2 rounded-full text-sm font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-colors">Buildings Only</button>
            <button className="px-4 py-2 rounded-full text-sm font-medium bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-colors">Phone Numbers</button>
          </div>
        </div>

        {query && (
          <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[24px] p-8 text-center text-slate-400">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-4"></div>
              Querying God Rows for "{query}"...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
