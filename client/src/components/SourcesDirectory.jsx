import React, { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { SOURCES_DATA } from '../data/sourcesData';

export default function SourcesDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [downloadingId, setDownloadingId] = useState(null);

  const PARQUET_URL = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/sources_catalog.parquet";

  // Filtered & Sorted files strictly using authentic filesystem properties
  const filteredAndSorted = useMemo(() => {
    let result = SOURCES_DATA.filter(item => {
      // 1. Exact filename or status search
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || 
        item.filename.toLowerCase().includes(q) || 
        (item.status && item.status.toLowerCase().includes(q)) ||
        (item.duplicate_of && item.duplicate_of.toLowerCase().includes(q));

      // 2. Real format/extension filter
      const matchesFormat = selectedFormat === 'All' || item.extension === selectedFormat;

      // 3. Real size filter
      let matchesSize = true;
      const kb = item.size_bytes / 1024;
      if (selectedSizeFilter === '<500KB') matchesSize = kb < 500;
      else if (selectedSizeFilter === '500KB-2MB') matchesSize = kb >= 500 && kb <= 2048;
      else if (selectedSizeFilter === '2MB-10MB') matchesSize = kb > 2048 && kb <= 10240;
      else if (selectedSizeFilter === '>10MB') matchesSize = kb > 10240;

      // 4. Status filter
      let matchesStatus = true;
      if (selectedStatusFilter === 'processed') matchesStatus = item.status === 'processed';
      else if (selectedStatusFilter === 'duplicate') matchesStatus = !!item.duplicate_of;

      return matchesSearch && matchesFormat && matchesSize && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.filename.localeCompare(b.filename);
      if (sortBy === 'name_desc') return b.filename.localeCompare(a.filename);
      if (sortBy === 'rows_desc') return (b.accepted_rows || 0) - (a.accepted_rows || 0);
      if (sortBy === 'rows_asc') return (a.accepted_rows || 0) - (b.accepted_rows || 0);
      if (sortBy === 'size_desc') return b.size_bytes - a.size_bytes;
      if (sortBy === 'size_asc') return a.size_bytes - b.size_bytes;
      return 0; // Default order matches Image 1
    });

    return result;
  }, [searchTerm, selectedFormat, selectedSizeFilter, selectedStatusFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const handleDownload = (item, e) => {
    if (e) e.stopPropagation();
    setDownloadingId(item.id);
    
    const link = document.createElement('a');
    link.href = item.download_url;
    link.download = item.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col text-white -m-4 lg:-m-5 p-6 lg:p-8 overflow-y-auto custom-scrollbar font-sans select-text">
      
      {/* ─── Header: Clean, Classic, Minimalist ─────────────────────────── */}
      <div className="mb-6">
        <h1 
          className="text-3xl md:text-4xl text-white font-bold tracking-tight" 
        >
          Data library
        </h1>
      </div>

      {/* ─── Search & Filters Card ────────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 p-5 mb-6">
        <div className="text-[12px] font-semibold text-slate-300 mb-2.5">
          Find a source
        </div>

        {/* Search input + Dark Search button */}
        <div className="flex items-center gap-3">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search filename or processing status"
            className="flex-1 bg-[#06111e] border border-[#1b2b3d] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#385175] transition-all shadow-none"
          />
          <button 
            onClick={() => setCurrentPage(1)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25 shrink-0"
          >
            Search
          </button>
        </div>

        {/* Minimalist Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-[#233549] text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Format Filter */}
            <div className="flex items-center gap-1.5 bg-[#06111e] border border-[#1b2b3d] rounded-lg px-2.5 py-1">
              <span className="font-medium text-slate-400">Format:</span>
              <select 
                value={selectedFormat} 
                onChange={(e) => { setSelectedFormat(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="All" className="bg-[#0c1829]">All Formats</option>
                <option value="XLSX" className="bg-[#0c1829]">XLSX</option>
                <option value="XLS" className="bg-[#0c1829]">XLS</option>
              </select>
            </div>

            {/* Size Filter */}
            <div className="flex items-center gap-1.5 bg-[#06111e] border border-[#1b2b3d] rounded-lg px-2.5 py-1">
              <span className="font-medium text-slate-400">Size:</span>
              <select 
                value={selectedSizeFilter} 
                onChange={(e) => { setSelectedSizeFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="All" className="bg-[#0c1829]">All Sizes</option>
                <option value="<500KB" className="bg-[#0c1829]">&lt; 500 KB</option>
                <option value="500KB-2MB" className="bg-[#0c1829]">500 KB – 2 MB</option>
                <option value="2MB-10MB" className="bg-[#0c1829]">2 MB – 10 MB</option>
                <option value=">10MB" className="bg-[#0c1829]">&gt; 10 MB</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#06111e] border border-[#1b2b3d] rounded-lg px-2.5 py-1">
              <span className="font-medium text-slate-400">Status:</span>
              <select 
                value={selectedStatusFilter} 
                onChange={(e) => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="All" className="bg-[#0c1829]">All Statuses</option>
                <option value="processed" className="bg-[#0c1829]">Processed</option>
                <option value="duplicate" className="bg-[#0c1829]">Duplicates</option>
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
                <option value="default" className="bg-[#0c1829]">Default Order</option>
                <option value="name_asc" className="bg-[#0c1829]">File Name (A–Z)</option>
                <option value="name_desc" className="bg-[#0c1829]">File Name (Z–A)</option>
                <option value="rows_desc" className="bg-[#0c1829]">Accepted Rows (High to Low)</option>
                <option value="rows_asc" className="bg-[#0c1829]">Accepted Rows (Low to High)</option>
                <option value="size_desc" className="bg-[#0c1829]">File Size (Largest)</option>
                <option value="size_asc" className="bg-[#0c1829]">File Size (Smallest)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              {filteredAndSorted.length.toLocaleString()} files accounted for
            </span>
            <a 
              href={PARQUET_URL}
              download="sources_catalog.parquet"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
            >
              Export Catalog (.parquet)
            </a>
          </div>
        </div>
      </div>

      {/* ─── The Main Data Library Table ─────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 overflow-hidden mb-6 flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#233549] bg-[#071322]">
                <th className="py-3 px-5 text-xs font-semibold text-slate-400 w-[44%]">File</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 w-[8%]">Tabs</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 w-[14%]">Accepted rows</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 w-[11%]">Quarantined</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-400 w-[11%]">Status</th>
                <th className="py-3 px-5 text-xs font-semibold text-slate-400 w-[12%]">Duplicate of</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2b3d]/60">
              {paginated.map((item) => (
                <tr 
                  key={item.id}
                  className="hover:bg-[#102035] transition-colors group cursor-pointer"
                  onClick={() => handleDownload(item)}
                >
                  {/* File name */}
                  <td className="py-3.5 px-5 text-sm text-slate-200 font-normal">
                    <div className="flex items-center justify-between gap-3">
                      <span 
                        className="truncate max-w-[460px] group-hover:text-blue-300 transition-colors" 
                        title={item.filename}
                      >
                        {item.filename}
                      </span>
                      <button 
                        onClick={(e) => handleDownload(item, e)}
                        title="Download file"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#1b2b3d] rounded text-slate-400 hover:text-white shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Tabs */}
                  <td className="py-3.5 px-4 text-sm text-slate-400">
                    {item.tabs || 1}
                  </td>

                  {/* Accepted rows */}
                  <td className="py-3.5 px-4 text-sm text-slate-300 font-mono">
                    {item.accepted_rows !== null && item.accepted_rows !== undefined 
                      ? item.accepted_rows.toLocaleString() 
                      : '—'}
                  </td>

                  {/* Quarantined */}
                  <td className="py-3.5 px-4 text-sm text-slate-500 font-mono">
                    {item.quarantined ? item.quarantined.toLocaleString() : '—'}
                  </td>

                  {/* Status pill */}
                  <td className="py-3.5 px-4 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#06111e] text-slate-300 border border-[#1b2b3d]">
                      {item.status || 'processed'}
                    </span>
                  </td>

                  {/* Duplicate of */}
                  <td className="py-3.5 px-5 text-sm text-slate-500 truncate max-w-[150px]" title={item.duplicate_of || ''}>
                    {item.duplicate_of || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Bar ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#233549] bg-[#071322] text-xs text-slate-400 shrink-0">
          <div>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length.toLocaleString()} files
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
                <option value={200} className="bg-[#0c1829]">200</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-[#1b2b3d] bg-[#06111e] rounded text-slate-300 hover:bg-[#102035] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-slate-300 font-medium px-1">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
