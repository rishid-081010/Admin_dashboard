import React, { useState, useEffect } from 'react';
import { 
  Database, PhoneCall, Flame, Bot, CheckCircle2, 
  Activity, ChevronRight, ArrowRight, RefreshCw, Zap,
  Building2, Radio, ExternalLink, ChevronDown, Check,
  Phone, MessageSquare
} from 'lucide-react';
import { fetchVoiceOverview, fetchImmediateActivities, fetchTotalLeadsCount, markLeadAsCompleted } from '../utils/voiceAgentService';
import { fetchN8nWorkflows } from '../utils/n8nService';
import N8nLogo from './N8nLogo';

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

  const handleCompleteLead = async (leadId, phone, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Optimistically remove from state immediately
    setImmediateActivities(prev => prev.filter(act => act.id !== leadId));
    try {
      await markLeadAsCompleted(leadId, phone);
    } catch (err) {
      console.warn('Failed to mark lead as completed:', err);
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
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1c2e42]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Immediate Action Required
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                High-intent qualified leads awaiting senior broker contact or mandate agreement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {loadingActivities ? 'Syncing...' : `${immediateActivities.length} Hot Leads · No Action Performed Yet`}
            </span>
            <button
              onClick={() => onNavigate && onNavigate('voice')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#06111e] border border-[#1b2b3d] hover:bg-[#091728] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of immediate hot leads */}
        {loadingActivities ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 bg-[#06111e] border border-[#1a2c42] rounded-2xl animate-pulse h-52 flex flex-col justify-between">
                <div>
                  <div className="h-5 bg-slate-800 rounded w-2/3 mb-3"></div>
                  <div className="h-4 bg-slate-800/60 rounded w-1/2 mb-4"></div>
                  <div className="h-14 bg-slate-800/40 rounded-xl w-full"></div>
                </div>
                <div className="h-8 bg-slate-800/40 rounded-lg w-full mt-3"></div>
              </div>
            ))}
          </div>
        ) : immediateActivities.length === 0 ? (
          <div className="p-12 text-center bg-[#06111e] border border-[#1a2c42] rounded-2xl text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mb-1" />
            <p className="font-semibold text-white">All Clear — No Pending Action Required</p>
            <p className="text-xs text-slate-400">All hot leads have been handled or moved to next pipeline stages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {immediateActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => onNavigate && onNavigate(act.targetTab || 'voice')}
                className="p-6 bg-[#081322] border border-[#1d3047] rounded-2xl hover:border-[#33537b] hover:bg-[#0b1a2e] transition-all cursor-pointer flex flex-col justify-between gap-4 group shadow-lg shadow-black/20"
              >
                <div>
                  {/* Row 1: Property Name & Action Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-white text-base sm:text-[17px] leading-snug group-hover:text-blue-300 transition-colors tracking-tight" title={act.title}>
                      {act.title}
                    </h4>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border shrink-0 tracking-wide shadow-sm ${act.badgeStyle}`}>
                      {act.badge}
                    </span>
                  </div>

                  {/* Row 2: Owner Details & Pending Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                    <div className="text-sm text-amber-200/90 font-semibold" title={act.subtitle}>
                      {act.subtitle}
                    </div>
                    <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-md font-mono shrink-0 flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      No Action Yet
                    </span>
                  </div>

                  {/* Row 3: Spacious Lead Summary Box */}
                  <div className="p-4 rounded-xl bg-[#050d18] border border-[#16273c] text-[13px] sm:text-[13.5px] text-slate-200 leading-relaxed font-normal shadow-inner">
                    {act.description}
                  </div>
                </div>

                {/* Row 4: Footer with Agent & Generous Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-[#1a2c42]">
                  <span className="text-slate-400 flex items-center gap-2 font-mono text-xs">
                    <Bot className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{act.agent}</span>
                  </span>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {act.cleanPhone && (
                      <a
                        href={`https://wa.me/${act.cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Send WhatsApp message"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {act.phone && (
                      <a
                        href={`tel:${act.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Call owner directly"
                        className="px-3.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>Call</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleCompleteLead(act.id, act.phone, e)}
                      title="Mark as completed & remove from queue"
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-emerald-500/25 hover:border-emerald-500/40 hover:text-emerald-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 text-xs font-semibold transition-all group/done shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-slate-400 group-hover/done:text-emerald-400 transition-colors shrink-0" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 4. VOICE AGENTS ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Voice Agents
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                AI outbound acquisition dialers screening owner registries and booking qualified callbacks
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('voice')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all shadow-md self-start sm:self-auto"
          >
            <span>View all dialers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Agent 1: Sarah */}
          <div 
            onClick={() => onNavigate && onNavigate('voice')}
            className="p-7 bg-[#0c1829] border border-[#233549] rounded-2xl hover:border-[#385175] transition-all cursor-pointer shadow-xl shadow-black/40 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 text-base font-bold shadow-inner">
                    1
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-300 transition-colors tracking-tight">
                      Sarah
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">Line 1 · Acquisition Specialist</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {voiceData.agent1.health}
                </span>
              </div>

              {/* Metric Box */}
              <div className="my-4 p-4 rounded-xl bg-[#06101c] border border-[#16273c]">
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                  {voiceData.agent1.callsToday.toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">
                  Calls Dialed Today
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1a2c42] flex items-center justify-between text-xs sm:text-sm text-blue-300 font-semibold group-hover:text-blue-200 transition-colors">
              <span>Inspect Call Activity</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Agent 2: James */}
          <div 
            onClick={() => onNavigate && onNavigate('voice')}
            className="p-7 bg-[#0c1829] border border-[#233549] rounded-2xl hover:border-[#385175] transition-all cursor-pointer shadow-xl shadow-black/40 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 text-base font-bold shadow-inner">
                    2
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition-colors tracking-tight">
                      James
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">Line 2 · Investor Outreach</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {voiceData.agent2.health}
                </span>
              </div>

              {/* Metric Box */}
              <div className="my-4 p-4 rounded-xl bg-[#06101c] border border-[#16273c]">
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                  {voiceData.agent2.callsToday.toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">
                  Calls Dialed Today
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1a2c42] flex items-center justify-between text-xs sm:text-sm text-purple-300 font-semibold group-hover:text-purple-200 transition-colors">
              <span>Inspect Call Activity</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Agent 3: Aisha */}
          <div 
            onClick={() => onNavigate && onNavigate('voice')}
            className="p-7 bg-[#0c1829] border border-[#233549] rounded-2xl hover:border-[#385175] transition-all cursor-pointer shadow-xl shadow-black/40 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-base font-bold shadow-inner">
                    3
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors tracking-tight">
                      Aisha
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">Line 3 · Prime Specialist</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {voiceData.agent3.health}
                </span>
              </div>

              {/* Metric Box */}
              <div className="my-4 p-4 rounded-xl bg-[#06101c] border border-[#16273c]">
                <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                  {voiceData.agent3.callsToday.toLocaleString()}
                </div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">
                  Calls Dialed Today
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1a2c42] flex items-center justify-between text-xs sm:text-sm text-emerald-300 font-semibold group-hover:text-emerald-200 transition-colors">
              <span>Inspect Call Activity</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. AUTOMATED WORKFLOWS ─────────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1c2e42]">
          <div className="flex items-center gap-3">
            {/* n8n Official Brand Logo in place of generic pulse icon (Image 2 & 3) */}
            <div className="p-2.5 rounded-xl bg-[#ff6d5a]/15 border border-[#ff6d5a]/30 shadow-sm shadow-[#ff6d5a]/10 flex items-center justify-center shrink-0">
              <N8nLogo className="w-5 h-5" color="#FF6D5A" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Automated Workflows
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md bg-[#ff6d5a]/15 text-[#ff6d5a] border border-[#ff6d5a]/30 tracking-wider">
                  n8n engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live background n8n pipelines syncing CRM deals, updating logs, and routing alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs px-3 py-1.5 rounded-full bg-[#ff6d5a]/10 text-orange-300 border border-[#ff6d5a]/25 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff6d5a] animate-pulse"></span>
              {loadingN8n ? 'Syncing...' : `${n8nData.summary.activeWorkflows} Active · ${n8nData.summary.totalExecutionsToday} Runs Today`}
            </span>
            <button
              onClick={() => onNavigate && onNavigate('workflows')}
              className="px-3.5 py-1.5 rounded-xl bg-[#141d28] hover:bg-[#1a2535] border border-[#26374a] hover:border-[#ff6d5a]/40 text-slate-200 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Open Workflows Sidetab"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="https://n8n.asquared.ae"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-[#ff6d5a] hover:bg-[#ff553d] text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#ff6d5a]/25 cursor-pointer"
              title="Open n8n Console"
            >
              <span>n8n Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Active Workflows Grid */}
        {loadingN8n ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 bg-[#06111e] border border-[#1a2c42] rounded-2xl animate-pulse h-28"></div>
            ))}
          </div>
        ) : n8nData.workflows.length === 0 ? (
          <div className="p-8 text-center bg-[#06111e] border border-[#1a2c42] rounded-2xl text-slate-400 text-sm">
            No workflows found.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
              {(showAllWorkflows ? n8nData.workflows : n8nData.workflows.slice(0, 8)).map((wf) => (
                <a
                  key={wf.id}
                  href={wf.n8nUrl || `https://n8n.asquared.ae/workflow/${wf.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-5 sm:p-5.5 bg-[#0b1522] hover:bg-[#0f1d2e] border border-[#1d3047] hover:border-[#ff6d5a]/50 rounded-2xl flex flex-col justify-between gap-3.5 transition-all shadow-md group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        wf.status === 'healthy' 
                          ? 'bg-[#ff6d5a]/10 border-[#ff6d5a]/25 text-[#ff6d5a]' 
                          : wf.status === 'running'
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : wf.status === 'error'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>
                        <N8nLogo className="w-5 h-5" color={wf.status === 'error' ? '#f43f5e' : '#FF6D5A'} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-white text-sm sm:text-base font-bold leading-snug group-hover:text-orange-300 transition-colors break-words" title={wf.name}>
                          {wf.name}
                        </h4>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                          <span>Last run: {formatTimeAgo(wf.lastExecutedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shrink-0 shadow-sm ${
                      wf.status === 'healthy'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : wf.status === 'running'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : wf.status === 'error'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        wf.status === 'healthy' ? 'bg-emerald-400 animate-pulse' :
                        wf.status === 'running' ? 'bg-blue-400 animate-pulse' :
                        wf.status === 'error' ? 'bg-rose-400' : 'bg-slate-400'
                      }`} />
                      <span className="capitalize">{wf.status || 'Active'}</span>
                    </div>
                  </div>

                  {/* Workflow Execution Stats & Link Footer */}
                  <div className="pt-3 border-t border-[#18283a] flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-mono font-medium flex items-center gap-2">
                      <span className="text-white font-bold">{wf.executionsToday}</span> runs today
                      <span className="text-slate-500">·</span>
                      <span className="text-emerald-400">{wf.successToday > 0 ? `${wf.successToday} ok` : 'standby'}</span>
                    </span>
                    <span className="text-[#ff6d5a] group-hover:text-orange-300 font-semibold flex items-center gap-1 transition-colors">
                      <span>Open workflow</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {n8nData.workflows.length > 8 && (
              <div className="mt-5 text-center">
                <button
                  onClick={() => setShowAllWorkflows(!showAllWorkflows)}
                  className="px-5 py-2.5 rounded-xl bg-[#06111e] border border-[#1a2c42] hover:bg-[#091728] hover:border-[#ff6d5a]/40 text-xs font-semibold text-slate-300 hover:text-white transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>{showAllWorkflows ? 'Show Less' : `Show All (${n8nData.workflows.length})`}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAllWorkflows ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
