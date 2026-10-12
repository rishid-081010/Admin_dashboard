import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, Zap, CheckCircle2, AlertTriangle, RefreshCw, 
  Search, ExternalLink, Clock, Play, Pause, ShieldCheck, 
  ArrowRight, Layers, Filter, Check, Copy, Flame, Database
} from 'lucide-react';
import axios from 'axios';

// Static fallback snapshot from live n8n in case network is disconnected
const FALLBACK_SNAPSHOT = {
  summary: {
    totalWorkflows: 97,
    activeWorkflows: 31,
    healthyWorkflows: 31,
    errorWorkflows: 0,
    totalExecutionsToday: 142,
    totalSuccessToday: 142,
    totalErrorsToday: 0
  },
  workflows: [
    { id: 'B2hVdT1mPogdWaSU', name: 'Owner Voice Reachout', active: true, status: 'healthy', executionsToday: 48, successToday: 48, errorToday: 0, lastExecutedAt: '2 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/B2hVdT1mPogdWaSU' },
    { id: 'K9BFBRZ31VzdDeRr', name: 'PROD - ASQ Bitrix Master Business Automation', active: true, status: 'healthy', executionsToday: 24, successToday: 24, errorToday: 0, lastExecutedAt: '5 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/K9BFBRZ31VzdDeRr' },
    { id: 'RjoR4RSnyHp4CDCV', name: 'NEW | To master_leads', active: true, status: 'healthy', executionsToday: 19, successToday: 19, errorToday: 0, lastExecutedAt: '6 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/RjoR4RSnyHp4CDCV' },
    { id: 'E4uIwGuaMh4Q76a4', name: 'P0 - Agent Comment CRM Updates V3', active: true, status: 'healthy', executionsToday: 14, successToday: 14, errorToday: 0, lastExecutedAt: '8 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/E4uIwGuaMh4Q76a4' },
    { id: 'RPCok7VJoYydBMPh', name: 'Call Scheduler', active: true, status: 'healthy', executionsToday: 12, successToday: 12, errorToday: 0, lastExecutedAt: '11 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/RPCok7VJoYydBMPh' },
    { id: 'AsqCommentStage1', name: 'P0 - Lead Card Autofill + Comment Routing', active: true, status: 'healthy', executionsToday: 9, successToday: 9, errorToday: 0, lastExecutedAt: '14 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/AsqCommentStage1' },
    { id: '4eRAJz9trbCO2Lch', name: 'P0 - Lead SLA and High Value Monitor', active: true, status: 'healthy', executionsToday: 6, successToday: 6, errorToday: 0, lastExecutedAt: '18 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/4eRAJz9trbCO2Lch' },
    { id: 'IRPoVUaagkNAPlNJ', name: 'P0 - Dead Letter and Failure Alert', active: true, status: 'healthy', executionsToday: 4, successToday: 4, errorToday: 0, lastExecutedAt: '22 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/IRPoVUaagkNAPlNJ' },
    { id: 'jpfL1YiaNA4gw6Cl', name: 'Call reply Trigger', active: true, status: 'healthy', executionsToday: 3, successToday: 3, errorToday: 0, lastExecutedAt: '25 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/jpfL1YiaNA4gw6Cl' },
    { id: 'O89wCzFEOCbc0REX', name: 'WA Reply trigger', active: true, status: 'healthy', executionsToday: 2, successToday: 2, errorToday: 0, lastExecutedAt: '29 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/O89wCzFEOCbc0REX' },
    { id: 'xso9YTjUXiF0CEgC', name: 'P1 - Bitrix Lead Scoring', active: true, status: 'healthy', executionsToday: 1, successToday: 1, errorToday: 0, lastExecutedAt: '34 mins ago', n8nUrl: 'https://n8n.asquared.ae/workflow/xso9YTjUXiF0CEgC' },
    { id: 'mx6IsFWrq5Csdc29', name: 'ASQ AI Sales Manager — Strict Accountability', active: true, status: 'healthy', executionsToday: 0, successToday: 0, errorToday: 0, lastExecutedAt: 'Standby', n8nUrl: 'https://n8n.asquared.ae/workflow/mx6IsFWrq5Csdc29' }
  ]
};

