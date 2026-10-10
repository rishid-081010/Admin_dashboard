import React, { useState } from 'react';
import { Users, Shield, TrendingUp, Search, CheckCircle2 } from 'lucide-react';

export default function TeamManagement() {
  const [invited, setInvited] = useState(false);
  const [managing, setManaging] = useState(null);

  const agents = [
    { name: 'Sarah O\'Connor', role: 'Senior Agent', leads: 145, closed: 12, performance: '94%' },
    { name: 'Mohammed Ali', role: 'Agent', leads: 89, closed: 5, performance: '82%' },
    { name: 'Elena Rodriguez', role: 'Agent', leads: 112, closed: 8, performance: '88%' }
  ];

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-slate-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            TEAM MANAGEMENT
          </h1>
          <p className="text-[#94a3b8] text-[15px]">
            Manage agent roles, lead distribution, and performance metrics.
          </p>
        </div>
        <button 
          onClick={() => setInvited(true)}
          className={`px-5 py-2.5 rounded-[12px] font-semibold transition-all flex items-center gap-2 ${invited ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'}`}
        >
          {invited ? <><CheckCircle2 className="w-4 h-4" /> Invitation Sent</> : '+ Invite Agent'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <div className="text-sm font-medium text-slate-400 mb-1">Total Active Agents</div>
          <div className="text-3xl font-bold text-white">12</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <div className="text-sm font-medium text-slate-400 mb-1">Total Leads Assigned</div>
          <div className="text-3xl font-bold text-white">1,492</div>
        </div>
        <div className="bg-[#0f172a]/60 border border-[#1e293b] rounded-[20px] p-6">
          <div className="text-sm font-medium text-slate-400 mb-1">Avg Team Conversion</div>
          <div className="text-3xl font-bold text-[#10b981]">14.2%</div>
        </div>
      </div>

      <div className="flex-1 bg-[#0f172a]/40 border border-[#1e293b] rounded-[20px] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#1e293b] flex items-center justify-between">
          <h3 className="font-bold text-white">Agent Roster & Performance</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search agents..." className="bg-[#1e293b]/50 border border-[#334155] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]/50 transition-all" />
          </div>
        </div>
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[#0f172a] border-b border-[#1e293b] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Agent</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Active Leads</th>
                <th className="px-6 py-4 font-semibold">Closed Deals</th>
                <th className="px-6 py-4 font-semibold">KPI Score</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {agents.map((agent, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center">{agent.name.charAt(0)}</div>
                    {agent.name}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full text-xs font-semibold">{agent.role}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{agent.leads}</td>
                  <td className="px-6 py-4 text-slate-300">{agent.closed}</td>
                  <td className="px-6 py-4 text-green-400 font-semibold">{agent.performance}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setManaging(i)}
                      className={`font-medium text-sm transition-colors ${managing === i ? 'text-[#3b82f6]' : 'text-slate-400 hover:text-white'}`}
                    >
                      {managing === i ? 'Settings Opened' : 'Manage'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
