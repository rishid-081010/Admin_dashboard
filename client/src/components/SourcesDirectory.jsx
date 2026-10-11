import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Search, Filter, Database, HardDrive, 
  Download, ExternalLink, CheckCircle2, MapPin, Layers, 
  FolderArchive, ArrowUpDown, ShieldCheck, Sparkles 
} from 'lucide-react';
import { SOURCES_DATA } from '../data/sourcesData';

export default function SourcesDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArea, setSelectedArea] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const PARQUET_URL = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/sources_catalog.parquet";

  // Categories count
  const categories = useMemo(() => {
    const counts = { 'All': SOURCES_DATA.length };
    SOURCES_DATA.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Top areas list
  const topAreas = useMemo(() => {
    const counts = {};
    SOURCES_DATA.forEach(s => {
      counts[s.area] = (counts[s.area] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([area, count]) => ({ area, count }));
  }, []);

  // Filtered files
  const filtered = useMemo(() => {
    return SOURCES_DATA.filter(item => {
      const matchesSearch = searchTerm.trim() === '' || 
        item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clean_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.area.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesArea = selectedArea === 'All' || item.area === selectedArea;

      return matchesSearch && matchesCat && matchesArea;
    });
  }, [searchTerm, selectedCategory, selectedArea]);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleAreaChange = (e) => {
    setSelectedArea(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in relative text-white/80 overflow-y-auto custom-scrollbar pr-1 -mr-1">
      
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono tracking-widest uppercase text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
              Source Ingestion Registry
            </span>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> 1,382 Files Cataloged
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
            DATA SOURCES
          </h1>
          <p className="text-white/60 text-sm max-w-2xl">
            Directory of all 1,382 raw vendor source files (2.16 GB) ingested into A-Squared Master Intelligence. Stored in high-compression Parquet format on Supabase.
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

      {/* ─── 4 Top KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Total Source Files */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Total Source Files</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">
              1,382
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              100% indexed in local registry
            </div>
          </div>
        </div>

        {/* Card 2: Raw Volume */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Raw Data Volume</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">
              2.16 GB
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Compressed zip: 1.69 GB
            </div>
          </div>
        </div>

        {/* Card 3: Extracted Records */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Unified Leads Generated</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight">
              2,234,192
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Cross-referenced in Supabase DB
            </div>
          </div>
        </div>

        {/* Card 4: Compressed Parquet Size */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Compressed Catalog Size</span>
            <FolderArchive className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400 tracking-tight">
              56.5 KB
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Parquet (Snappy) in Supabase Storage
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
              placeholder="Search 1,382 files by name, building, development (e.g. Kempinski, Palm, Business Bay, JLT)..."
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

          {/* Area Dropdown */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
            <MapPin className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-xs text-white/50 font-medium shrink-0">Area:</span>
            <select
              value={selectedArea}
              onChange={handleAreaChange}
              className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer"
            >
              <option value="All" className="bg-[#0b132b]">All Areas ({SOURCES_DATA.length})</option>
              {topAreas.map(({ area, count }) => (
                <option key={area} value={area} className="bg-[#0b132b]">
                  {area} ({count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.08] overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-xs text-white/40 font-semibold mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {Object.entries(categories).map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {cat} ({count})
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
                <th className="py-3.5 px-4 font-semibold">SOURCE FILE</th>
                <th className="py-3.5 px-4 font-semibold">TARGET COMMUNITY</th>
                <th className="py-3.5 px-4 font-semibold">CATEGORY</th>
                <th className="py-3.5 px-4 font-semibold">RAW FILE SIZE</th>
                <th className="py-3.5 px-4 font-semibold">EST. CONTACTS</th>
                <th className="py-3.5 px-4 font-semibold text-right">STATUS</th>
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
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                    
                    {/* Source File */}
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate max-w-md">
                            {item.clean_name}
                          </div>
                          <div className="text-[11px] font-mono text-white/40 truncate max-w-md mt-0.5">
                            {item.filename}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Target Community */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        {item.area}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {item.category}
                      </span>
                    </td>

                    {/* Raw File Size */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-white/80 font-medium">
                        {item.size_mb >= 1 ? `${item.size_mb} MB` : `${item.size_kb} KB`}
                      </div>
                      <div className="text-[10px] text-white/40">
                        .{item.extension} spreadsheet
                      </div>
                    </td>

                    {/* Est. Contacts */}
                    <td className="py-3 px-4">
                      {item.contacts ? (
                        <span className="font-bold text-white text-xs">
                          {item.contacts.toLocaleString()} contacts
                        </span>
                      ) : (
                        <span className="text-white/40 text-[11px]">
                          Master records
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Indexed in DB
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ────────────────────────────────────────── */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between text-xs text-white/60">
          <span>
            Showing {filtered.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length.toLocaleString()} source files
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
            >
              Previous
            </button>
            
            <button
              onClick={() => setCurrentPage(1)}
              className={`px-3 py-1 rounded-md font-medium ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 hover:text-white'}`}
            >
              1
            </button>
            
            {currentPage > 3 && <span className="px-2 py-1">...</span>}
            
            {currentPage > 2 && (
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white"
              >
                {currentPage - 1}
              </button>
            )}
            
            {currentPage !== 1 && currentPage !== totalPages && (
              <button className="px-3 py-1 bg-blue-600 text-white rounded-md font-medium">
                {currentPage}
              </button>
            )}
            
            {currentPage < totalPages - 1 && (
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white"
              >
                {currentPage + 1}
              </button>
            )}
            
            {currentPage < totalPages - 2 && <span className="px-2 py-1">...</span>}
            
            {totalPages > 1 && (
              <button
                onClick={() => setCurrentPage(totalPages)}
                className={`px-3 py-1 rounded-md font-medium ${currentPage === totalPages ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 hover:text-white'}`}
              >
                {totalPages}
              </button>
            )}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
