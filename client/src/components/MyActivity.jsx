import React, { useState, useEffect } from 'react';
import { LayoutDashboard, List, Search, MoreHorizontal, User } from 'lucide-react';
import axios from 'axios';

export default function MyActivity({ globalAgent }) {
  const [view, setView] = useState('board');
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        // Bypass Render backend completely and hit Bitrix direct from Hostinger
        const res = await axios.post('https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/crm.lead.list.json', {
          filter: { "ASSIGNED_BY_ID": globalAgent },
          select: ["ID", "TITLE", "OPPORTUNITY", "DATE_CREATE", "STATUS_ID"]
        });
        
        const leads = res.data.result || [];
        
        // Group leads by status
        const newLeads = leads.filter(l => l.STATUS_ID === 'NEW' || !l.STATUS_ID);
        const inProcess = leads.filter(l => l.STATUS_ID === 'IN_PROCESS');
        const processed = leads.filter(l => l.STATUS_ID === 'PROCESSED');
        const converted = leads.filter(l => l.STATUS_ID === 'CONVERTED');
        
        const mapLead = l => ({
          title: l.TITLE || `Lead #${l.ID}`,
          value: l.OPPORTUNITY ? `AED ${l.OPPORTUNITY}` : 'TBD',
          date: new Date(l.DATE_CREATE).toLocaleDateString()
        });

        setColumns([
          { id: 'new', title: 'New Leads', count: newLeads.length, items: newLeads.map(mapLead) },
          { id: 'in_process', title: 'In Progress', count: inProcess.length, items: inProcess.map(mapLead) },
          { id: 'processed', title: 'Follow Up', count: processed.length, items: processed.map(mapLead) },
          { id: 'converted', title: 'Converted / Deals', count: converted.length, items: converted.map(mapLead) }
        ]);
      } catch(err) {
        console.error("Direct Bitrix fetch failed", err);
        setColumns([
          { id: 'new', title: 'New Leads', count: 0, items: [] },
          { id: 'in_process', title: 'In Progress', count: 0, items: [] },
          { id: 'processed', title: 'Follow Up', count: 0, items: [] },
          { id: 'converted', title: 'Converted / Deals', count: 0, items: [] }
        ]);
      }
      setLoading(false);
    };
    fetchLeads();
  }, [globalAgent]);

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            MY TASKS &amp; DEALS
          </h1>
          <p className="text-white/60 text-[15px]">
            Active leads and deals synced with Bitrix24 CRM.
          </p>
        </div>
        <div className="flex items-center gap-4">

          <div className="flex gap-2 bg-[#0c1829] border border-[#233549] p-1 rounded-xl shadow-xl shadow-black/40">
            <button onClick={() => setView('board')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${view === 'board' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'text-slate-400 hover:text-white hover:bg-[#102035]'}`}><LayoutDashboard className="w-4 h-4" /> Board</button>
            <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' : 'text-slate-400 hover:text-white hover:bg-[#102035]'}`}><List className="w-4 h-4" /> List</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex gap-6 min-w-max h-full">
          {loading ? (
             <div className="w-full text-center text-slate-400 py-20">Syncing live leads from Bitrix24...</div>
          ) : columns.map(col => (
            <div key={col.id} className="w-[320px] flex flex-col h-full bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 relative overflow-hidden">
              <div className="p-4 border-b border-[#233549] flex items-center justify-between bg-[#071322]">
                <h3 className="font-bold text-white flex items-center gap-2">
                  {col.title} <span className="bg-[#06111e] border border-[#1b2b3d] text-slate-300 text-xs px-2 py-0.5 rounded-full">{col.count}</span>
                </h3>
                <button className="text-slate-400 hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {col.items.map((item, i) => (
                  <div key={i} className="bg-[#06111e] border border-[#1b2b3d] hover:border-[#385175] rounded-[14px] p-4 cursor-grab transition-all shadow-sm hover:shadow-md">
                    <h4 className="text-white font-semibold mb-2">{item.title}</h4>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#10b981] font-bold">{item.value}</span>
                      <span className="text-slate-400">{item.date}</span>
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
