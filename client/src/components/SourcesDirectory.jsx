import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Search, Filter, Database, HardDrive, 
  Download, ExternalLink, CheckCircle2, FolderArchive, 
  ArrowUpDown, ShieldCheck, ArrowDownToLine, Clock, FileText, Check
} from 'lucide-react';
import { SOURCES_DATA } from '../data/sourcesData';

export default function SourcesDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [downloadingId, setDownloadingId] = useState(null);

  const PARQUET_URL = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/sources_catalog.parquet";

  // Real format counts (XLSX, XLS)
  const formatCounts = useMemo(() => {
    const counts = { 'All': SOURCES_DATA.length };
    SOURCES_DATA.forEach(s => {
      counts[s.extension] = (counts[s.extension] || 0) + 1;
    });
    return counts;
  }, []);

  // Filtered & Sorted files strictly using authentic filesystem properties
  const filteredAndSorted = useMemo(() => {
    let result = SOURCES_DATA.filter(item => {
      // 1. Exact filename search
      const matchesSearch = searchTerm.trim() === '' || 
        item.filename.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Real format/extension filter
      const matchesFormat = selectedFormat === 'All' || item.extension === selectedFormat;

      // 3. Real size filter
      let matchesSize = true;
      const kb = item.size_bytes / 1024;
      if (selectedSizeFilter === '<500KB') matchesSize = kb < 500;
      else if (selectedSizeFilter === '500KB-2MB') matchesSize = kb >= 500 && kb <= 2048;
      else if (selectedSizeFilter === '2MB-10MB') matchesSize = kb > 2048 && kb <= 10240;
      else if (selectedSizeFilter === '>10MB') matchesSize = kb > 10240;

      return matchesSearch && matchesFormat && matchesSize;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.filename.localeCompare(b.filename);
      if (sortBy === 'name_desc') return b.filename.localeCompare(a.filename);
      if (sortBy === 'size_desc') return b.size_bytes - a.size_bytes;
      if (sortBy === 'size_asc') return a.size_bytes - b.size_bytes;
      if (sortBy === 'date_desc') return (b.date_modified || '').localeCompare(a.date_modified || '');
      if (sortBy === 'date_asc') return (a.date_modified || '').localeCompare(b.date_modified || '');
      return 0;
    });

    return result;
  }, [searchTerm, selectedFormat, selectedSizeFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFormatChange = (fmt) => {
    setSelectedFormat(fmt);
    setCurrentPage(1);
  };

  const handleDownload = (item, e) => {
    if (e) e.stopPropagation();
    setDownloadingId(item.id);
    
    // Trigger direct download
    const link = document.createElement('a');
    link.href = item.download_url;
    link.download = item.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
    }, 2000);
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in relative text-white/80 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono tracking-widest uppercase text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
              Raw Source Files Repository
            </span>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> 1,382 Authentic Files
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            DATA SOURCES
          </h1>
          <p className="text-white/60 text-sm max-w-2xl">
            Direct access to all 1,382 original vendor spreadsheets (2.16 GB) cataloged directly from local disk. Click any row or download button to download the authentic file.
          </p>
        </div>

        {/* Action Button: Download Compressed Parquet Catalog */}
        <div className="flex items-center gap-3">
          <a
            href={PARQUET_URL}
            target="_blank"
            rel="noreferrer"
            download="sources_catalog.parquet"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            Download Parquet Catalog (56.5 KB)
          </a>
        </div>
      </div>

      {/* ─── 4 Top KPI Cards (100% Real Metadata) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Total Source Files */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Total Physical Files</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">
              1,382
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              1,371 .XLSX • 11 .XLS spreadsheets
            </div>
          </div>
        </div>

        {/* Card 2: Raw Volume */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Uncompressed Data Volume</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">
              2.16 GB
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              2,270,848,288 total bytes
            </div>
          </div>
        </div>

        {/* Card 3: Local Archive Size */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Compressed Archive Size</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">
              1.69 GB
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Zip archive compressed volume
            </div>
          </div>
        </div>

        {/* Card 4: Compressed Parquet Size */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Parquet Catalog Size</span>
            <FolderArchive className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400 tracking-tight">
              56.5 KB
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Snappy-compressed metadata in Supabase
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search and Filter Bar ──────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search 1,382 files by exact filename (e.g. Kempinski, Burj Al Nojoom, Satwa, Wasl)..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
            <ArrowUpDown className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-xs text-white/50 font-medium shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="name_asc" className="bg-[#0b132b]">File Name (A → Z)</option>
              <option value="name_desc" className="bg-[#0b132b]">File Name (Z → A)</option>
              <option value="size_desc" className="bg-[#0b132b]">File Size (Largest First)</option>
              <option value="size_asc" className="bg-[#0b132b]">File Size (Smallest First)</option>
              <option value="date_desc" className="bg-[#0b132b]">Date Modified (Newest First)</option>
              <option value="date_asc" className="bg-[#0b132b]">Date Modified (Oldest First)</option>
            </select>
          </div>

          {/* Size Filter Dropdown */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-xs text-white/50 font-medium shrink-0">Size:</span>
            <select
              value={selectedSizeFilter}
              onChange={(e) => { setSelectedSizeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#0b132b]">All Sizes</option>
              <option value="<500KB" className="bg-[#0b132b]">&lt; 500 KB</option>
              <option value="500KB-2MB" className="bg-[#0b132b]">500 KB – 2 MB</option>
              <option value="2MB-10MB" className="bg-[#0b132b]">2 MB – 10 MB</option>
              <option value=">10MB" className="bg-[#0b132b]">&gt; 10 MB</option>
            </select>
          </div>
        </div>

        {/* Format Filter Pills */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.08]">
          <span className="text-xs text-white/40 font-semibold mr-1 flex items-center gap-1 shrink-0">
            <FileText className="w-3.5 h-3.5" /> File Type:
          </span>
          {Object.entries(formatCounts).map(([fmt, count]) => (
            <button
              key={fmt}
              onClick={() => handleFormatChange(fmt)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFormat === fmt
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {fmt === 'All' ? 'All Files' : `.${fmt}`} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* ─── Source Files Table ─────────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-black/20 text-white/40 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold w-14">#</th>
                <th className="py-3.5 px-4 font-semibold">FILE NAME</th>
                <th className="py-3.5 px-4 font-semibold w-28">FORMAT</th>
                <th className="py-3.5 px-4 font-semibold w-36">FILE SIZE</th>
                <th className="py-3.5 px-4 font-semibold w-44">MODIFIED DATE</th>
                <th className="py-3.5 px-4 font-semibold text-right w-36">DOWNLOAD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/40">
                    No source files matching "{searchTerm}". Try clearing your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={(e) => handleDownload(item, e)}
                    className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                    title={`Click to download ${item.filename}`}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 font-mono text-white/30 text-[11px]">
                      {item.id}
                    </td>

                    {/* Exact File Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors font-mono text-xs break-all">
                            {item.filename}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Format */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        item.extension === 'XLSX' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        .{item.extension}
                      </span>
                    </td>

                    {/* File Size */}
                    <td className="py-3.5 px-4 font-mono text-white/80 font-medium text-xs">
                      {item.size_formatted}
                    </td>

                    {/* Modified Date */}
                    <td className="py-3.5 px-4 font-mono text-white/50 text-xs">
                      {item.date_modified || '—'}
                    </td>

                    {/* Download Button */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDownload(item, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          downloadingId === item.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 shadow-sm'
                        }`}
                        title="Download file"
                      >
                        {downloadingId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ────────────────────────────────────────── */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div className="flex items-center gap-4">
            <span>
              Showing {filteredAndSorted.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length.toLocaleString()} files
            </span>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-white/40">Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-white text-xs outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
            >
              First
            </button>

            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
            >
              Previous
            </button>
            
            <span className="px-3 py-1 font-mono text-white/80">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
            >
              Next
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
