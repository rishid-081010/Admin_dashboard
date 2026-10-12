import React, { useState, useEffect } from 'react';
import { 
  Database, PhoneCall, Flame, Bot, CheckCircle2, 
  Activity, ChevronRight, ArrowRight, RefreshCw, Zap,
  Building2, Radio, ExternalLink, ChevronDown, Check,
  Phone, MessageSquare
} from 'lucide-react';
import { fetchVoiceOverview, fetchImmediateActivities, fetchTotalLeadsCount } from '../utils/voiceAgentService';
import { fetchN8nWorkflows } from '../utils/n8nService';

export default function OverviewDashboard({ onNavigate }) {
  const getTodayDubai = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());

  const [selectedDate, setSelectedDate] = useState(getTodayDubai());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalLeadsCount, setTotalLeadsCount] = useState(3042722);
  const [voiceData, setVoiceData] = useState({
    totalCallsToday: 0,
    answeredCallsToday: 0,
    qualifiedLeadsToday: 0,
    agent1: { name: 'Sarah', role: 'AI Acquisition Specialist', callsToday: 0, health: 'Active Running' },
    agent2: { name: 'James', role: 'Portfolio & Investor Outreach', callsToday: 0, health: 'Active Running' },
    agent3: { name: 'Aisha', role: 'Prime Community Specialist', callsToday: 0, health: 'Standby' }
  });

  // Live Immediate Activities from Supabase
  const [immediateActivities, setImmediateActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Live n8n Workflows
  const [n8nData, setN8nData] = useState({
    summary: { activeWorkflows: 0, totalExecutionsToday: 0, healthyWorkflows: 0, errorWorkflows: 0 },
    workflows: []
  });
  const [loadingN8n, setLoadingN8n] = useState(true);
  const [showAllWorkflows, setShowAllWorkflows] = useState(false);

  const formatTimeAgo = (isoDate) => {
    if (!isoDate) return 'Awaiting trigger';
    const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const updateVoiceStats = (res) => {
    if (!res) return;
    const agents = res.agents || [];
    const sAgent = agents.find(a => a.id === '682cf6ae-23fd-44f3-a4a3-756998cd62c1') || {};
    const jAgent = agents.find(a => a.id === '91732d4e-3b60-4950-8aa6-4060c0803119') || {};
    const aAgent = agents.find(a => a.id === 'f99e8e9a-48b1-411f-806e-6cb7d1dde58b') || {};
    const parseNum = (val, fallback = 0) => {
      if (typeof val === 'number') return isNaN(val) ? fallback : val;
      if (typeof val === 'string') {
        const parsed = parseInt(val.replace(/,/g, ''), 10);
        return isNaN(parsed) ? fallback : parsed;
      }
      return fallback;
    };

    const totalCallsNum = res.rawTotalCalls ?? parseNum(res.totalCalls, 0);
    const answeredCallsNum = res.rawAnsweredCalls ?? parseNum(res.answeredCalls, Math.round(totalCallsNum * 0.48));
    const qualifiedLeadsNum = res.rawQualifiedLeads ?? parseNum(res.qualifiedLeads, 0);

    const sCalls = sAgent.rawCalls ?? parseNum(sAgent.calls, 0);
    const jCalls = jAgent.rawCalls ?? parseNum(jAgent.calls, 0);
    const aCalls = aAgent.rawCalls ?? parseNum(aAgent.calls, 0);

    setVoiceData({
      totalCallsToday: totalCallsNum,
      answeredCallsToday: answeredCallsNum,
      qualifiedLeadsToday: qualifiedLeadsNum,
      agent1: {
        name: 'Sarah',
        role: 'AI Acquisition Specialist',
        callsToday: sCalls,
        health: sCalls > 0 ? 'Active Running' : 'Standby'
      },
      agent2: {
        name: 'James',
        role: 'Portfolio & Investor Outreach',
        callsToday: jCalls,
        health: jCalls > 0 ? 'Active Running' : 'Standby'
      },
      agent3: {
        name: 'Aisha',
        role: 'Prime Community Specialist',
        callsToday: aCalls,
        health: aCalls > 0 ? 'Active Running' : 'Standby'
      }
    });
  };

  const loadAllTelemetry = async () => {
    try {
      setLoading(true);
      const [resVoice, resActivities, resN8n, resLeadsCount] = await Promise.allSettled([
        fetchVoiceOverview({ timeFilter: 'Daily', selectedDate }),
        fetchImmediateActivities(),
        fetchN8nWorkflows(),
        fetchTotalLeadsCount()
      ]);

      if (resVoice.status === 'fulfilled' && resVoice.value) {
        updateVoiceStats(resVoice.value);
      }
      if (resActivities.status === 'fulfilled' && Array.isArray(resActivities.value)) {
        setImmediateActivities(resActivities.value);
      }
      if (resN8n.status === 'fulfilled' && resN8n.value) {
        setN8nData(resN8n.value);
      }
      if (resLeadsCount.status === 'fulfilled' && typeof resLeadsCount.value === 'number') {
        setTotalLeadsCount(resLeadsCount.value);
      }
    } catch (err) {
      console.warn('Error loading live telemetry:', err);
    } finally {
      setLoading(false);
      setLoadingActivities(false);
      setLoadingN8n(false);
    }
  };

  // Fetch live daily telemetry from Supabase & n8n
  useEffect(() => {
    loadAllTelemetry();
  }, [selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllTelemetry();
    } catch (err) {
      console.warn('Failed refreshing telemetry:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 select-text text-white font-sans animate-fade-in pr-1 pb-16">

      {/* ─── 1. TOP HEADER SECTION ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Overview
          </h1>
        </div>
      </div>

      {/* ─── 2. TOP 4 KEY METRIC CARDS (Zero Duplication) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Leads */}
        <div 
          onClick={() => onNavigate && onNavigate('owners')}
          className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40 group hover:border-[#385175] transition-all cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
            TOTAL LEADS
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight my-1.5 font-mono">
            {totalLeadsCount.toLocaleString()}
          </div>
        </div>

        {/* Card 2: Calls Dialed */}
        <div 
          onClick={() => onNavigate && onNavigate('voice')}
          className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40 group hover:border-[#385175] transition-all cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
            CALLS DIALED TODAY
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight my-1.5 font-mono">
            {voiceData.totalCallsToday.toLocaleString()}
          </div>
        </div>

        {/* Card 3: Connected */}
        <div 
          onClick={() => onNavigate && onNavigate('voice')}
          className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40 group hover:border-[#385175] transition-all cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
            CONNECTED CALLS
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight my-1.5 font-mono">
            {Number(voiceData.answeredCallsToday || 0).toLocaleString()}
          </div>
        </div>

        {/* Card 4: Qualified Leads */}
        <div 
          onClick={() => onNavigate && onNavigate('voice')}
          className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40 group hover:border-[#385175] transition-all cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
            QUALIFIED LEADS
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-amber-300 tracking-tight my-1.5 font-mono">
            {voiceData.qualifiedLeadsToday.toLocaleString()}
          </div>
        </div>

      </div>

      {/* ─── 3. IMMEDIATE ACTION REQUIRED ───────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Immediate Action Required
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              {loadingActivities ? 'Syncing...' : `${immediateActivities.length} Qualified Hot Leads`}
            </span>
            <button
              onClick={() => onNavigate && onNavigate('voice')}
              className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#06111e] border border-[#1b2b3d] hover:bg-[#091728] transition-all flex items-center gap-1.5"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* List of immediate hot leads */}
        {loadingActivities ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 bg-[#06111e] border border-[#1a2c42] rounded-xl animate-pulse h-40 flex flex-col justify-between">
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-800/60 rounded w-1/2 mb-2"></div>
                <div className="h-10 bg-slate-800/40 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : immediateActivities.length === 0 ? (
          <div className="p-8 text-center bg-[#06111e] border border-[#1a2c42] rounded-xl text-slate-400 text-xs">
            No pending hot leads requiring human intervention at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {immediateActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => onNavigate && onNavigate(act.targetTab || 'voice')}
                className="p-4 bg-[#06111e] border border-[#1a2c42] rounded-xl hover:border-[#2a4363] hover:bg-[#091728] transition-all cursor-pointer flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-semibold text-white text-xs truncate group-hover:text-blue-300 transition-colors" title={act.title}>
                      {act.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${act.badgeStyle}`}>
                      {act.badge}
                    </span>
                  </div>

                  <div className="text-xs text-amber-200/90 font-medium mb-1.5 truncate" title={act.subtitle}>
                    {act.subtitle}
                  </div>
                  <p className="text-[11.5px] text-slate-300 line-clamp-2 leading-relaxed" title={act.description}>
                    {act.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#1a2c42] text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1 font-mono text-[10.5px]">
                    <Bot className="w-3.5 h-3.5 text-blue-400" /> {act.agent}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    {act.cleanPhone && (
                      <a
                        href={`https://wa.me/${act.cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Send WhatsApp message"
                        className="p-1 px-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 text-[10px] font-medium transition-all"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {act.phone && (
                      <a
                        href={`tel:${act.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Call owner directly"
                        className="p-1 px-1.5 rounded bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 flex items-center gap-1 text-[10px] font-medium transition-all"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 4. VOICE AGENTS ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Voice Agents
            </h2>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('voice')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all shadow-md"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Agent 1: Sarah */}
          <div 
            onClick={() => onNavigate && onNavigate('voice')}
            className="p-6 bg-[#0c1829] border border-[#233549] rounded-2xl hover:border-[#385175] transition-all cursor-pointer shadow-xl shadow-black/40 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xs font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                      Sarah
                    </h4>
                    <span className="text-[10px] text-slate-400">Line 1</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {voiceData.agent1.health}
                </span>
              </div>

              <div className="text-2xl font-black text-white my-2 font-mono">
                {voiceData.agent1.callsToday.toLocaleString()} <span className="text-slate-400 text-xs font-normal">calls today</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1a2c42] flex items-center justify-between text-xs text-blue-300 font-medium">
              <span>View calls</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Agent 2: James */}
          <div 
            onClick={() => onNavigate && onNavigate('voice')}
            className="p-6 bg-[#0c1829] border border-[#233549] rounded-2xl hover:border-[#385175] transition-all cursor-pointer shadow-xl shadow-black/40 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      James
                    </h4>
                    <span className="text-[10px] text-slate-400">Line 2</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {voiceData.agent2.health}
                </span>
              </div>

              <div className="text-2xl font-black text-white my-2 font-mono">
                {voiceData.agent2.callsToday.toLocaleString()} <span className="text-slate-400 text-xs font-normal">calls today</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1a2c42] flex items-center justify-between text-xs text-purple-300 font-medium">
              <span>View calls</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Agent 3: Aisha */}
          <div 
            onClick={() => onNavigate && onNavigate('voice')}
            className="p-6 bg-[#0c1829] border border-[#233549] rounded-2xl hover:border-[#385175] transition-all cursor-pointer shadow-xl shadow-black/40 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-xs font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Aisha
                    </h4>
                    <span className="text-[10px] text-slate-400">Line 3</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {voiceData.agent3.health}
                </span>
              </div>

              <div className="text-2xl font-black text-white my-2 font-mono">
                {voiceData.agent3.callsToday.toLocaleString()} <span className="text-slate-400 text-xs font-normal">calls today</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1a2c42] flex items-center justify-between text-xs text-emerald-300 font-medium">
              <span>View calls</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. AUTOMATED WORKFLOWS ─────────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Automated Workflows
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {loadingN8n ? 'Loading...' : `${n8nData.summary.activeWorkflows} Active · ${n8nData.summary.totalExecutionsToday} Runs Today`}
            </span>
            <a
              href="https://n8n.asquared.ae"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-[#06111e] border border-[#1b2b3d] hover:bg-[#091728] text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Open n8n Console"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Active Workflows Grid */}
        {loadingN8n ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3.5 bg-[#06111e] border border-[#1a2c42] rounded-xl animate-pulse h-20"></div>
            ))}
          </div>
        ) : n8nData.workflows.length === 0 ? (
          <div className="p-6 text-center bg-[#06111e] border border-[#1a2c42] rounded-xl text-slate-400 text-xs">
            No workflows found.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(showAllWorkflows ? n8nData.workflows : n8nData.workflows.slice(0, 8)).map((wf) => (
                <a
                  key={wf.id}
                  href={wf.n8nUrl || `https://n8n.asquared.ae/workflow/${wf.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 bg-[#06111e] border border-[#1a2c42] rounded-xl flex items-center justify-between gap-3 hover:border-[#2a4363] hover:bg-[#091728] transition-all group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                      wf.status === 'healthy' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : wf.status === 'running'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : wf.status === 'error'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white text-xs font-semibold truncate group-hover:text-blue-300 transition-colors" title={wf.name}>
                        {wf.name}
                      </h4>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-2">
                        <span>Last run: {formatTimeAgo(wf.lastExecutedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <div className="text-xs font-bold text-white font-mono">
                        {wf.executionsToday} <span className="text-[10px] text-slate-400 font-normal">runs today</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-mono">
                        {wf.successToday > 0 ? `${wf.successToday} ok` : 'standby'}
                      </div>
                    </div>

                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                      wf.status === 'healthy'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : wf.status === 'running'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : wf.status === 'error'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        wf.status === 'healthy' ? 'bg-emerald-400 animate-pulse' :
                        wf.status === 'running' ? 'bg-blue-400 animate-pulse' :
                        wf.status === 'error' ? 'bg-rose-400' : 'bg-slate-400'
                      }`} />
                      <span className="capitalize">{wf.status || 'Active'}</span>
                    </div>

                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </div>
                </a>
              ))}
            </div>

            {n8nData.workflows.length > 8 && (
              <div className="mt-3.5 text-center">
                <button
                  onClick={() => setShowAllWorkflows(!showAllWorkflows)}
                  className="px-4 py-2 rounded-xl bg-[#06111e] border border-[#1a2c42] hover:bg-[#091728] hover:border-[#2a4363] text-xs font-semibold text-slate-300 hover:text-white transition-all inline-flex items-center gap-1.5"
                >
                  <span>{showAllWorkflows ? 'Show Less' : `Show All (${n8nData.workflows.length})`}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllWorkflows ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
