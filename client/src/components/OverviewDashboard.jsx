import React, { useState, useEffect } from 'react';
import { Users, Database, Phone, TrendingUp, Activity, ArrowRight, Zap, Target } from 'lucide-react';
import axios from 'axios';

export default function OverviewDashboard() {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/kpis');
        setKpis(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchKpis();
  }, []);

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            EXECUTIVE OVERVIEW
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            High-level metrics and KPIs are currently syncing with Bitrix24.
          </p>
        </div>
      </div>

      {!kpis ? (
        <div className="text-slate-500 text-center py-20">Loading live data from Supabase and Bitrix24...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 hover:border-[#3b82f6]/50 transition-colors">
              <Database className="w-6 h-6 text-blue-400 mb-4" />
              <div className="text-sm font-medium text-slate-400 mb-1">Total Unified Rows</div>
              <div className="text-3xl font-bold text-white mb-2">{kpis.totalOwners}</div>
              <div className="text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-1 rounded-md inline-block">100% Synced</div>
            </div>
            
            <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 hover:border-[#3b82f6]/50 transition-colors">
              <Users className="w-6 h-6 text-purple-400 mb-4" />
              <div className="text-sm font-medium text-slate-400 mb-1">Active CRM Leads</div>
              <div className="text-3xl font-bold text-white mb-2">{kpis.crmLeads}</div>
              <div className="text-xs text-blue-400 font-semibold bg-blue-400/10 px-2 py-1 rounded-md inline-block">via Bitrix24</div>
            </div>

            <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 hover:border-[#3b82f6]/50 transition-colors">
              <Phone className="w-6 h-6 text-amber-400 mb-4" />
              <div className="text-sm font-medium text-slate-400 mb-1">Vapi Calls Executed</div>
              <div className="text-3xl font-bold text-white mb-2">{kpis.vapiCalls}</div>
              <div className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2 py-1 rounded-md inline-block">4 Active Personas</div>
            </div>

            <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 hover:border-[#3b82f6]/50 transition-colors">
              <TrendingUp className="w-6 h-6 text-green-400 mb-4" />
              <div className="text-sm font-medium text-slate-400 mb-1">Pipeline Value</div>
              <div className="text-3xl font-bold text-white mb-2">{kpis.pipelineValue}</div>
              <div className="text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-1 rounded-md inline-block">+12% this week</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
             {/* Chart Placeholder */}
             <div className="bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] p-6 flex flex-col">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Target className="w-5 h-5 text-[#3b82f6]" /> Pipeline Conversion Trajectory</h3>
                <div className="flex-1 border border-[#1e293b] rounded-xl bg-[#0a1321] flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                   <div className="text-center relative z-10">
                      <TrendingUp className="w-12 h-12 text-[#3b82f6] mx-auto mb-3 opacity-50" />
                      <p className="text-slate-400 font-medium">Real-time charts will render upon sufficient lead velocity.</p>
                   </div>
                </div>
             </div>

             {/* Activity Feed */}
             <div className="bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] p-6 flex flex-col">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-purple-400" /> Recent System Activity</h3>
                <div className="flex-1 flex flex-col gap-4">
                  {kpis.recentActivity.map((act, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-[#1e293b] bg-[#0a1321] rounded-xl hover:bg-[#0f172a]/80 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center mt-1">
                        <Zap className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{act.title}</h4>
                        <span className="text-xs text-slate-500">{act.time}</span>
                      </div>
                      <button className="text-slate-500 hover:text-white mt-2"><ArrowRight className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
