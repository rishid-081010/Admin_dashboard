import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, RefreshCw, ExternalLink, Check, Copy, 
  ArrowUpDown, Layers, X, Clock, Activity, 
  CheckCircle2, AlertTriangle, Layers3
} from 'lucide-react';
import axios from 'axios';
import initialTelemetry from '../../public/n8n_telemetry.json';

export default function WorkflowsDirectory() {
  const [data, setData] = useState(initialTelemetry || null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'published', 'unpublished', 'executed', 'errors'
  const [folderFilter, setFolderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated'); // 'updated', 'created', 'name-asc', 'name-desc', 'executions'
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [copiedId, setCopiedId] = useState(null);

  // Fetch live n8n telemetry from API endpoint or static json
  const fetchTelemetry = async (manual = false) => {
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
      for (const url of endpoints) {
        try {
          const res = await axios.get(url, { timeout: 10000 });
          if (res?.data?.success && Array.isArray(res.data.workflows) && res.data.workflows.length > 0) {
            fetchedData = res.data;
            break;
          }
        } catch (e) {
          // try next endpoint
        }
      }

      if (fetchedData) {
        setData(fetchedData);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('Could not refresh n8n telemetry:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTelemetry(false);
  }, []);

  // 5-Minute Auto-Refresh Interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTelemetry(false);
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Copy workflow ID
  const copyId = (id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const summary = useMemo(() => {
    const workflows = data?.workflows || [];
    const totalWorkflows = workflows.length;
    const publishedCount = workflows.filter(w => w.active).length;
    const unpublishedCount = totalWorkflows - publishedCount;
    const executedTodayCount = workflows.filter(w => (w.executionsToday || 0) > 0).length;
    const errorsCount = workflows.filter(w => (w.errorToday || 0) > 0 || w.status === 'error').length;
    const totalExecutionsToday = workflows.reduce((acc, w) => acc + (w.executionsToday || 0), 0);
    const totalSuccessToday = workflows.reduce((acc, w) => acc + (w.successToday || 0), 0);
    const totalErrorsToday = workflows.reduce((acc, w) => acc + (w.errorToday || 0), 0);

    const latencies = workflows.map(w => w.avgDurationSec).filter(v => typeof v === 'number' && v > 0);
    const avgRuntimeSec = latencies.length > 0 
      ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2))
      : (data?.summary?.avgRuntimeSec || 1.73);

    return {
      totalWorkflows,
      publishedCount,
      unpublishedCount,
      executedTodayCount,
      errorsCount,
      totalExecutionsToday,
      totalSuccessToday,
      totalErrorsToday,
      avgRuntimeSec
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
    if (statusFilter === 'published') {
      list = list.filter(w => w.active);
    } else if (statusFilter === 'unpublished') {
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
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : 0);
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : 0);
        return timeB - timeA;
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

  const hasActiveFilters = statusFilter !== 'all' || folderFilter !== 'all' || searchTerm.trim() !== '';

  const resetFilters = () => {
    setStatusFilter('all');
    setFolderFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 gap-4 overflow-y-auto custom-scrollbar select-text pr-1 -mr-1">
      
      {/* ── 1. Top Header Bar: Clean & Minimal ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pt-1">
        <div>
          <h1 
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" 
            style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
          >
            Workflows
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Workflow execution telemetry and automations
          </p>
        </div>

        {/* Console & Refresh Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchTelemetry(true)}
            disabled={loading}
            className="p-2 rounded-xl bg-[#0c1829] hover:bg-[#132238] border border-[#233549] text-slate-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href="https://n8n.asquared.ae"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c1829] hover:bg-[#132238] text-slate-200 hover:text-white border border-[#233549] text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Open n8n Workflows Console"
          >
            <span>n8n Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* ── 2. Top Metric Cards ─────────────────────────────────────────────────── */}
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
            {summary.unpublishedCount} unpublished · {summary.publishedCount} published
          </div>
        </div>

        {/* Card 2: Published */}
        <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 hover:border-[#385175] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold">Published</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-1">
            {summary.publishedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Active automations
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
            Mean workflow runtime
          </div>
        </div>

      </div>

      {/* ── 3. Search & Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-4 shadow-xl shadow-black/40 shrink-0 flex flex-col gap-3">
        
        {/* Top Filter Row: Search & Status Tabs */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search input */}
          <div className="flex-1 flex items-center bg-[#071322] border border-[#1e2f42] rounded-xl px-3.5 py-2 focus-within:border-blue-500/70 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search workflows by name, folder, or ID..."
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

          {/* Status Tabs matching n8n */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: `All (${summary.totalWorkflows})` },
              { id: 'published', label: `Published (${summary.publishedCount})` },
              { id: 'unpublished', label: `Unpublished (${summary.unpublishedCount})` },
              { id: 'executed', label: `Executed Today (${summary.executedTodayCount})` },
              { id: 'errors', label: `Errors (${summary.errorsCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#183153] text-white border border-white/20 shadow-sm'
                    : 'bg-[#071322] text-slate-400 hover:text-white border border-[#1e2f42] hover:bg-[#0b1929]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Filter Row: Folders Dropdown, Sort Dropdown & Reset */}
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

            {/* Sort Dropdown matching n8n options */}
            <div className="flex items-center gap-2 bg-[#071322] border border-[#1e2f42] rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white font-medium outline-none cursor-pointer pr-1"
              >
                <option value="updated" className="bg-[#071322] text-white">Sort by last updated</option>
                <option value="created" className="bg-[#071322] text-white">Sort by last created</option>
                <option value="name-asc" className="bg-[#071322] text-white">Sort by name (A-Z)</option>
                <option value="name-desc" className="bg-[#071322] text-white">Sort by name (Z-A)</option>
                <option value="executions" className="bg-[#071322] text-white">Sort by executions today</option>
              </select>
            </div>
          </div>

          {/* Reset Filters button if any active */}
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

      {/* ── 4. Main Workflows Table ────────────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#233549] bg-[#071322] text-[11px] uppercase font-mono text-slate-400 tracking-wider">
                <th className="py-3 px-4 w-[11%] align-middle">Status</th>
                <th className="py-3 px-5 w-[37%] align-middle">Workflow Name</th>
                <th className="py-3 px-4 w-[14%] align-middle">Runs Today</th>
                <th className="py-3 px-4 w-[11%] align-middle">Latency</th>
                <th className="py-3 px-4 w-[18%] align-middle">Last Run / Saved</th>
                <th className="py-3 px-4 w-[9%] text-right align-middle">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2b3d] text-xs">
              {filteredWorkflows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No workflows match the selected criteria.
                  </td>
                </tr>
              ) : filteredWorkflows.map((wf) => (
                <tr 
                  key={wf.id}
                  className="hover:bg-[#102035] transition-colors group cursor-pointer"
                  onClick={() => window.open(wf.n8nUrl, '_blank')}
                >
                  {/* Status: Published vs Unpublished */}
                  <td className="py-3.5 px-4 align-middle">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono border ${
                      wf.active 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${wf.active ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                      <span>{wf.active ? 'Published' : 'Unpublished'}</span>
                    </span>
                  </td>

                  {/* Workflow Name, Folder, and ID */}
                  <td className="py-3.5 px-5 align-middle">
                    <div>
                      <h4 className="font-semibold text-white text-[13.5px] group-hover:text-blue-300 transition-colors truncate max-w-[380px]" title={wf.name}>
                        {wf.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-mono mt-1 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 font-sans">
                        {wf.folder || 'General'}
                      </span>
                      <span>ID: {wf.id}</span>
                      <button 
                        onClick={(e) => copyId(wf.id, e)}
                        className="hover:text-white p-0.5 rounded text-slate-400"
                        title="Copy Workflow ID"
                      >
                        {copiedId === wf.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>

                  {/* Executions Today */}
                  <td className="py-3.5 px-4 font-mono align-middle">
                    <div className="text-[13px] font-bold text-white">
                      {(wf.executionsToday || 0).toLocaleString()} <span className="text-[11px] text-slate-400 font-normal">runs</span>
                    </div>
                    {(wf.executionsToday || 0) > 0 ? (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <span>{wf.successToday || wf.executionsToday} ok</span>
                        {wf.errorToday > 0 && <span className="text-rose-400">• {wf.errorToday} err</span>}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        standby
                      </div>
                    )}
                  </td>

                  {/* Latency */}
                  <td className="py-3.5 px-4 font-mono align-middle text-slate-300">
                    {wf.avgDurationSec !== null && wf.avgDurationSec !== undefined ? (
                      <span className="text-xs">{wf.avgDurationSec}s</span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>

                  {/* Last Run / Saved */}
                  <td className="py-3.5 px-4 font-mono text-[11.5px] align-middle">
                    <div>
                      {wf.lastExecutedAt ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white font-medium">{formatTimeAgo(wf.lastExecutedAt)}</span>
                          {wf.recentLogs?.[0]?.id && (
                            <a
                              href={`https://n8n.asquared.ae/execution/${wf.recentLogs[0].id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[10px] font-bold transition-all inline-flex items-center gap-0.5"
                              title={`Open Execution #${wf.recentLogs[0].id} in n8n`}
                            >
                              <span>#{wf.recentLogs[0].id}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
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

                  {/* Action Link to n8n */}
                  <td className="py-3.5 px-4 text-right align-middle">
                    <a
                      href={wf.n8nUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 inline-flex items-center gap-1 transition-all"
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

        {/* Table Footer: Minimal and Clean */}
        <div className="p-3.5 border-t border-[#233549] bg-[#071322] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div>
            Showing {filteredWorkflows.length} of {summary.totalWorkflows} workflows
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>
      </div>

    </div>
  );
}
