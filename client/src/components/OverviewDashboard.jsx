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
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            EXECUTIVE OVERVIEW
          </h1>
          <p className="text-white/60 text-[15px]">
            High-level metrics and KPIs are currently syncing with Bitrix24.
          </p>
        </div>
      </div>

      {!kpis ? (
        <div className="text-white/60 text-center py-20">Loading live data from Supabase and Bitrix24...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
              <Database className="w-6 h-6 text-blue-300 mb-4" />
              <div className="text-xs text-white/60 uppercase tracking-widest font-semibold mb-1">Total Unified Rows</div>
              <div className="text-3xl font-bold text-white tracking-tight drop-shadow-md mb-2">{kpis.totalOwners}</div>
              <div className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20 font-medium inline-flex items-center gap-1">● 100% Synced</div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
              <Users className="w-6 h-6 text-purple-300 mb-4" />
              <div className="text-xs text-white/60 uppercase tracking-widest font-semibold mb-1">Active CRM Leads</div>
              <div className="text-3xl font-bold text-white tracking-tight drop-shadow-md mb-2">{kpis.crmLeads}</div>
              <div className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 font-medium inline-flex items-center gap-1">● via Bitrix24</div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
              <Phone className="w-6 h-6 text-amber-300 mb-4" />
              <div className="text-xs text-white/60 uppercase tracking-widest font-semibold mb-1">Vapi Calls Executed</div>
              <div className="text-3xl font-bold text-white tracking-tight drop-shadow-md mb-2">{kpis.vapiCalls}</div>
              <div className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20 font-medium inline-flex items-center gap-1">● 4 Active Personas</div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
              <TrendingUp className="w-6 h-6 text-green-400 mb-4" />
              <div className="text-xs text-white/60 uppercase tracking-widest font-semibold mb-1">Pipeline Value</div>
              <div className="text-3xl font-bold text-white tracking-tight drop-shadow-md mb-2">{kpis.pipelineValue}</div>
              <div className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20 font-medium inline-flex items-center gap-1">● +12% this week</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
             {/* Chart Placeholder */}
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col shadow-lg">
                <h3 className="text-xl font-semibold text-white tracking-tight mb-6 flex items-center gap-2"><Target className="w-5 h-5 text-blue-300" /> Pipeline Conversion Trajectory</h3>
                <div className="flex-1 border border-white/10 rounded-xl bg-black/20 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                   <div className="text-center relative z-10">
                      <TrendingUp className="w-12 h-12 text-blue-300 mx-auto mb-3 opacity-50 loading-pulse" />
                      <p className="text-white/60 font-medium text-sm">Real-time charts will render upon sufficient lead velocity.</p>
                   </div>
                </div>
             </div>

             {/* Activity Feed */}
             <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col shadow-lg">
                <h3 className="text-xl font-semibold text-white tracking-tight mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-purple-300" /> Recent System Activity</h3>
                <div className="flex-1 flex flex-col gap-4">
                  {kpis.recentActivity.map((act, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-white/10 bg-black/20 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mt-1">
                        <Zap className="w-4 h-4 text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{act.title}</h4>
                        <span className="text-xs text-white/50">{act.time}</span>
                      </div>
                      <button className="text-white/40 hover:text-white mt-2"><ArrowRight className="w-4 h-4" /></button>
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
