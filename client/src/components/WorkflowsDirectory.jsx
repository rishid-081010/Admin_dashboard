import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, RefreshCw, ExternalLink, Check, Copy, 
  ArrowUpDown, Layers, X, Clock, Activity, 
  CheckCircle2, AlertTriangle, Layers3, ChevronLeft, 
  ChevronRight, ChevronDown, Eye, AlertCircle, ShieldAlert,
  Play, Pause, Info, Tag
} from 'lucide-react';
import axios from 'axios';
import initialTelemetry from '../../public/n8n_telemetry.json';

export default function WorkflowsDirectory() {
  const [data, setData] = useState(initialTelemetry || null);
  const [isLive, setIsLive] = useState(false);
  const [isStale, setIsStale] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastProbed, setLastProbed] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'paused', 'executed', 'errors'
  const [folderFilter, setFolderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated'); // 'updated', 'executed', 'errors', 'latency', 'created', 'name-asc', 'name-desc', 'executions'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 15, 25, 50, 100, 'all'
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedDrawerId, setCopiedDrawerId] = useState(false);

  // Fetch live n8n telemetry from API endpoint or static json
  const fetchTelemetry = useCallback(async (manual = false) => {
    try {
      setLoading(true);
      const query = manual ? '?refresh=1&t=' + Date.now() : '?t=' + Date.now();
      const endpoints = [
        './api_n8n.php' + query,
        '/dashboard/api_n8n.php' + query,
        'https://admin.asquared.ae/dashboard/api_n8n.php' + query,
        './n8n_telemetry.json',
        '/dashboard/n8n_telemetry.json',
        'https://admin.asquared.ae/dashboard/n8n_telemetry.json'
      ];

      let fetchedData = null;
      let usedEndpoint = '';

      for (const url of endpoints) {
        try {
          // Fast 4.5-second timeout to avoid UI freeze
          const res = await axios.get(url, { timeout: 4500 });
          if (res?.data?.success && Array.isArray(res.data.workflows) && res.data.workflows.length > 0) {
            fetchedData = res.data;
            usedEndpoint = url;
            break;
          }
        } catch (e) {
          // continue to next endpoint
        }
      }

      setLastProbed(new Date());

      if (fetchedData) {
        setData(fetchedData);
        const liveSource = usedEndpoint.includes('api_n8n.php') && !fetchedData.isStale;
        setIsLive(liveSource);
        setIsStale(!!fetchedData.isStale || usedEndpoint.includes('.json'));
      }
    } catch (err) {
      console.warn('Could not refresh n8n telemetry:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTelemetry(false);
  }, [fetchTelemetry]);

  // 5-Minute Auto-Refresh Interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTelemetry(false);
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, folderFilter, sortBy]);

  // Keyboard escape handler for drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedWorkflow(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Copy workflow ID
  const copyId = (id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const copyDrawerId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedDrawerId(true);
    setTimeout(() => setCopiedDrawerId(false), 1800);
  };

  // Metrics Summary
  const summary = useMemo(() => {
    const workflows = data?.workflows || [];
    const totalWorkflows = workflows.length;
    const activeCount = workflows.filter(w => w.active).length;
    const pausedCount = totalWorkflows - activeCount;
    const executedTodayCount = workflows.filter(w => (w.executionsToday || 0) > 0).length;
    const errorsCount = workflows.filter(w => (w.errorToday || 0) > 0 || w.status === 'error').length;
    const totalExecutionsToday = workflows.reduce((acc, w) => acc + (w.executionsToday || 0), 0);
    const totalSuccessToday = workflows.reduce((acc, w) => acc + (typeof w.successToday === 'number' ? w.successToday : (w.executionsToday || 0)), 0);
    const totalErrorsToday = workflows.reduce((acc, w) => acc + (w.errorToday || 0), 0);

    // True weighted average latency: sum(duration * executions) / sum(executions)
    let totalDurationVolume = 0;
    let totalRunsWithDuration = 0;
    workflows.forEach(w => {
      if (typeof w.avgDurationSec === 'number' && w.avgDurationSec > 0) {
        const runs = Math.max(1, w.executionsToday || 1);
        totalDurationVolume += (w.avgDurationSec * runs);
        totalRunsWithDuration += runs;
      }
    });

    const weightedAvgLatency = totalRunsWithDuration > 0
      ? Number((totalDurationVolume / totalRunsWithDuration).toFixed(2))
      : (data?.summary?.avgRuntimeSec || null);

    const snapshotDate = data?.syncedAt || data?.timestamp || null;

    return {
      totalWorkflows,
      activeCount,
      pausedCount,
      executedTodayCount,
      errorsCount,
      totalExecutionsToday,
      totalSuccessToday,
      totalErrorsToday,
      avgRuntimeSec: weightedAvgLatency,
      snapshotDate
    };
  }, [data]);

  // Dynamic Folders extracted from workflows
  const folders = useMemo(() => {
    const list = data?.workflows || [];
    const counts = {};
    list.forEach(w => {
      const folderName = w.folder || 'General';
      counts[folderName] = (counts[folderName] || 0) + 1;
    });

    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .map(folderName => ({
        name: folderName,
        count: counts[folderName]
      }));
  }, [data]);

  // Filtered & Sorted workflows
  const filteredWorkflows = useMemo(() => {
    let list = (data?.workflows || []).slice();

    // 1. Status Filter
    if (statusFilter === 'active') {
      list = list.filter(w => w.active);
    } else if (statusFilter === 'paused') {
      list = list.filter(w => !w.active);
    } else if (statusFilter === 'executed') {
      list = list.filter(w => (w.executionsToday || 0) > 0);
    } else if (statusFilter === 'errors') {
      list = list.filter(w => (w.errorToday || 0) > 0 || w.status === 'error');
    }

    // 2. Folder Filter
    if (folderFilter !== 'all') {
      list = list.filter(w => (w.folder || 'General') === folderFilter);
    }

    // 3. Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(w => 
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.id && w.id.toLowerCase().includes(q)) ||
        (w.folder && w.folder.toLowerCase().includes(q)) ||
        (Array.isArray(w.tags) && w.tags.some(t => (t.name || t).toLowerCase().includes(q)))
      );
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === 'updated') {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'executed') {
        const timeA = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : 0;
        const timeB = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'errors') {
        return (b.errorToday || 0) - (a.errorToday || 0);
      }
      if (sortBy === 'latency') {
        return (b.avgDurationSec || 0) - (a.avgDurationSec || 0);
      }
      if (sortBy === 'created') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'executions') {
        return (b.executionsToday || 0) - (a.executionsToday || 0);
      }
      return 0;
    });

    return list;
  }, [data, statusFilter, folderFilter, searchTerm, sortBy]);

  // Pagination calculation
  const totalItems = filteredWorkflows.length;
  const effectivePageSize = pageSize === 'all' ? totalItems : Number(pageSize);
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * (pageSize === 'all' ? totalItems : effectivePageSize);
  const endIndex = pageSize === 'all' ? totalItems : Math.min(startIndex + effectivePageSize, totalItems);
  const paginatedWorkflows = useMemo(() => {
    if (pageSize === 'all') return filteredWorkflows;
    return filteredWorkflows.slice(startIndex, endIndex);
  }, [filteredWorkflows, startIndex, endIndex, pageSize]);

  const formatTimeAgo = (isoDate) => {
    if (!isoDate) return 'Awaiting trigger';
    const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    if (diffSec < 2592000) return `${Math.floor(diffSec / 604800)}w ago`;
    return `${Math.floor(diffSec / 2592000)}mo ago`;
  };

  const formatDateTime = (isoDate) => {
    if (!isoDate) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dubai',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(new Date(isoDate)) + ' GST';
    } catch (e) {
      return isoDate;
    }
  };

  const hasActiveFilters = statusFilter !== 'all' || folderFilter !== 'all' || searchTerm.trim() !== '';

  const resetFilters = () => {
    setStatusFilter('all');
    setFolderFilter('all');
    setSearchTerm('');
  };

  // Render compound operational status badge
  const renderStatusBadge = (wf) => {
    const errorCount = wf.errorToday || 0;
    const isError = errorCount > 0 || wf.status === 'error';
    const isRunning = wf.status === 'running';

    if (isError) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25">
          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>Error ({errorCount || 1} failed)</span>
        </span>
      );
    }

    if (isRunning) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono bg-blue-500/10 text-blue-400 border border-blue-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          <span>Running</span>
        </span>
      );
    }

    if (wf.active) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Active</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        <span>Paused</span>
      </span>
    );
  };

  // Generate numbered pagination items
  const renderPageButtons = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const maxButtons = 5;
    let startPage = Math.max(1, safePage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => setCurrentPage(1)}
          className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition-colors ${
            safePage === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="dots-start" className="text-slate-600 text-xs px-0.5">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition-colors ${
            safePage === i ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="dots-end" className="text-slate-600 text-xs px-0.5">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className={`w-7 h-7 rounded-lg text-xs font-mono font-medium transition-colors ${
            safePage === totalPages ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 gap-3.5 overflow-y-auto custom-scrollbar select-text pr-1 -mr-1">
      
      {/* ── 1. Top Header Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              Workflows
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
              isLive 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>{isLive ? 'Live Connected' : 'Cached Snapshot'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational pipeline health, automated triggers, and execution telemetry
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchTelemetry(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0c1829] hover:bg-[#132238] border border-[#233549] text-slate-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer text-xs font-semibold shadow-sm"
            title="Probe telemetry endpoints"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <a
            href="https://n8n.asquared.ae"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c1829] hover:bg-[#132238] text-slate-200 hover:text-white border border-[#233549] text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Open n8n Canvas (Requires Admin Credentials)"
          >
            <span>n8n Canvas (Admin)</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* ── 2. Transparent Offline / Stale Notice Banner ────────────────────────────── */}
      {isStale && (
        <div className="shrink-0 flex items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-300">Cached Telemetry Snapshot: </span>
              <span>
                Displaying operational snapshot recorded on {summary.snapshotDate ? formatDateTime(summary.snapshotDate) : 'Oct 13, 2026'}. 
                Live connection to n8n engine is currently offline or unreachable.
              </span>
            </div>
          </div>
          <button
            onClick={() => fetchTelemetry(true)}
            disabled={loading}
            className="text-[11px] font-semibold text-amber-300 hover:text-white underline cursor-pointer shrink-0 ml-2"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── 3. Top Metric Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
        
        {/* Card 1: Total Workflows */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold">Total Workflows</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
            {summary.totalWorkflows}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {summary.activeCount} active · {summary.pausedCount} paused
          </div>
        </div>

        {/* Card 2: Active Automations */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold">Active Automations</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-1">
            {summary.activeCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Enabled triggers
          </div>
        </div>

        {/* Card 3: Executions Today */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold">Executions Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
            {summary.totalExecutionsToday.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">{summary.totalSuccessToday} successful</span>
            <span>·</span>
            <span className={summary.totalErrorsToday > 0 ? "text-rose-400 font-semibold" : "text-slate-500"}>
              {summary.totalErrorsToday} errors
            </span>
          </div>
        </div>

        {/* Card 4: Average Latency */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold">Average Latency</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
            {summary.avgRuntimeSec ? `${summary.avgRuntimeSec}s` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Weighted execution runtime
          </div>
        </div>

      </div>

      {/* ── 4. Search & Filter Bar ─────────────────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-4 shadow-xl shadow-black/40 shrink-0 flex flex-col gap-3">
        
        {/* Top Filter Row: Search & Status Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search input */}
          <div className="flex-1 flex items-center bg-[#071322] border border-[#1e2f42] rounded-xl px-3.5 py-2 focus-within:border-blue-500/70 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search workflows by name, folder, tag, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-white p-0.5 ml-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: `All (${summary.totalWorkflows})` },
              { id: 'active', label: `Active (${summary.activeCount})` },
              { id: 'paused', label: `Paused (${summary.pausedCount})` },
              { id: 'executed', label: `Executed Today (${summary.executedTodayCount})` },
              { id: 'errors', label: `Errors (${summary.errorsCount})`, isAlert: summary.errorsCount > 0 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#183153] text-white border border-white/20 shadow-sm'
                    : tab.isAlert
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20'
                      : 'bg-[#071322] text-slate-400 hover:text-white border border-[#1e2f42] hover:bg-[#0b1929]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Filter Row: Folders, Sort, Page Size & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1b2b3d]">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Folder Filter Dropdown */}
            <div className="flex items-center gap-2 bg-[#071322] border border-[#1e2f42] rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Layers3 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Folder:</span>
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="bg-transparent text-white font-medium outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#071322] text-white">All Folders ({summary.totalWorkflows})</option>
                {folders.map(f => (
                  <option key={f.name} value={f.name} className="bg-[#071322] text-white">
                    {f.name} ({f.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-[#071322] border border-[#1e2f42] rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white font-medium outline-none cursor-pointer pr-1"
              >
                <option value="updated" className="bg-[#071322] text-white">Last modified in canvas</option>
                <option value="executed" className="bg-[#071322] text-white">Last executed (recent)</option>
                <option value="errors" className="bg-[#071322] text-white">Most errors today</option>
                <option value="latency" className="bg-[#071322] text-white">Highest latency</option>
                <option value="executions" className="bg-[#071322] text-white">Most executions today</option>
                <option value="name-asc" className="bg-[#071322] text-white">Name (A-Z)</option>
                <option value="name-desc" className="bg-[#071322] text-white">Name (Z-A)</option>
                <option value="created" className="bg-[#071322] text-white">Creation date</option>
              </select>
            </div>

            {/* Page Size Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#071322] border border-[#1e2f42] rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="text-slate-400">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-white font-medium outline-none cursor-pointer pr-1"
              >
                <option value={15} className="bg-[#071322] text-white">15 per page</option>
                <option value={25} className="bg-[#071322] text-white">25 per page</option>
                <option value={50} className="bg-[#071322] text-white">50 per page</option>
                <option value={100} className="bg-[#071322] text-white">100 per page</option>
                <option value="all" className="bg-[#071322] text-white">All workflows</option>
              </select>
            </div>
          </div>

          {/* Reset Filters button if active */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}

        </div>

      </div>

      {/* ── 5. Main Workflows Table ────────────────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#071322] backdrop-blur-md shadow-md shadow-black/30">
              <tr className="border-b border-[#233549] bg-[#071322] text-[11px] uppercase font-mono text-slate-400 tracking-wider">
                <th className="py-2.5 px-4 w-[14%] align-middle bg-[#071322]">Status</th>
                <th className="py-2.5 px-5 w-[36%] align-middle bg-[#071322]">Workflow Name</th>
                <th className="py-2.5 px-4 w-[13%] align-middle bg-[#071322]">Runs Today</th>
                <th className="py-2.5 px-4 w-[11%] align-middle bg-[#071322]">Latency</th>
                <th className="py-2.5 px-4 w-[16%] align-middle bg-[#071322]">Last Run / Saved</th>
                <th className="py-2.5 px-4 w-[10%] text-right align-middle bg-[#071322]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2b3d] text-xs">
              {paginatedWorkflows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No workflows match the selected criteria.
                  </td>
                </tr>
              ) : paginatedWorkflows.map((wf) => {
                const okRuns = typeof wf.successToday === 'number' ? wf.successToday : (wf.executionsToday || 0);
                const errRuns = wf.errorToday || 0;
                const hasRuns = (wf.executionsToday || 0) > 0;

                return (
                  <tr 
                    key={wf.id}
                    className="hover:bg-[#102035] transition-colors group cursor-pointer"
                    onClick={() => setSelectedWorkflow(wf)}
                  >
                    {/* Operational Health Badge */}
                    <td className="py-2.5 px-4 align-middle">
                      {renderStatusBadge(wf)}
                    </td>

                    {/* Workflow Name, Folder, Tags and ID */}
                    <td className="py-2.5 px-5 align-middle">
                      <div>
                        <h4 className="font-semibold text-white text-[13.5px] group-hover:text-blue-300 transition-colors truncate max-w-[380px]" title={wf.name}>
                          {wf.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-mono mt-1 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-sans">
                          {wf.folder || 'General'}
                        </span>
                        {Array.isArray(wf.tags) && wf.tags.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-sans text-[10px]">
                            {t.name || t}
                          </span>
                        ))}
                        <span>ID: {wf.id}</span>
                        <button 
                          onClick={(e) => copyId(wf.id, e)}
                          className="hover:text-white p-0.5 rounded text-slate-400 cursor-pointer"
                          title="Copy Workflow ID"
                        >
                          {copiedId === wf.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Executions Today with Zero-Success Fix */}
                    <td className="py-2.5 px-4 font-mono align-middle">
                      <div className="text-[13px] font-bold text-white">
                        {(wf.executionsToday || 0).toLocaleString()} <span className="text-[11px] text-slate-400 font-normal">runs</span>
                      </div>
                      {hasRuns ? (
                        <div className="text-[10.5px] flex items-center gap-1.5 mt-0.5">
                          <span className={okRuns > 0 ? "text-emerald-400 font-medium" : "text-slate-500"}>
                            {okRuns} ok
                          </span>
                          {errRuns > 0 && (
                            <span className="text-rose-400 font-semibold">
                              • {errRuns} err
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          standby
                        </div>
                      )}
                    </td>

                    {/* Latency */}
                    <td className="py-2.5 px-4 font-mono align-middle text-slate-300">
                      {wf.avgDurationSec !== null && wf.avgDurationSec !== undefined ? (
                        <span className="text-xs">{wf.avgDurationSec}s</span>
                      ) : (
                        <span className="text-slate-500 text-xs">—</span>
                      )}
                    </td>

                    {/* Last Run / Saved */}
                    <td className="py-2.5 px-4 font-mono text-[11.5px] align-middle">
                      <div>
                        {wf.lastExecutedAt ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white font-medium">{formatTimeAgo(wf.lastExecutedAt)}</span>
                            {wf.recentLogs?.[0]?.id && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold inline-flex items-center gap-0.5"
                                title={`Last Execution Run #${wf.recentLogs[0].id}`}
                              >
                                #{wf.recentLogs[0].id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No runs today</span>
                        )}
                      </div>
                      {wf.updatedAt && (
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1" title="Last saved in n8n">
                          <span className="text-slate-500">Saved:</span>
                          <span className="text-slate-300">{formatTimeAgo(wf.updatedAt)}</span>
                        </div>
                      )}
                    </td>

                    {/* In-App Inspect Action */}
                    <td className="py-2.5 px-4 text-right align-middle">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkflow(wf);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        title="Inspect recent execution logs and details"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── 6. Table Footer with Numbered Pagination ───────────────────────────── */}
        <div className="p-3.5 border-t border-[#233549] bg-[#071322] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          
          <div className="flex items-center gap-3">
            <div>
              Showing <span className="font-mono text-white font-semibold">{totalItems === 0 ? 0 : startIndex + 1}</span> to <span className="font-mono text-white font-semibold">{endIndex}</span> of <span className="font-mono text-white font-semibold">{totalItems}</span> workflows
            </div>
            {summary.snapshotDate && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                · Snapshot: {formatDateTime(summary.snapshotDate)}
              </span>
            )}
          </div>

          {/* Numbered Pagination Buttons */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded-lg border border-[#233549] text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {renderPageButtons()}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg border border-[#233549] text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Last Probed Indicator */}
          <div className="font-mono text-[11px] text-slate-500">
            Probed: {lastProbed.toLocaleTimeString()}
          </div>
        </div>

      </div>

      {/* ── 7. Slide-Out In-App Execution Drawer / Detail View ─────────────────────── */}
      {selectedWorkflow && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in"
          onClick={() => setSelectedWorkflow(null)}
        >
          <div 
            className="w-full max-w-xl bg-[#081424] border-l border-[#233549] h-full shadow-2xl flex flex-col overflow-hidden text-white animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#1b2b3d] bg-[#071322] flex items-start justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {renderStatusBadge(selectedWorkflow)}
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-sans text-xs">
                    {selectedWorkflow.folder || 'General'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white truncate" title={selectedWorkflow.name}>
                  {selectedWorkflow.name}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                  <span>ID: {selectedWorkflow.id}</span>
                  <button
                    onClick={() => copyDrawerId(selectedWorkflow.id)}
                    className="hover:text-white p-0.5 rounded text-slate-400 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDrawerId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[10px]">{copiedDrawerId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorkflow(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Close drawer (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="bg-[#0c1829] border border-[#1e2f42] rounded-xl p-3">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Runs Today</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {selectedWorkflow.executionsToday || 0}
                  </div>
                </div>
                <div className="bg-[#0c1829] border border-[#1e2f42] rounded-xl p-3">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Success</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    {typeof selectedWorkflow.successToday === 'number' ? selectedWorkflow.successToday : (selectedWorkflow.executionsToday || 0)}
                  </div>
                </div>
                <div className="bg-[#0c1829] border border-[#1e2f42] rounded-xl p-3">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Errors</div>
                  <div className={`text-xl font-bold font-mono mt-0.5 ${selectedWorkflow.errorToday > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {selectedWorkflow.errorToday || 0}
                  </div>
                </div>
                <div className="bg-[#0c1829] border border-[#1e2f42] rounded-xl p-3">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Latency</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">
                    {selectedWorkflow.avgDurationSec ? `${selectedWorkflow.avgDurationSec}s` : '—'}
                  </div>
                </div>
              </div>

              {/* Execution Timestamps */}
              <div className="bg-[#0c1829] border border-[#1e2f42] rounded-xl p-4 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Executed:</span>
                  <span className="font-mono text-white font-medium">
                    {selectedWorkflow.lastExecutedAt ? formatDateTime(selectedWorkflow.lastExecutedAt) : 'No executions recorded'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Canvas Save:</span>
                  <span className="font-mono text-slate-300">
                    {selectedWorkflow.updatedAt ? formatDateTime(selectedWorkflow.updatedAt) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Created:</span>
                  <span className="font-mono text-slate-300">
                    {selectedWorkflow.createdAt ? formatDateTime(selectedWorkflow.createdAt) : '—'}
                  </span>
                </div>
              </div>

              {/* Recent Execution Runs Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Recent Execution Runs (Last 5)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedWorkflow.recentLogs?.length || 0} runs available
                  </span>
                </div>

                {!selectedWorkflow.recentLogs || selectedWorkflow.recentLogs.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-[#0c1829] border border-[#1e2f42] text-slate-400 text-xs">
                    No recent execution runs logged for this workflow.
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#1e2f42] bg-[#0c1829] overflow-hidden divide-y divide-[#182738]">
                    {selectedWorkflow.recentLogs.map((log, index) => {
                      const isSuccess = log.status === 'success';
                      const isError = log.status === 'error';
                      return (
                        <div key={log.id || index} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-[#112136] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-400' : isError ? 'bg-rose-400' : 'bg-blue-400'}`}></span>
                            <div>
                              <div className="font-mono font-bold text-white flex items-center gap-2">
                                <span>#{log.id || 'N/A'}</span>
                                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-semibold ${
                                  isSuccess ? 'bg-emerald-500/10 text-emerald-400' : isError ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                  {log.status || 'trigger'}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                                Mode: {log.mode || 'trigger'} · {log.startedAt ? formatTimeAgo(log.startedAt) : '—'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="text-slate-300 font-medium">
                              {log.durationSec !== null && log.durationSec !== undefined ? `${log.durationSec}s` : '—'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {log.startedAt ? new Date(log.startedAt).toLocaleTimeString() : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#1b2b3d] bg-[#071322] flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => copyDrawerId(selectedWorkflow.id)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy ID</span>
              </button>

              <a
                href={selectedWorkflow.n8nUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-900/30"
              >
                <span>Open in n8n Canvas</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}