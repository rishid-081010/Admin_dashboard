import React from 'react';
import { Users, PhoneCall, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function OverviewDashboard() {
  const kpis = [
    { title: 'Total Unified Owners', value: '2,231,433', icon: <Users className="w-5 h-5 text-blue-400" />, trend: '+12,400 this week' },
    { title: 'Active CRM Leads', value: '119,572', icon: <TrendingUp className="w-5 h-5 text-green-400" />, trend: 'Mapped from Bitrix24' },
    { title: 'AI Voice Calls Made', value: '79,903', icon: <PhoneCall className="w-5 h-5 text-purple-400" />, trend: 'Via Vapi & master_leads' },
    { title: 'Deals Closed (Est)', value: '1,420', icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, trend: '+45 this month' },
  ];

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300 overflow-y-auto pr-2 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            EXECUTIVE OVERVIEW
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            Real-time synchronization across your Database, Bitrix24, and AI Voice Agents.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 hover:bg-[#1e293b]/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/[0.02] rounded-[14px] border border-white/5">
                {kpi.icon}
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">{kpi.title}</h3>
            <div className="text-3xl font-bold text-white mb-2 tracking-tight">{kpi.value}</div>
            <div className="text-xs text-slate-500">{kpi.trend}</div>
          </div>
        ))}
      </div>

      {/* Charts / Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 h-[400px] flex flex-col justify-center items-center text-slate-500">
          <TrendingUp className="w-12 h-12 mb-4 text-slate-600/50" />
          <p>Pipeline Conversion Analytics syncing from Bitrix24...</p>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6 h-[400px] flex flex-col justify-center items-center text-slate-500">
          <Clock className="w-12 h-12 mb-4 text-slate-600/50" />
          <p>Recent API Activity Feed...</p>
        </div>
      </div>
    </div>
  );
}
