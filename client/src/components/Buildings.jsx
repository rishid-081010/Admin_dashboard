import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Users, PhoneCall, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';

export default function Buildings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/buildings');
        setBuildings(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuildings();
  }, []);

  const filtered = buildings.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80">
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

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg relative overflow-hidden p-5 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
          <input
            type="text"
            placeholder="Search building name or community..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/10/50 border border-[#334155] rounded-[14px] pl-12 pr-4 py-[14px] text-[15px] text-white placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-12 pr-2 custom-scrollbar">
        {loading ? (
           <div className="text-white/40 col-span-full">Loading all database buildings...</div>
        ) : filtered.map((b, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg relative overflow-hidden p-6 hover:bg-black/20/60 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[#3b82f6] text-[11px] font-bold tracking-wider uppercase mb-1">{b.area}</div>
                <h3 className="text-xl font-bold text-white leading-tight">{b.name}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10/50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white/60" />
              </div>
            </div>
            
            <div className="flex gap-6 mb-6">
              <div>
                <div className="text-[12px] text-white/40 font-medium mb-0.5">Units in DB</div>
                <div className="text-lg font-bold text-white flex items-center gap-1.5"><MapPin className="w-4 h-4 text-white/60"/> {b.units}</div>
              </div>
              <div>
                <div className="text-[12px] text-white/40 font-medium mb-0.5">Linked Profiles</div>
                <div className="text-lg font-bold text-white flex items-center gap-1.5"><Users className="w-4 h-4 text-white/60"/> {b.contacts}</div>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-3 border border-white/10 mb-5">
              <div className="flex justify-between text-xs font-semibold mb-2 uppercase tracking-wider">
                <span className="text-white/40">Contact Coverage</span>
                <span className={b.cover > 70 ? 'text-[#10b981]' : 'text-[#f59e0b]'}>{b.cover}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${b.cover > 70 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} style={{ width: `${b.cover}%` }}></div>
              </div>
              <div className="text-[11px] text-white/40 text-right mt-1">{b.contacts} callable</div>
            </div>

            <button className="w-full py-3 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/20 rounded-xl text-[#60a5fa] font-semibold text-[13px] flex items-center justify-center gap-2 transition-all">
              Explore Building <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
