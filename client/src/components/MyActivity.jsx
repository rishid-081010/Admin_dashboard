import React from 'react';
import { KanbanSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function MyActivity() {
  const columns = [
    { id: 'new', title: 'New Leads', color: 'bg-blue-500', count: 12 },
    { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-500', count: 8 },
    { id: 'follow_up', title: 'Follow Up', color: 'bg-purple-500', count: 15 },
    { id: 'won', title: 'Closed Won', color: 'bg-green-500', count: 3 }
  ];

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300 overflow-hidden">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            MY ACTIVITY
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            Live two-way sync with your Bitrix24 CRM pipeline.
          </p>
        </div>
        <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-[12px] font-semibold transition-colors border border-white/10 flex items-center gap-2">
          <KanbanSquare className="w-4 h-4" /> Board View
        </button>
      </div>

      <div className="flex gap-6 flex-1 overflow-x-auto custom-scrollbar pb-4">
        {columns.map(col => (
          <div key={col.id} className="w-[320px] shrink-0 flex flex-col bg-[#0a1321] border border-[#1e293b] rounded-[20px] overflow-hidden">
            <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0f172a]">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                <h3 className="font-bold text-white text-sm">{col.title}</h3>
              </div>
              <span className="bg-[#1e293b] text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">{col.count}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {[1, 2, 3].map(item => (
                <div key={item} className="bg-[#1e293b]/50 border border-[#334155] rounded-[12px] p-4 cursor-pointer hover:border-[#3b82f6]/50 transition-colors">
                  <div className="text-white font-semibold text-sm mb-1">Ahmed Mohammed</div>
                  <div className="text-xs text-slate-400 mb-3">Burj Khalifa • Unit {item}04</div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#334155]">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Value: AED {item * 2.5}M</span>
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
