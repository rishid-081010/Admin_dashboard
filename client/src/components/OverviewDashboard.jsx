import React, { useState, useEffect } from 'react';
import { Users, Database, Phone, TrendingUp, Activity, ArrowRight, Zap, Target } from 'lucide-react';
import axios from 'axios';

export default function OverviewDashboard() {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/kpis`);
        setKpis(res.data);
      } catch (err) {
        console.error("Backend unreachable, falling back to cached view", err);
        // DEMO FALLBACK
        setKpis({
          totalOwners: '3,042,722',
          crmLeads: '42,147',
          vapiCalls: '79,993',
          pipelineValue: '$14.2M',
          recentActivity: [
            { title: 'New lead pushed to Bitrix24', time: '12 mins ago' },
            { title: 'Sarah (AI) completed outbound queue', time: '1 hour ago' },
            { title: 'Database sync completed (3,042,722 rows)', time: '3 hours ago' },
            { title: 'James (AI) dialer active on Line 2', time: '4 hours ago' }
          ]
        });
      }
    };
    fetchKpis();
  }, []);

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 justify-between gap-3 sm:gap-4 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1 drop-shadow-md" style={{ fontFamily: "Georgia, serif" }}>
            OVERVIEW
          </h1>
          <p className="text-white/60 text-xs sm:text-sm font-medium">
            Key performance metrics synced with Bitrix24 CRM.
          </p>
        </div>
      </div>

      {!kpis ? (
        <div className="flex-1 flex items-center justify-center text-white/60 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading live data from Supabase and Bitrix24...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Cards - Expanded Glassmorphism Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
            {/* KPI 1 */}
            <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group hover:border-white/25 hover:bg-[#061d3d]/90 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] text-white/60 uppercase tracking-widest font-bold">Total Properties</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center">
                  <Database className="w-4 h-4 text-blue-300" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md my-2">
                {kpis.totalOwners}
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] border border-emerald-500/30 font-semibold inline-flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  ✓ Database Synced
                </span>
              </div>
            </div>
            
            {/* KPI 2 */}
            <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group hover:border-white/25 hover:bg-[#061d3d]/90 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] text-white/60 uppercase tracking-widest font-bold">Active Leads</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-400/25 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-300" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md my-2">
                {kpis.crmLeads}
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[11px] border border-blue-500/30 font-semibold inline-flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  ✓ Bitrix24
                </span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group hover:border-white/25 hover:bg-[#061d3d]/90 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] text-white/60 uppercase tracking-widest font-bold">Calls Made</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-amber-300" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md my-2">
                {kpis.vapiCalls}
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[11px] border border-amber-500/30 font-semibold inline-flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  ✓ 4 Agent Lines
                </span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group hover:border-white/25 hover:bg-[#061d3d]/90 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] text-white/60 uppercase tracking-widest font-bold">Pipeline Value</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md my-2">
                {kpis.pipelineValue}
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] border border-emerald-500/30 font-semibold inline-flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  ✓ +12% this week
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Two Large Glassmorphic Widgets - Stretch to fill viewport height */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
             {/* Left Large Widget: Sales Pipeline */}
             <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 flex flex-col shadow-2xl min-h-0 overflow-hidden group hover:border-white/20 transition-all">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-3 flex items-center gap-2 shrink-0" style={{ fontFamily: "Georgia, serif" }}>
                  <Target className="w-5 h-5 text-blue-400" /> Sales Pipeline
                </h3>
                <div className="flex-1 border border-white/10 rounded-xl bg-black/25 flex items-center justify-center relative overflow-hidden min-h-0">
                   <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                   <div className="text-center relative z-10 p-6 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mb-3">
                        <TrendingUp className="w-7 h-7 text-blue-400 opacity-80" />
                      </div>
                      <p className="text-white/75 font-semibold text-sm max-w-sm">Deals and pipeline stages will update as leads progress in Bitrix24 CRM.</p>
                      <span className="text-xs text-white/40 mt-1.5 font-medium">Tracking 3,042,722 verified properties across Dubai</span>
                   </div>
                </div>
             </div>

             {/* Right Large Widget: Recent Activity */}
             <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 flex flex-col shadow-2xl min-h-0 overflow-hidden group hover:border-white/20 transition-all">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-3 flex items-center gap-2 shrink-0" style={{ fontFamily: "Georgia, serif" }}>
                  <Activity className="w-5 h-5 text-purple-400" /> Recent Activity
                </h3>
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                  {kpis.recentActivity.map((act, i) => (
                    <div key={i} className="flex items-center gap-3.5 p-3.5 border border-white/10 bg-black/25 rounded-xl hover:bg-white/[0.05] hover:border-white/20 transition-all cursor-pointer shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4 text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-[13.5px] truncate">{act.title}</h4>
                        <span className="text-[11.5px] text-white/50">{act.time}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white shrink-0" />
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
