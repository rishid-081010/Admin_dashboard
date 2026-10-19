import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, MapPin, Users, ChevronRight, Search, 
  ArrowLeft, X, Filter, ChevronDown, RefreshCw, Layers, 
  ChevronLeft, Compass, LayoutGrid, Check, Copy
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';
import Building360Detail from './Building360Detail';
import SearchableCombobox from './SearchableCombobox';

const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';

export default function Buildings() {
  // Navigation & Entity Type State
  const [activeTab, setActiveTab] = useState('building'); // 'building', 'community', 'single_unit'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('All');
  const [sortBy, setSortBy] = useState('most_owners');
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [serverBuildings, setServerBuildings] = useState([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);

  // Detail views state
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Tab totals state (verified database numbers)
  const [tabTotals, setTabTotals] = useState({
    totalCount: 0,
    totalUnits: 0,
    totalOwners: 0,
    contactCoverage: 0
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const [customPageInput, setCustomPageInput] = useState('');
  const customPageInputRef = useRef(null);

  // 1. Initial Load & Tab Switching
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedCommunity('All');
    fetchBuildingsData(activeTab);
  }, [activeTab]);

  // 2. URL Hash Deep-Linking & Browser History Handling
  useEffect(() => {
    function parseHash() {
      const hash = window.location.hash || '';
      const towerMatch = hash.match(/[?&]tower=([^&]+)/);
      if (towerMatch) {
        const towerName = decodeURIComponent(towerMatch[1]);
        loadBuildingByName(towerName);
      } else {
        setSelectedBuilding(null);
      }
    }

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Fetch specific building by canonical or raw name if deep linked
  const loadBuildingByName = async (name) => {
    try {
      const headers = { 
        apikey: SUPABASE_API_KEY, 
        Authorization: `Bearer ${SUPABASE_API_KEY}` 
      };
      const cleanName = encodeURIComponent(name.trim());
      const res = await axios.get(
        `${SUPABASE_BASE_URL}/canonical_buildings?or=(canonical_name.eq.${cleanName},building_name.eq.${cleanName})&limit=1`,
        { headers }
      );
      if (res.data && res.data.length > 0) {
        const row = res.data[0];
        setSelectedBuilding(mapCanonicalRow(row));
      }
    } catch (e) {
      console.error('Failed to load deep-linked building:', e);
    }
  };

  // Server-side debounced search across all 69k+ canonical entities in DB
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setServerBuildings([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingServer(true);
      try {
        const apikey = SUPABASE_API_KEY;
        const headers = { apikey, Authorization: `Bearer ${apikey}` };
        const q = encodeURIComponent(searchTerm.trim());
        
        // Search canonical_buildings by name or area
        const res = await axios.get(
          `${SUPABASE_BASE_URL}/canonical_buildings?entity_type=eq.${activeTab}&canonical_name=ilike.*${q}*&order=total_owners.desc&limit=150`,
          { headers }
        );

        if (res.data && res.data.length > 0) {
          const list = res.data.map(mapCanonicalRow);
          setServerBuildings(list);
        } else {
          setServerBuildings([]);
        }
      } catch (e) {
        console.error('Server search buildings error:', e);
      } finally {
        setIsSearchingServer(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  // Main Data Fetcher
  const fetchBuildingsData = async (type = 'building') => {
    setLoading(true);
    try {
      const apikey = SUPABASE_API_KEY;
      const headers = { apikey, Authorization: `Bearer ${apikey}` };

      // Load top 1000 entities of the selected type
      const res = await axios.get(
        `${SUPABASE_BASE_URL}/canonical_buildings?entity_type=eq.${type}&order=total_owners.desc&limit=1000`,
        { headers }
      );

      if (res.data && res.data.length > 0) {
        const list = res.data.map(mapCanonicalRow);
        setBuildings(list);

        // Compute verified aggregate numbers
        const sumUnits = list.reduce((acc, b) => acc + b.unitsCount, 0);
        const sumOwners = list.reduce((acc, b) => acc + b.ownersCount, 0);
        const sumContacts = list.reduce((acc, b) => acc + b.contactsCount, 0);
        const avgCoverage = sumOwners > 0 ? Math.round((sumContacts / sumOwners) * 100) : 0;

        setTabTotals({
          totalCount: list.length,
          totalUnits: sumUnits,
          totalOwners: sumOwners,
          contactCoverage: avgCoverage
        });
      } else {
        setBuildings([]);
        setTabTotals({ totalCount: 0, totalUnits: 0, totalOwners: 0, contactCoverage: 0 });
      }
    } catch (err) {
      console.error('Error fetching canonical buildings from Supabase:', err);
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper mapper to standard building model
  function mapCanonicalRow(row) {
    const rawBn = (row.primary_building_name || row.building_name || row.canonical_name || '').trim();
    const displayName = row.canonical_name || rawBn;
    const owners = Number(row.total_owners) || 0;
    const units = Number(row.total_units) || 0;
    const contacts = Number(row.total_contacts) || 0;
    const coverage = row.contact_coverage != null
      ? Math.round(Number(row.contact_coverage))
      : (owners > 0 ? Math.round((contacts / owners) * 100) : 0);

    return {
      rawName: rawBn,
      name: displayName,
      canonical_name: row.canonical_name || displayName,
      primary_building_name: row.primary_building_name || rawBn,
      area: (row.master_area && row.master_area !== 'null') ? row.master_area.toUpperCase() : 'DUBAI',
      propertyType: row.property_category || (row.entity_type === 'community' ? 'Master Community' : 'Residential'),
      entityType: row.entity_type || 'building',
      ownersCount: owners,
      unitsCount: units > 0 ? units : owners,
      contactsCount: contacts,
      contactCoverage: coverage,
      source_building_names: row.source_building_names || [rawBn],
      sourceCount: Number(row.source_count) || 1
    };
  }

  // Open building explore view with deep link URL hash
  const handleExploreBuilding = (bldg) => {
    setSelectedBuilding(bldg);
    const towerParam = encodeURIComponent(bldg.canonical_name || bldg.name);
    window.location.hash = `#buildings?tower=${towerParam}`;
  };

  // Handle Back from Building 360
  const handleBackFromBuilding = () => {
    setSelectedBuilding(null);
    window.location.hash = '#buildings';
  };

  // Active pool merging server search with local cached pool
  const activeBuildingsPool = useMemo(() => {
    if (searchTerm.trim().length >= 2 && serverBuildings.length > 0) {
      const mergedMap = new Map();
      serverBuildings.forEach(b => mergedMap.set(b.name.toLowerCase(), b));
      buildings.forEach(b => {
        if (!mergedMap.has(b.name.toLowerCase())) {
          mergedMap.set(b.name.toLowerCase(), b);
        }
      });
      return Array.from(mergedMap.values());
    }
    return buildings;
  }, [buildings, serverBuildings, searchTerm]);

  // Filter and Sort Buildings
  const filteredBuildings = useMemo(() => {
    return activeBuildingsPool
      .filter(b => {
        const matchesSearch = !searchTerm.trim() || 
          b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.propertyType.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCommunity = 
          selectedCommunity === 'All' || 
          b.area.toLowerCase() === selectedCommunity.toLowerCase();

        return matchesSearch && matchesCommunity;
      })
      .sort((a, b) => {
        if (sortBy === 'most_owners') return b.ownersCount - a.ownersCount;
        if (sortBy === 'most_units') return b.unitsCount - a.unitsCount;
        if (sortBy === 'coverage') return b.contactCoverage - a.contactCoverage;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [activeBuildingsPool, searchTerm, selectedCommunity, sortBy]);

  // Distinct Communities list for filter
  const communitiesList = useMemo(() => {
    const set = new Set();
    buildings.forEach(b => {
      if (b.area && b.area !== 'DUBAI' && b.area !== 'NULL' && b.area.length > 2) {
        set.add(b.area);
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [buildings]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage) || 1;
  const handleCustomPageSubmit = () => {
    const pageNum = parseInt(customPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setCustomPageInput('');
    }
  };

  const currentBuildings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBuildings.slice(start, start + itemsPerPage);
  }, [filteredBuildings, currentPage, itemsPerPage]);

  // Dynamic header KPI stats based on filtered view
  const currentViewStats = useMemo(() => {
    const totalOwners = filteredBuildings.reduce((acc, b) => acc + b.ownersCount, 0);
    const totalUnits = filteredBuildings.reduce((acc, b) => acc + b.unitsCount, 0);
    const totalContacts = filteredBuildings.reduce((acc, b) => acc + b.contactsCount, 0);
    const coverage = totalOwners > 0 ? Math.round((totalContacts / totalOwners) * 100) : 0;
    return { totalOwners, totalUnits, totalContacts, coverage };
  }, [filteredBuildings]);

  // If viewing an Owner 360 profile from Building 360
  if (selectedOwner) {
    return (
      <Owner360Detail 
        owner={selectedOwner} 
        onBack={() => setSelectedOwner(null)} 
        globalAgentName="Melanie Simsiman"
      />
    );
  }

  // If viewing a Building 360 profile (opens into the dedicated view)
  if (selectedBuilding) {
    return (
      <Building360Detail 
        building={selectedBuilding} 
        onBack={handleBackFromBuilding}
        onSelectOwner={(owner) => setSelectedOwner(owner)}
      />
    );
  }

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 relative">
      
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "Georgia, serif" }}>
            BUILDINGS &amp; COMMUNITIES
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verified Dubai property directory with canonical tower deduplication and real-time deed stats.
          </p>
        </div>

        {/* Aggregate Stats Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#0c1829] border border-[#233549] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl shadow-black/40">
            {activeTab === 'community' ? (
              <Compass className="w-4 h-4 text-emerald-400" />
            ) : (
              <Building2 className="w-4 h-4 text-blue-400" />
            )}
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono font-medium leading-none">
                {activeTab === 'community' ? 'Communities' : activeTab === 'single_unit' ? 'Plots' : 'Buildings'}
              </div>
              <div className="text-sm font-bold text-white leading-tight font-serif mt-0.5">
                {filteredBuildings.length.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-[#0c1829] border border-[#233549] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl shadow-black/40">
            <Layers className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono font-medium leading-none">Units</div>
              <div className="text-sm font-bold text-white leading-tight font-serif mt-0.5">
                {currentViewStats.totalUnits.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-[#0c1829] border border-[#233549] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl shadow-black/40">
            <Users className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono font-medium leading-none">Owners</div>
              <div className="text-sm font-bold text-white leading-tight font-serif mt-0.5">
                {currentViewStats.totalOwners.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Entity Category Filter Tabs ───────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab('building')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'building'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 font-bold'
              : 'bg-[#0c1829] text-slate-400 hover:text-white border-[#233549] hover:bg-[#122238]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Towers &amp; Buildings</span>
        </button>

        <button
          onClick={() => setActiveTab('community')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'community'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 font-bold'
              : 'bg-[#0c1829] text-slate-400 hover:text-white border-[#233549] hover:bg-[#122238]'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Communities &amp; Districts</span>
        </button>

        <button
          onClick={() => setActiveTab('single_unit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'single_unit'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 font-bold'
              : 'bg-[#0c1829] text-slate-400 hover:text-white border-[#233549] hover:bg-[#122238]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Plots &amp; Standalone Villas</span>
        </button>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-4 mb-6 shadow-xl shadow-black/40 flex-shrink-0 flex flex-col md:flex-row items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 w-full flex items-center bg-[#06111e] border border-[#1a2c42] rounded-xl px-4 py-2.5 transition-all focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30">
          <Search className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder={activeTab === 'community' ? "Search community or district..." : "Search tower, building name, or area..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-transparent text-[14px] text-white placeholder-slate-400 focus:outline-none"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="text-slate-400 hover:text-white p-1 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Community Searchable Combobox Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {activeTab !== 'community' && (
            <div className="w-full md:w-64">
              <SearchableCombobox
                value={selectedCommunity === 'All' ? `All Communities (${communitiesList.length - 1})` : selectedCommunity}
                onChange={(val) => {
                  setSelectedCommunity(val.startsWith('All') || val === 'All' ? 'All' : val);
                  setCurrentPage(1);
                }}
                options={communitiesList.filter(c => c !== 'All')}
                placeholder="Filter by community..."
                allLabel={`All Communities (${communitiesList.length - 1})`}
                className="w-full"
                triggerClassName="w-full bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] text-white text-[13px] rounded-xl px-3.5 py-2.5 font-medium"
              />
            </div>
          )}

          {/* Sort By Dropdown */}
          <div className="relative w-full md:w-44">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#06111e] border border-[#1a2c42] text-white text-[13px] rounded-xl px-3.5 py-2.5 appearance-none focus:outline-none focus:border-blue-500/60 cursor-pointer font-medium"
            >
              <option value="most_owners" className="bg-[#0c1829]">Most Owners</option>
              <option value="most_units" className="bg-[#0c1829]">Most Units</option>
              <option value="coverage" className="bg-[#0c1829]">Phone Coverage</option>
              <option value="name" className="bg-[#0c1829]">Name (A-Z)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button 
            onClick={() => fetchBuildingsData(activeTab)}
            title="Refresh buildings data"
            className="p-2.5 bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] rounded-xl text-slate-400 hover:text-white transition-all flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Buildings / Communities Grid ───────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-12 pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/40">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
            <p className="text-[15px] font-medium">Loading {activeTab === 'community' ? 'communities' : 'buildings'}...</p>
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-white/50 max-w-lg mx-auto mt-12">
            <Building2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Records Found</h3>
            <p className="text-sm text-white/50 mb-4">No records matched your search "{searchTerm}".</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCommunity('All'); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentBuildings.map((b, i) => (
              <div 
                key={`${b.name}-${i}`} 
                className="bg-[#0c1829] rounded-2xl border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 hover:shadow-2xl transition-all p-6 flex flex-col justify-between text-left group"
              >
                {/* Upper Section */}
                <div>
                  {/* Top Navy Icon Box */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#06111e] border border-[#1a2c42] flex items-center justify-center flex-shrink-0 shadow-sm">
                      {activeTab === 'community' ? (
                        <Compass className="w-5 h-5 text-emerald-400 stroke-[1.8]" />
                      ) : (
                        <Building2 className="w-5 h-5 text-sky-400 stroke-[1.8]" />
                      )}
                    </div>

                    {b.sourceCount > 1 && (
                      <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20" title={`Unified from ${b.sourceCount} deed naming variants`}>
                        {b.sourceCount} Variants Unified
                      </span>
                    )}
                  </div>

                  {/* Community Tag */}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 font-mono mb-1.5">
                    {b.area}
                  </div>

                  {/* Building / Community Title */}
                  <h3 
                    className="text-2xl font-bold font-serif text-white tracking-tight leading-snug mb-1 group-hover:text-blue-300 transition-colors"
                    title={b.name}
                  >
                    {b.name}
                  </h3>

                  {/* Subtitle / Classification */}
                  <div className="text-xs text-slate-400 font-normal pb-4 border-b border-[#1a2c42]">
                    <span>{b.propertyType}</span>
                  </div>

                  {/* 2-Column Key Metrics */}
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-serif text-white leading-none">
                        {b.unitsCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 font-medium mt-1">
                        Units
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-serif text-white leading-none">
                        {b.ownersCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 font-medium mt-1">
                        Owners
                      </div>
                    </div>
                  </div>

                  {/* Contacts Available Row */}
                  <div className="py-3 border-y border-[#1a2c42] flex items-center justify-between text-[13px]">
                    <span className="text-slate-300 font-medium">Contacts available</span>
                    <span className="font-bold text-white font-mono flex items-center gap-1.5">
                      <span>{b.contactsCount.toLocaleString()} / {b.ownersCount.toLocaleString()}</span>
                      <span className="text-emerald-400 text-xs font-semibold">({b.contactCoverage}%)</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-5">
                  <button
                    onClick={() => handleExploreBuilding(b)}
                    className="bg-[#06111e] hover:bg-[#122238] border border-[#233549] hover:border-[#385175] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] w-fit inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{activeTab === 'community' ? 'Explore community' : 'Explore building'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination Bar ─────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0c1829] border border-[#233549] rounded-2xl px-5 py-3.5 shadow-xl shadow-black/40">
            <div className="text-xs text-slate-400">
              Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, filteredBuildings.length)}</span> of <span className="text-white font-medium">{filteredBuildings.length.toLocaleString()}</span> records
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                onClick={() => customPageInputRef.current?.focus()}
                title="Click to jump to custom page"
                className="px-2.5 py-1 text-slate-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
              >
                Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-semibold"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Custom Page Input Box */}
              <div className="flex items-center gap-1.5 ml-2 pl-2.5 border-l border-[#233549]">
                <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Go to:</span>
                <input
                  ref={customPageInputRef}
                  type="number"
                  min={1}
                  max={totalPages}
                  value={customPageInput}
                  onChange={(e) => setCustomPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomPageSubmit();
                  }}
                  placeholder="Page #"
                  className="w-16 px-2 py-1 bg-[#06111e] border border-[#1a2c42] focus:border-blue-500 rounded-md text-white text-xs text-center font-mono outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={handleCustomPageSubmit}
                  disabled={!customPageInput || isNaN(parseInt(customPageInput, 10))}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
