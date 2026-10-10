import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Users, PhoneCall, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';

export default function Buildings() {
  const [searchTerm, setSearchTerm] = useState('');
  // We'll mock the aggregated buildings data for the UI prototype since doing a GROUP BY on 2.2M rows live requires a DB view
  const buildings = [
    { area: 'BUSINESS BAY', name: 'Burlington Tower', type: 'Commercial / Office', units: 342, profiles: 210, contacts: '145 / 210', cover: 69 },
    { area: 'DUBAI MARINA', name: 'Marina Gate 1', type: 'Residential / Apartment', units: 415, profiles: 380, contacts: '312 / 380', cover: 82 },
    { area: 'JUMEIRAH LAKE TOWERS', name: 'Almas Tower', type: 'Commercial / Office', units: 280, profiles: 190, contacts: '85 / 190', cover: 44 },
    { area: 'DOWNTOWN DUBAI', name: 'Burj Khalifa', type: 'Residential / Apartment', units: 900, profiles: 850, contacts: '720 / 850', cover: 84 },
    { area: 'PALM JUMEIRAH', name: 'Oceana Residences', type: 'Residential / Apartment', units: 250, profiles: 210, contacts: '190 / 210', cover: 90 },
    { area: 'BUSINESS BAY', name: 'Churchill Residency', type: 'Residential / Apartment', units: 512, profiles: 405, contacts: '210 / 405', cover: 51 }
  ];

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            BUILDINGS & COMMUNITIES
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            Explore the properties represented in your data, one building at a time.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] p-5 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search communities or buildings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1e293b]/50 border border-[#334155] rounded-[14px] pl-12 pr-4 py-[14px] text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-1 focus:ring-[#3b82f6]/50 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {buildings.map((b, idx) => (
            <div key={idx} className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 hover:bg-[#1e293b]/50 transition-colors group flex flex-col">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <MapPin className="w-3.5 h-3.5" />
                {b.area}
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#60a5fa] transition-colors">{b.name}</h3>
              <p className="text-sm text-[#94a3b8] mb-6">{b.type}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
                <div className="bg-white/[0.02] border border-[#1e293b] rounded-[12px] p-3 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{b.units}</div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Units Found</div>
                </div>
                <div className="bg-white/[0.02] border border-[#1e293b] rounded-[12px] p-3 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{b.profiles}</div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Linked Profiles</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-400 flex items-center gap-1"><PhoneCall className="w-3 h-3" /> Contact Coverage</span>
                  <span className={b.cover > 70 ? 'text-[#10b981]' : 'text-[#f59e0b]'}>{b.cover}%</span>
                </div>
                <div className="w-full bg-[#1e293b] rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${b.cover > 70 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} style={{ width: \`\${b.cover}%\` }}></div>
                </div>
                <div className="text-[11px] text-slate-500 text-right mt-1">{b.contacts} callable</div>
              </div>

              <button className="w-full py-3 bg-white/5 hover:bg-[#3b82f6] text-white rounded-[12px] font-semibold transition-colors flex items-center justify-center gap-2 text-sm border border-white/5 hover:border-[#3b82f6]">
                Explore Building <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
