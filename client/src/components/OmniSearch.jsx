import React, { useState } from 'react';
import { Search, Building2, User, Phone, MapPin, ArrowRight, Filter } from 'lucide-react';
import axios from 'axios';

export default function OmniSearch() {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('Everything');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (query.length < 2) return;
    setLoading(true);
    try {
      const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
      const endpoint = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owner_intelligence_leads?select=owner_id,full_name,phone_normalized,building_name&limit=50&or=(full_name.ilike.*${encodeURIComponent(query)}*,phone_normalized.ilike.*${encodeURIComponent(query)}*,building_name.ilike.*${encodeURIComponent(query)}*)`;
      
      const res = await axios.get(endpoint, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
      setResults(res.data || []);
    } catch(err) {
      console.error(err);
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80">
      <div className="flex flex-col items-center justify-center mt-6 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
          GLOBAL OMNI-SEARCH
        </h1>
        <p className="text-[#94a3b8] text-[16px] max-w-xl text-center">
          Query the entire 2.2 million row database instantly. Press <kbd className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono mx-1 border border-white/20">Ctrl</kbd> + <kbd className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono mx-1 border border-white/20">F6</kbd> anywhere to trigger.
        </p>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="relative mb-6">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-[#3b82f6]" />
          <input
            type="text"
            placeholder="Search for an Owner Name, Phone Number, or Building..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-black/20 border-2 border-white/10 focus:border-[#3b82f6] rounded-[24px] pl-20 pr-6 py-6 text-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/20 transition-all shadow-2xl"
          />
          <button onClick={handleSearch} className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#3b82f6] hover:bg-[#2563eb] text-white p-3 rounded-[16px] transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <Filter className="w-5 h-5 text-white/60" />
          <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Search Filters:</span>
          <div className="flex gap-2">
            {['Everything', 'Owners Only', 'Buildings Only', 'Phone Numbers'].map(f => (
              <button 
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterType === f ? 'bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20' : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-8">
            {loading && <div className="text-center text-white/40 py-10">Searching 2.23M rows...</div>}
            {!loading && results.length > 0 && results.map((r, i) => (
                <div key={i} className="bg-black/20 border border-white/10 rounded-[16px] p-5 flex items-center justify-between hover:border-[#3b82f6]/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/80">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">{r.full_name || 'Unknown'}</h3>
                            <div className="flex items-center gap-4 text-sm text-white/60 mt-1">
                                <span className="flex items-center gap-1"><Building2 className="w-4 h-4"/> {r.building_name || 'No building'}</span>
                                <span className="flex items-center gap-1"><Phone className="w-4 h-4"/> {r.phone_normalized || 'No phone'}</span>
                            </div>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold text-white transition-colors">
                        View Profile
                    </button>
                </div>
            ))}
            {!loading && query.length >= 3 && results.length === 0 && (
                <div className="text-center text-white/40 py-10">No results found for "{query}"</div>
            )}
        </div>
      </div>
    </div>
  );
}
