import React, { useState, useMemo } from 'react';
import { 
  Download, Eye, Search, X, Loader2, Minimize2, RefreshCw,
  FileText, CheckCircle2, ShieldCheck, Filter, ArrowUpDown, 
  Sparkles, Layers, Database, AlertCircle 
} from 'lucide-react';

export default function CleanedFilesDirectory({ 
  onClose, 
  cleanedHistory = [], 
  onRefresh = null,
  syncing = false,
  onDownload, 
  onInspect 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [downloadingId, setDownloadingId] = useState(null);

  // Extract unique property types from history for dynamic filter
  const propertyTypes = useMemo(() => {
    const set = new Set();
    cleanedHistory.forEach(item => {
      if (item.propertyType) set.add(item.propertyType);
    });
    return Array.from(set);
  }, [cleanedHistory]);

  // Overall totals for top stat row
  const overallMetrics = useMemo(() => {
    let totalLeads = 0;
    let cleanLeads = 0;
    let dups = 0;
    cleanedHistory.forEach(item => {
      totalLeads += Number(item.totalRows || 0);
      cleanLeads += Number(item.cleanRows || 0);
      dups += Number(item.duplicateRows || 0);
    });
    const avgRate = totalLeads > 0 ? Math.round((cleanLeads / totalLeads) * 100) : 100;
    return {
      fileCount: cleanedHistory.length,
      totalLeads,
      cleanLeads,
      dups,
      avgRate
    };
  }, [cleanedHistory]);

  // Filtered & Sorted cleaned files
  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    let result = cleanedHistory.filter(item => {
      // 1. Search term match (filename, property type, or status)
      const matchesSearch = !q || 
        (item.fileName && item.fileName.toLowerCase().includes(q)) ||
        (item.propertyType && item.propertyType.toLowerCase().includes(q)) ||
        (item.status && item.status.toLowerCase().includes(q));

      // 2. Property type filter
      const matchesType = selectedPropertyType === 'All' || item.propertyType === selectedPropertyType;

      // 3. Status filter
      let matchesStatus = true;
      if (selectedStatus === 'Clean & Verified') {
        matchesStatus = item.status === 'Clean & Verified';
      } else if (selectedStatus === 'Pushed to CRM') {
        matchesStatus = item.status === 'Pushed to CRM';
      }

      return matchesSearch && matchesType && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.cleanedAt || 0) - new Date(a.cleanedAt || 0);
      }
      if (sortBy === 'date_asc') {
        return new Date(a.cleanedAt || 0) - new Date(b.cleanedAt || 0);
      }
      if (sortBy === 'clean_desc') {
        return (b.cleanRows || 0) - (a.cleanRows || 0);
      }
      if (sortBy === 'clean_asc') {
        return (a.cleanRows || 0) - (b.cleanRows || 0);
      }
      if (sortBy === 'total_desc') {
        return (b.totalRows || 0) - (a.totalRows || 0);
      }
      if (sortBy === 'name_asc') {
        return (a.fileName || '').localeCompare(b.fileName || '');
      }
      if (sortBy === 'name_desc') {
        return (b.fileName || '').localeCompare(a.fileName || '');
      }
      return 0;
    });

    return result;
  }, [cleanedHistory, searchTerm, selectedPropertyType, selectedStatus, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const handleDownloadClick = async (item, e) => {
    if (e) e.stopPropagation();
    setDownloadingId(item.id);
    if (onDownload) {
      await onDownload(item, e);
    }
    setTimeout(() => {
      setDownloadingId(null);
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col text-white font-sans select-text overflow-hidden gap-3.5 pr-1">
      
      {/* ─── Header: Clean, Classic, Minimalist ─────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between pb-1 border-b border-white/[0.08]">
        <div>
          <h1 className="ds-page-title">
            Cleaned Files
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm"
              title="Sync cleaned files from cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold text-emerald-300 hover:text-white transition-all cursor-pointer shadow-md"
              title="Minimize to Data Cleaning"
            >
              <Minimize2 className="w-4 h-4 text-emerald-400" />
              <span>Minimize to Cleaning</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Summary KPI Metrics Strip (Monolithic White Typography) ────────────────── */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="ds-subcard p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Valid Clean Records
          </span>
          <div className="text-xl font-bold font-sans tabular-nums text-white mt-1">
            {overallMetrics.cleanLeads.toLocaleString()}
          </div>
        </div>

        <div className="ds-subcard p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Total Processed Rows
          </span>
          <div className="text-xl font-bold font-sans tabular-nums text-white mt-1">
            {overallMetrics.totalLeads.toLocaleString()}
          </div>
        </div>

        <div className="ds-subcard p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Duplicates Removed
          </span>
          <div className="text-xl font-bold font-sans tabular-nums text-white mt-1">
            {overallMetrics.dups.toLocaleString()}
          </div>
        </div>

        <div className="ds-subcard p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Avg Clean Rate
          </span>
          <div className="text-xl font-bold font-sans tabular-nums text-white mt-1">
            {overallMetrics.avgRate}%
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Card ────────────────────────────────────────── */}
      <div className="shrink-0 ds-card p-4 select-none">
        <div className="text-[12px] font-semibold text-slate-300 mb-2">
          Find a cleaned dataset
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search filename, property type, or status (e.g. Jumeirah, Villa, Damac)..."
              className="w-full bg-[#06111e]/55 backdrop-blur-md border border-white/15 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#b7a990] transition-all shadow-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-900/30 cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filter & Sort Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#1b2b3d]/80 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Property Type Filter */}
            <div className="flex items-center gap-1.5 bg-[#06111e] border border-[#1b2b3d] rounded-lg px-2.5 py-1">
              <span className="font-medium text-slate-400">Type:</span>
              <select 
                value={selectedPropertyType} 
                onChange={(e) => { setSelectedPropertyType(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="All" className="bg-[#0c1829]">All Types</option>
                {propertyTypes.map(t => (
                  <option key={t} value={t} className="bg-[#0c1829]">{t}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#06111e] border border-[#1b2b3d] rounded-lg px-2.5 py-1">
              <span className="font-medium text-slate-400">Status:</span>
              <select 
                value={selectedStatus} 
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="All" className="bg-[#0c1829]">All Statuses</option>
                <option value="Clean & Verified" className="bg-[#0c1829]">Clean &amp; Verified</option>
                <option value="Pushed to CRM" className="bg-[#0c1829]">Pushed to CRM</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5 bg-[#06111e] border border-[#1b2b3d] rounded-lg px-2.5 py-1">
              <span className="font-medium text-slate-400">Sort:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="date_desc" className="bg-[#0c1829]">Cleaned Date (Newest)</option>
                <option value="date_asc" className="bg-[#0c1829]">Cleaned Date (Oldest)</option>
                <option value="clean_desc" className="bg-[#0c1829]">Clean Rows (High to Low)</option>
                <option value="clean_asc" className="bg-[#0c1829]">Clean Rows (Low to High)</option>
                <option value="total_desc" className="bg-[#0c1829]">Total Rows (High to Low)</option>
                <option value="name_asc" className="bg-[#0c1829]">File Name (A–Z)</option>
                <option value="name_desc" className="bg-[#0c1829]">File Name (Z–A)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              {filteredAndSorted.length.toLocaleString()} files accounted for
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Cleaned Files Table ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 ds-card relative flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#071322]/80 backdrop-blur-md border-b border-white/10 text-xs uppercase tracking-wider text-[#b7a990] sticky top-0 z-20 shadow-md backdrop-blur-xl">
              <tr>
                <th className="py-3 px-5 text-xs font-semibold text-[#b7a990] w-[30%] bg-[#071322]/80 backdrop-blur-xl">File Name</th>
                <th className="py-3 px-4 text-xs font-semibold text-[#b7a990] w-[14%] bg-[#071322]/80 backdrop-blur-xl">Cleaned Date</th>
                <th className="py-3 px-4 text-xs font-semibold text-[#b7a990] w-[14%] bg-[#071322]/80 backdrop-blur-xl">Clean &amp; Valid Rows</th>
                <th className="py-3 px-4 text-xs font-semibold text-[#b7a990] w-[10%] bg-[#071322]/80 backdrop-blur-xl">Total Rows</th>
                <th className="py-3 px-4 text-xs font-semibold text-[#b7a990] w-[10%] bg-[#071322]/80 backdrop-blur-xl">Duplicates</th>
                <th className="py-3 px-4 text-xs font-semibold text-[#b7a990] w-[10%] bg-[#071322]/80 backdrop-blur-xl">Property Type</th>
                <th className="py-3 px-4 text-xs font-semibold text-[#b7a990] w-[12%] bg-[#071322]/80 backdrop-blur-xl">Status</th>
                <th className="py-3 px-5 text-xs font-semibold text-[#b7a990] w-[14%] text-right bg-[#071322]/80 backdrop-blur-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2b3d]/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-slate-400 text-xs">
                    No cleaned files found matching your search or filters.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-[#102035] transition-colors group"
                  >
                    {/* File Name */}
                    <td className="py-3.5 px-5 text-sm text-slate-200 font-normal">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-white truncate max-w-[320px] group-hover:text-emerald-300 transition-colors" title={item.fileName}>
                            {item.fileName}
                          </span>
                          <span className="text-[10px] font-sans tabular-nums text-slate-400 flex items-center gap-1.5">
                            <span>{item.fileSize || '120 KB'}</span>
                            {item.cleanedBy && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400/90 font-medium truncate max-w-[150px]">By {item.cleanedBy}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cleaned Date */}
                    <td className="py-3.5 px-4 text-xs font-sans tabular-nums text-slate-400 whitespace-nowrap">
                      {item.cleanedAt ? new Date(item.cleanedAt).toLocaleString() : 'Recent'}
                    </td>

                    {/* Clean & Valid Rows */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-sans tabular-nums font-bold text-white">
                      {(item.cleanRows || 0).toLocaleString()}
                    </td>

                    {/* Total Rows */}
                    <td className="py-3.5 px-4 text-xs font-sans tabular-nums text-slate-300 whitespace-nowrap">
                      {(item.totalRows || 0).toLocaleString()}
                    </td>

                    {/* Duplicates */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-sans tabular-nums text-slate-300">
                      {(item.duplicateRows || 0).toLocaleString()}
                    </td>

                    {/* Property Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-300">
                      {item.propertyType || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium border ${
                        item.status === 'Pushed to CRM'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      }`}>
                        {item.status || 'Clean & Verified'}
                      </span>
                    </td>

                    {/* Actions (Smooth reveal on hover) */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          type="button"
                          onClick={(e) => handleDownloadClick(item, e)}
                          disabled={downloadingId === item.id}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Download cleaned file in original structure"
                        >
                          {downloadingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{item.fileName?.endsWith('.xlsx') || item.fileName?.endsWith('.xls') ? 'Export Excel' : 'Export CSV'}</span>
                        </button>
                        {item.cleanLeadsSample && item.cleanLeadsSample.length > 0 && onInspect && (
                          <button
                            type="button"
                            onClick={() => onInspect(item)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            title="Inspect in preview table"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Inspect</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#233549] bg-[#071322] text-xs text-slate-400 shrink-0">
          <div>
            Showing {filteredAndSorted.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length.toLocaleString()} files
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#06111e] border border-[#1b2b3d] rounded px-1.5 py-0.5 text-slate-300 outline-none cursor-pointer"
              >
                <option value={25} className="bg-[#0c1829]">25</option>
                <option value={50} className="bg-[#0c1829]">50</option>
                <option value={100} className="bg-[#0c1829]">100</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-[#1b2b3d] bg-[#06111e] rounded text-slate-300 hover:bg-[#102035] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-slate-300 font-medium px-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 border border-[#1b2b3d] bg-[#06111e] rounded text-slate-300 hover:bg-[#102035] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
