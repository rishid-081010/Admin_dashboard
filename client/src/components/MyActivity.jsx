import React, { useState, useEffect } from 'react';
import { LayoutDashboard, List, Search, MoreHorizontal, User } from 'lucide-react';
import axios from 'axios';

export default function MyActivity() {
  const [view, setView] = useState('board');
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fake login dropdown using real Bitrix IDs!
  const [selectedAgent, setSelectedAgent] = useState('6'); // Default to Melanie (Admin)
  
  const agents = [
    { id: 'all', name: 'All Company Leads' },
    { id: '6', name: 'Melanie Simsiman (Admin)' },
    { id: '7', name: 'Akarsh Arora' },
    { id: '186', name: 'NIDAF KHAN' },
    { id: '75', name: 'Mayannk Agarwal' },
    { id: '11', name: 'Mridul Sethi' }
  ];

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/bitrix-leads?agent_id=${selectedAgent}`);
        setColumns(res.data);
      } catch(err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchLeads();
  }, [selectedAgent]);

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            MY ACTIVITY (BITRIX24)
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            Live two-way sync with Bitrix24 CRM pipeline.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2">
             <User className="w-4 h-4 text-slate-400" />
             <span className="text-sm font-semibold text-slate-400">View As:</span>
             <select 
               value={selectedAgent} 
               onChange={(e) => setSelectedAgent(e.target.value)}
               className="bg-transparent text-white font-bold outline-none cursor-pointer"
             >
               {agents.map(a => <option key={a.id} value={a.id} className="bg-[#0f172a]">{a.name}</option>)}
             </select>
          </div>
          <div className="flex gap-2 bg-[#0f172a]/80 p-1 rounded-xl border border-[#1e293b]">
            <button onClick={() => setView('board')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${view === 'board' ? 'bg-white/10 text-white' : 'text-slate-400'}`}><LayoutDashboard className="w-4 h-4" /> Board</button>
            <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${view === 'list' ? 'bg-white/10 text-white' : 'text-slate-400'}`}><List className="w-4 h-4" /> List</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex gap-6 min-w-max h-full">
          {loading ? (
             <div className="w-full text-center text-slate-500 py-20">Syncing live leads from Bitrix24...</div>
          ) : columns.map(col => (
            <div key={col.id} className="w-[320px] flex flex-col h-full bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] overflow-hidden">
              <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0a1321]">
                <h3 className="font-bold text-white flex items-center gap-2">
                  {col.title} <span className="bg-[#1e293b] text-slate-300 text-xs px-2 py-0.5 rounded-full">{col.count}</span>
                </h3>
                <button className="text-slate-500 hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {col.items.map((item, i) => (
                  <div key={i} className="bg-[#1e293b]/50 border border-[#334155] rounded-[14px] p-4 hover:border-[#3b82f6]/50 cursor-grab transition-colors shadow-sm">
                    <h4 className="text-white font-semibold mb-2">{item.title}</h4>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#10b981] font-bold">{item.value}</span>
                      <span className="text-slate-500">{item.date}</span>
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && <div className="text-slate-500 text-sm text-center py-4">No leads</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