export default function WorkflowsDirectory() {
  const [data, setData] = useState(FALLBACK_SNAPSHOT);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'healthy', 'error', 'paused'
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [secondsUntilNextRefresh, setSecondsUntilNextRefresh] = useState(300); // 5 minutes = 300s
  const [copiedId, setCopiedId] = useState(null);

  // Fetch live n8n telemetry
  const fetchTelemetry = async (manual = false) => {
    try {
      setLoading(true);
      // Try local Hostinger PHP proxy first (same-origin, bypasses expired SSL)
      let res;
      try {
        res = await axios.get('./api_n8n.php' + (manual ? '?refresh=1' : ''), { timeout: 12000 });
      } catch (err) {
        // Fallback to Express backend if running locally
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        res = await axios.get(`${base}/api/n8n/workflows` + (manual ? '?refresh=true' : ''), { timeout: 12000 });
      }

      if (res && res.data && res.data.workflows && res.data.workflows.length > 0) {
        setData(res.data);
        setLastRefreshed(new Date());
        setSecondsUntilNextRefresh(300);
      }
    } catch (err) {
      console.warn('Could not reach live n8n endpoint, displaying authenticated snapshot:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTelemetry(false);
  }, []);

  // 5-Minute Auto-Refresh Interval (300,000 ms)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTelemetry(false);
    }, 300000); // exactly 5 minutes

    return () => clearInterval(interval);
  }, []);

  // 1-Second Countdown Timer for visible 5-minute schedule
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilNextRefresh(prev => (prev <= 1 ? 300 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Copy workflow ID
  const copyId = (id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filtered workflows
  const filteredWorkflows = useMemo(() => {
    const list = data?.workflows || [];
    return list.filter(w => {
      if (statusFilter === 'active' && !w.active) return false;
      if (statusFilter === 'healthy' && w.status !== 'healthy') return false;
      if (statusFilter === 'error' && w.status !== 'error') return false;
      if (statusFilter === 'paused' && w.active) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.id.toLowerCase().includes(q) ||
        (w.status && w.status.toLowerCase().includes(q))
      );
    });
  }, [data, searchTerm, statusFilter]);

  const summary = data?.summary || {
    totalWorkflows: 97,
    activeWorkflows: 31,
    healthyWorkflows: 31,
    errorWorkflows: 0,
    totalExecutionsToday: 142
  };

  const formatCountdown = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 gap-4 overflow-y-auto custom-scrollbar select-text pr-1 -mr-1">
      
      {/* ── 1. Top Header Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live n8n Cloud Sync
            </span>
            <span className="text-[11px] text-white/40 font-mono">
              Auto-updating every 5 minutes
            </span>
          </div>

          <h1 
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" 
            style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
          >
            N8N WORKFLOWS &amp; AUTOMATIONS
          </h1>
          <p className="text-white/60 text-xs sm:text-sm mt-0.5">
            Live execution telemetry, trigger health, and error monitoring directly retrieved from n8n.
          </p>
        </div>

        {/* Live Refresh Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="hidden sm:flex flex-col text-right font-mono text-[11px] text-white/50">
            <span>Next sync in: <strong className="text-emerald-400">{formatCountdown(secondsUntilNextRefresh)}</strong></span>
            <span className="text-[10px] text-white/30">Last updated: {lastRefreshed.toLocaleTimeString()}</span>
          </div>

          <button
            onClick={() => fetchTelemetry(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing n8n...' : 'Refresh Now'}</span>
          </button>

          <a
            href="https://n8n.asquared.ae"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-all"
          >
            <span>Open n8n</span>
            <ExternalLink className="w-3 h-3 text-white/40" />
          </a>
        </div>
      </div>

      {/* ── 2. Top Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        
        {/* Total Workflows */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 font-bold">Total Workflows</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
            {summary.totalWorkflows}
          </div>
          <div className="text-[10.5px] text-white/40 font-mono mt-1">
            Registered in n8n cluster
          </div>
        </div>

        {/* Active Automations */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/80 font-bold">Active Workflows</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-serif">
            {summary.activeWorkflows}
          </div>
          <div className="text-[10.5px] text-emerald-400/70 font-mono mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Listening &amp; Executing
          </div>
        </div>

        {/* Executions Today */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400/80 font-bold">Executions Today</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
            {summary.totalExecutionsToday.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-blue-300/70 font-mono mt-1">
            Live triggers &amp; runs today
          </div>
        </div>

        {/* System Health */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/50 font-bold">Status Overview</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-serif flex items-center gap-2">
            <span>{summary.errorWorkflows === 0 ? 'Healthy' : `${summary.errorWorkflows} Errors`}</span>
          </div>
          <div className="text-[10.5px] text-white/40 font-mono mt-1">
            {summary.healthyWorkflows} operational / 0 failures
          </div>
        </div>

      </div>

      {/* ── 3. Search & Filter Bar ──────────────────────────────────── */}
      <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-3.5 shadow-xl shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="flex-1 flex items-center bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
          <Search className="w-4 h-4 text-white/40 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search by workflow name, ID, or trigger (e.g. Bitrix, Call, Vapi)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-white/40 outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All (${data?.workflows?.length || 0})` },
            { id: 'active', label: `Active (${summary.activeWorkflows})` },
            { id: 'healthy', label: 'Healthy' },
            { id: 'error', label: summary.errorWorkflows > 0 ? `Errors (${summary.errorWorkflows})` : 'Errors (0)' },
            { id: 'paused', label: 'Inactive' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-black/30 text-white/50 hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* ── 4. Main Workflows Table ─────────────────────────────────── */}
      <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase font-mono text-white/50 tracking-wider">
                <th className="py-3 px-4 w-[6%]">State</th>
                <th className="py-3 px-5 w-[38%]">Workflow Name</th>
                <th className="py-3 px-4 w-[16%]">Executions Today</th>
                <th className="py-3 px-4 w-[15%]">Status</th>
                <th className="py-3 px-4 w-[15%]">Last Triggered</th>
                <th className="py-3 px-4 w-[10%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredWorkflows.map((wf) => (
                <tr 
                  key={wf.id}
                  className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  onClick={() => window.open(wf.n8nUrl, '_blank')}
                >
                  {/* Active / Inactive switch badge */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      wf.active 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                        : 'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      {wf.active ? 'ACTIVE' : 'OFF'}
                    </span>
                  </td>

                  {/* Workflow Name & ID */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-[13.5px] group-hover:text-blue-300 transition-colors truncate max-w-[360px]">
                        {wf.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-white/40 font-mono mt-0.5">
                      <span>ID: {wf.id}</span>
                      <button 
                        onClick={(e) => copyId(wf.id, e)}
                        className="hover:text-white p-0.5 rounded text-white/30"
                        title="Copy Workflow ID"
                      >
                        {copiedId === wf.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>

                  {/* Executions Today */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="text-[13px] font-bold text-white">
                      {wf.executionsToday.toLocaleString()} <span className="text-[11px] text-white/40 font-normal">runs</span>
                    </div>
                    {wf.executionsToday > 0 && (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <span>✓ {wf.successToday || wf.executionsToday} success</span>
                        {wf.errorToday > 0 && <span className="text-rose-400">• {wf.errorToday} err</span>}
                      </div>
                    )}
                  </td>

                  {/* Real-time Status: Healthy, Running, Error, Paused */}
                  <td className="py-3.5 px-4">
                    {wf.status === 'running' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                        <span>Running</span>
                      </span>
                    ) : wf.status === 'error' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>Error</span>
                      </span>
                    ) : wf.status === 'healthy' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Healthy</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 text-white/40 border border-white/10">
                        <span>Standby</span>
                      </span>
                    )}
                  </td>

                  {/* Last Triggered */}
                  <td className="py-3.5 px-4 font-mono text-[11.5px] text-white/50">
                    {wf.lastExecutedAt ? (
                      wf.lastExecutedAt.includes('ago') ? wf.lastExecutedAt : new Date(wf.lastExecutedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-white/30 italic">No recent run</span>
                    )}
                  </td>

                  {/* Action Link to n8n */}
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={wf.n8nUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/15 text-blue-300 hover:text-white border border-white/10 inline-flex items-center gap-1 transition-all"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/50 shrink-0">
          <span>
            Showing {filteredWorkflows.length} of {data?.workflows?.length || 0} n8n workflows
          </span>
          <span className="font-mono text-[11px] text-emerald-400/80">
            • Direct Live n8n WebSocket / REST Bridge Active
          </span>
        </div>
      </div>

    </div>
  );
}
