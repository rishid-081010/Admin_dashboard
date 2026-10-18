import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mic, Activity, PhoneOff, PhoneOutgoing, Clock, 
  Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Play, User, RefreshCw
} from 'lucide-react';
import VoiceDateFilter from './VoiceDateFilter';
import VoiceAuditDownload from './VoiceAuditDownload';
import VoiceAgent360 from './VoiceAgent360';
import { fetchVoiceOverview } from '../utils/voiceAgentService';

function getDubaiToday() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

export default function VoiceAgent() {
  const initialToday = useMemo(() => getDubaiToday(), []);
  const initialParts = useMemo(() => {
    const [y, m] = initialToday.split('-').map(Number);
    return { year: y || 2026, month: m || 10 };
  }, [initialToday]);

  const [timeFilter, setTimeFilter] = useState('Daily');
  const [selectedDate, setSelectedDate] = useState(initialToday); // Dynamically live today calls in Dubai
  const [selectedYear, setSelectedYear] = useState(initialParts.year);
  const [selectedMonth, setSelectedMonth] = useState(initialParts.month);
  const [selectedWeek, setSelectedWeek] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [selectedAgentFor360, setSelectedAgentFor360] = useState(null);

  // Fetch real data from Supabase whenever date filters change
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchVoiceOverview({
        timeFilter,
        selectedDate,
        selectedYear,
        selectedMonth,
        selectedWeek
      });
      setOverviewData(res);
    } catch (err) {
      console.error('Failed to load voice overview from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter, selectedDate, selectedYear, selectedMonth, selectedWeek]);

  const filterParams = useMemo(() => ({
    timeFilter, selectedDate, selectedYear, selectedMonth, selectedWeek
  }), [timeFilter, selectedDate, selectedYear, selectedMonth, selectedWeek]);

  // If user opened an Agent's 360 view
  if (selectedAgentFor360) {
    return (
      <VoiceAgent360 
        agent={selectedAgentFor360}
        filterParams={filterParams}
        onBack={() => setSelectedAgentFor360(null)}
      />
    );
  }

  const agents = overviewData?.agents || [];
  const callsCount = overviewData?.totalCalls || (loading ? '—' : '0');
  const dropsCount = overviewData?.drops || (loading ? '—' : '0');
  const leadsCount = overviewData?.qualifiedLeads || (loading ? '—' : '0');
  const durationStr = overviewData?.avgDuration || (loading ? '—' : '0s');

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      {/* ─── Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Live Telephony Intelligence
            </span>
            <span className="text-[10px] text-white/40 font-mono">
              Supabase Cluster (85,973+ verified calls)
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Voice Agent Centre
          </h1>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── Filter & Audit Download Controls (Side-by-Side) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
        <VoiceDateFilter
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          activeLabel={overviewData?.label}
          loading={loading}
        />

        <VoiceAuditDownload
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </div>

      {/* ─── 4 Hero KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Calls Placed */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all relative overflow-hidden">
          <PhoneOutgoing className="w-6 h-6 text-blue-400 mb-3" />
          <div className="text-xs font-medium text-slate-400 mb-1">Calls Placed</div>
          <div className="text-3xl font-bold text-white transition-all font-mono">
            {callsCount}
          </div>
        </div>

        {/* Card 2: Drops & Unanswered */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all relative overflow-hidden">
          <PhoneOff className="w-6 h-6 text-red-400 mb-3" />
          <div className="text-xs font-medium text-slate-400 mb-1">Voicemails &amp; Drops</div>
          <div className="text-3xl font-bold text-white transition-all font-mono">
            {dropsCount}
          </div>
        </div>

        {/* Card 3: Qualified Leads */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all relative overflow-hidden">
          <Activity className="w-6 h-6 text-emerald-400 mb-3" />
          <div className="text-xs font-medium text-slate-400 mb-1">Qualified Leads</div>
          <div className="text-3xl font-bold text-emerald-400 transition-all font-mono">
            {leadsCount}
          </div>
        </div>

        {/* Card 4: Avg Call Duration */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all relative overflow-hidden">
          <Clock className="w-6 h-6 text-purple-400 mb-3" />
          <div className="text-xs font-medium text-slate-400 mb-1">Average Duration</div>
          <div className="text-3xl font-bold text-white transition-all font-mono">
            {durationStr}
          </div>
        </div>
      </div>

      {/* ─── 3 Real Voice Agents Section ───────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 relative flex flex-col p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white text-base">
            Voice Agents
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <div 
              key={agent.id}
              onClick={() => setSelectedAgentFor360(agent)}
              className="border border-[#1b2b3d] hover:border-[#385175] rounded-2xl p-5 bg-[#06111e] hover:bg-[#102035] transition-all cursor-pointer group flex flex-col justify-between hover:shadow-xl shadow-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-colors pointer-events-none"></div>

              <div>
                {/* Agent Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.avatarBg} border ${agent.borderColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Mic className={`w-7 h-7 ${agent.textColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-bold text-base leading-tight truncate group-hover:text-blue-300 transition-colors">
                        {agent.name}
                      </h4>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{agent.role}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                      <span>{agent.line}</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="space-y-2.5 pt-3 border-t border-[#1b2b3d]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Calls Handled:</span>
                    <span className="text-white font-bold font-mono">{agent.calls}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Lead Conversion:</span>
                    <span className="text-emerald-400 font-bold font-mono">{agent.cvr}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Avg Duration:</span>
                    <span className="text-purple-300 font-mono">{agent.avgDuration}</span>
                  </div>
                </div>
              </div>

              {/* Call to action button */}
              <div className="mt-4 pt-3 border-t border-[#1b2b3d] flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                <span>View Agent 360</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Recent Sample Calls Stream ────────────────────────────── */}
      {overviewData?.sampleCalls && overviewData.sampleCalls.length > 0 && (
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-sm">Recent Outbound Calls Stream</h3>
              <p className="text-xs text-slate-400">Showing latest calls from active date scope</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[300px] custom-scrollbar border border-[#1b2b3d] rounded-xl bg-[#06111e]">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-[#071322] text-slate-400 uppercase font-mono text-[10px] sticky top-0 border-b border-[#233549]">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Owner Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3 text-center">Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {overviewData.sampleCalls.slice(0, 15).map((call) => {
                  const agentInfo = agents.find(a => a.id === call.assistantId) || { name: 'Voice Bot' };
                  return (
                    <tr 
                      key={call.id}
                      onClick={() => {
                        const targetAgent = agents.find(a => a.id === call.assistantId) || agents[0];
                        setSelectedAgentFor360(targetAgent);
                      }}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 font-mono text-white/50 whitespace-nowrap">
                        {call.created_at ? new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-2 px-3 font-medium text-white whitespace-nowrap">
                        {call.customer_name || 'Property Owner'}
                      </td>
                      <td className="py-2 px-3 font-mono text-white/70 whitespace-nowrap">
                        {call.customer_phone || '—'}
                      </td>
                      <td className="py-2 px-3 text-blue-400 font-semibold whitespace-nowrap">
                        {agentInfo.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-center text-white/60 whitespace-nowrap">
                        {call.duration_seconds ? `${call.duration_seconds}s` : '0s'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/5 text-white/60">
                          {call.status || 'ended'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
