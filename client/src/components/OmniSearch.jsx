import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Building2, User, Phone, MapPin, ArrowRight, Filter, 
  X, ChevronRight, RefreshCw, Users, ShieldCheck, Check, Layers, 
  ArrowLeft, Mail, ExternalLink 
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';

const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';

function formatBuildingName(name) {
  if (!name) return 'Unknown Building';
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === 'burlington tower' || trimmed.toLowerCase() === 'burlington') return 'Burlington';
  const isAllCaps = trimmed === trimmed.toUpperCase();
  if (!isAllCaps) return trimmed;
  return trimmed
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bTower\b/i, 'Tower')
    .replace(/\bTowers\b/i, 'Towers')
    .replace(/\bJlt\b/i, 'JLT')
    .replace(/\bJvc\b/i, 'JVC')
    .replace(/\bJbr\b/i, 'JBR')
    .replace(/\bDamac\b/i, 'DAMAC');
}

function getBuildingCommunity(name, rawArea) {
  const n = (name || '').toLowerCase();
  if (n.includes('burlington')) return 'BUSINESS BAY';
  if (n.includes('burj khalifa') || n.includes('burj vista') || n.includes('downtown')) return 'DOWNTOWN DUBAI';
  if (n.includes('marina') || n.includes('beach vista') || n.includes('oceana')) return 'DUBAI MARINA';
  if (n.includes('belgravia') || n.includes('bloom') || n.includes('binghatti amber') || n.includes('beverly')) return 'JUMEIRAH VILLAGE CIRCLE';
  if (n.includes('damac hills') || n.includes('akoya') || n.includes('vardon')) return 'DAMAC HILLS';
  if (n.includes('palm') || n.includes('atlantis')) return 'PALM JUMEIRAH';
  if (n.includes('business central') || n.includes('almas')) return 'BUSINESS BAY';
  if (n.includes('creek')) return 'DUBAI CREEK HARBOUR';
  if (n.includes('hills estate')) return 'DUBAI HILLS ESTATE';
  if (rawArea && rawArea.toLowerCase() !== 'dubai' && rawArea.toLowerCase() !== 'null') return rawArea.toUpperCase();
  return 'DUBAI';
}

function getBuildingType(name, rawType) {
  const n = (name || '').toLowerCase();
  if (n.includes('burlington') || n.includes('office') || n.includes('business central') || n.includes('almas') || n.includes('commercial')) {
    return 'Commercial';
  }
  if (n.includes('villa') || n.includes('mansion') || n.includes('ranches')) {
    return 'Luxury Villa';
  }
  if (rawType && !['owner', 'unknown', 'n/a', 'flat'].includes(rawType.toLowerCase())) {
    return rawType.charAt(0).toUpperCase() + rawType.slice(1);
  }
  return 'Residential';
}

export default function OmniSearch({ onOpenBuildingTab }) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(false);
  
  // Results
  const [ownerResults, setOwnerResults] = useState([]);
  const [buildingResults, setBuildingResults] = useState([]);

  // Inside-Building Explorer State
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingOwners, setBuildingOwners] = useState([]);
  const [loadingBuildingOwners, setLoadingBuildingOwners] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Owner 360 Full Page View
  const [selectedOwner, setSelectedOwner] = useState(null);

  const handleSearch = async (overrideFilter, overrideQuery) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    const currentFilter = overrideFilter || filterType;
    if (q.length < 2) return;

    setLoading(true);
    const headers = { 
      apikey: SUPABASE_API_KEY, 
      Authorization: `Bearer ${SUPABASE_API_KEY}` 
    };

    try {
      if (currentFilter === 'Buildings') {
        // ── 1. BUILDINGS ONLY: Search building_name, aggregate into distinct building entities
        setOwnerResults([]);
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?building_name=ilike.*${encodeURIComponent(q)}*&select=owner_id,lead_id,full_name,building_name,master_area,unit_number,phone_normalized,reported_property_type,property_category&limit=250`;
        const res = await axios.get(endpoint, { headers });

        const bMap = {};
        (res.data || []).forEach(row => {
          const rawBn = (row.building_name || '').trim();
          if (!rawBn || rawBn.length < 2 || rawBn.toLowerCase() === 'null' || rawBn.toLowerCase() === 'n/a') return;
          const displayName = formatBuildingName(rawBn);
          const key = displayName.toLowerCase();
          if (!bMap[key]) {
            bMap[key] = {
              rawName: rawBn,
              name: displayName,
              area: getBuildingCommunity(rawBn, row.master_area),
              propertyType: row.property_category || getBuildingType(rawBn, row.reported_property_type),
              unitsSet: new Set(),
              ownersCount: 0,
              contactsCount: 0,
              sampleOwners: []
            };
          }
          bMap[key].ownersCount++;
          if (row.unit_number && String(row.unit_number).trim()) bMap[key].unitsSet.add(String(row.unit_number).trim());
          if (row.phone_normalized && String(row.phone_normalized).trim().length > 6) bMap[key].contactsCount++;
          if (bMap[key].sampleOwners.length < 40) {
            bMap[key].sampleOwners.push({
              id: row.owner_id || row.lead_id,
              lead_id: row.lead_id || `LEAD-${row.owner_id}`,
              name: row.full_name || 'Property Owner',
              unit: row.unit_number || 'N/A',
              phone: row.phone_normalized || 'N/A',
              area: bMap[key].area,
              building: displayName,
              type: bMap[key].propertyType
            });
          }
        });

        const list = Object.values(bMap).map(b => ({
          ...b,
          unitsCount: b.unitsSet.size > 0 ? b.unitsSet.size : b.ownersCount,
          contactCoverage: b.ownersCount > 0 ? Math.round((b.contactsCount / b.ownersCount) * 100) : 0
        })).sort((a, b) => b.ownersCount - a.ownersCount);

        setBuildingResults(list);
      } else if (currentFilter === 'Owners') {
        // ── 2. OWNERS ONLY: Search full_name or lead_id
        setBuildingResults([]);
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?or=(full_name.ilike.*${encodeURIComponent(q)}*,lead_id.ilike.*${encodeURIComponent(q)}*)&select=*&limit=50`;
        const res = await axios.get(endpoint, { headers });
        setOwnerResults(res.data || []);
      } else if (currentFilter === 'Phone Numbers') {
        // ── 3. PHONE NUMBERS ONLY
        setBuildingResults([]);
        const cleanDigits = q.replace(/[^0-9]/g, '');
        const phoneTerm = cleanDigits.length >= 4 ? cleanDigits : q;
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?phone_normalized=ilike.*${encodeURIComponent(phoneTerm)}*&select=*&limit=50`;
        const res = await axios.get(endpoint, { headers });
        setOwnerResults(res.data || []);
      } else {
        // ── 4. ALL: Combined intelligent search across buildings and owners
        // Fetch matching buildings
        const bEndpoint = `${SUPABASE_BASE_URL}/owners_data?building_name=ilike.*${encodeURIComponent(q)}*&select=owner_id,lead_id,full_name,building_name,master_area,unit_number,phone_normalized,reported_property_type,property_category&limit=150`;
        // Fetch matching owners/phones/units
        const cleanDigits = q.replace(/[^0-9]/g, '');
        let oFilter = `full_name.ilike.*${encodeURIComponent(q)}*,lead_id.ilike.*${encodeURIComponent(q)}*,unit_number.ilike.*${encodeURIComponent(q)}*`;
        if (cleanDigits.length >= 6) {
          oFilter += `,phone_normalized.ilike.*${encodeURIComponent(cleanDigits)}*`;
        }
        const oEndpoint = `${SUPABASE_BASE_URL}/owners_data?or=(${oFilter})&select=*&limit=50`;

        const [bRes, oRes] = await Promise.all([
          axios.get(bEndpoint, { headers }).catch(() => ({ data: [] })),
          axios.get(oEndpoint, { headers }).catch(() => ({ data: [] }))
        ]);

        const bMap = {};
        (bRes.data || []).forEach(row => {
          const rawBn = (row.building_name || '').trim();
          if (!rawBn || rawBn.length < 2 || rawBn.toLowerCase() === 'null' || rawBn.toLowerCase() === 'n/a') return;
          const displayName = formatBuildingName(rawBn);
          const key = displayName.toLowerCase();
          if (!bMap[key]) {
            bMap[key] = {
              rawName: rawBn,
              name: displayName,
              area: getBuildingCommunity(rawBn, row.master_area),
              propertyType: row.property_category || getBuildingType(rawBn, row.reported_property_type),
              unitsSet: new Set(),
              ownersCount: 0,
              contactsCount: 0,
              sampleOwners: []
            };
          }
          bMap[key].ownersCount++;
          if (row.unit_number && String(row.unit_number).trim()) bMap[key].unitsSet.add(String(row.unit_number).trim());
          if (row.phone_normalized && String(row.phone_normalized).trim().length > 6) bMap[key].contactsCount++;
        });

        const bList = Object.values(bMap).map(b => ({
          ...b,
          unitsCount: b.unitsSet.size > 0 ? b.unitsSet.size : b.ownersCount,
          contactCoverage: b.ownersCount > 0 ? Math.round((b.contactsCount / b.ownersCount) * 100) : 0
        })).sort((a, b) => b.ownersCount - a.ownersCount);

        setBuildingResults(bList);
        setOwnerResults(oRes.data || []);
      }
    } catch (err) {
      console.error('OmniSearch query failed:', err);
      setOwnerResults([]);
      setBuildingResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-run search whenever filter pill is clicked if there is already a query
  const handleFilterPillClick = (newFilter) => {
    setFilterType(newFilter);
    if (query.trim().length >= 2) {
      handleSearch(newFilter);
    }
  };

  // ── Explore Inside Building ────────────────────────────────────────────────
  const handleExploreBuilding = async (building) => {
    setSelectedBuilding(building);
    setDrawerSearch('');
    setLoadingBuildingOwners(true);
    try {
      const headers = { 
        apikey: SUPABASE_API_KEY, 
        Authorization: `Bearer ${SUPABASE_API_KEY}` 
      };
      const q = encodeURIComponent(building.rawName);
      const res = await axios.get(
        `${SUPABASE_BASE_URL}/owners_data?building_name=ilike.*${q}*&select=*&limit=100`,
        { headers }
      );
      if (res.data && res.data.length > 0) {
        setBuildingOwners(res.data.map((r, i) => ({
          id: r.owner_id || r.lead_id || `OWN-${r.id || i}`,
          lead_id: r.lead_id || `LEAD-${String(r.id || 1000 + i).padStart(5, '0')}`,
          name: r.full_name || 'Property Owner',
          unit: r.unit_number || 'N/A',
          phone: r.phone_normalized || 'N/A',
          email: r.email || 'N/A',
          area: building.area,
          building: building.name,
          type: building.propertyType,
          property_category: r.property_category || building.propertyType,
          bitrix_id: r.bitrix_id,
          bitrix_status: r.bitrix_status
        })));
      } else {
        setBuildingOwners(building.sampleOwners || []);
      }
    } catch (e) {
      console.error('Error fetching building owners:', e);
      setBuildingOwners(building.sampleOwners || []);
    } finally {
      setLoadingBuildingOwners(false);
    }
  };

  const copyPhone = (phone, e) => {
    e.stopPropagation();
    if (!phone || phone === 'N/A') return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  const filteredDrawerOwners = useMemo(() => {
    if (!drawerSearch.trim()) return buildingOwners;
    const q = drawerSearch.toLowerCase();
    return buildingOwners.filter(o => 
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.unit && String(o.unit).toLowerCase().includes(q)) ||
      (o.phone && String(o.phone).includes(q))
    );
  }, [buildingOwners, drawerSearch]);

  // If an Owner 360 profile is open, render it full page
  if (selectedOwner) {
    return (
      <Owner360Detail 
        owner={selectedOwner} 
        onBack={() => setSelectedOwner(null)}
        globalAgentName="Melanie Simsiman"
      />
    );
  }

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80 relative">
      <div className="flex flex-col items-center justify-center mt-4 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-1.5" style={{ fontFamily: "Georgia, serif" }}>
          SEARCH DATABASE
        </h1>
        <p className="text-white/50 text-xs sm:text-sm text-center">
          Search across 3.04 million property owners, buildings, units, and phone numbers in Dubai.
        </p>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0">
        
        {/* Big Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-6 sm:w-7 h-6 sm:h-7 text-[#3b82f6]" />
          <input
            type="text"
            placeholder={
              filterType === 'Buildings'
                ? "Search building name or tower (e.g. Burj Khalifa, Marina Gate)..."
                : filterType === 'Owners'
                ? "Search owner name or Lead ID..."
                : filterType === 'Phone Numbers'
                ? "Search phone number (e.g. +97150...)..."
                : "Search owner name, phone number, building, or unit number..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-[#03152d]/90 border-2 border-white/10 focus:border-[#3b82f6] rounded-2xl pl-16 sm:pl-18 pr-16 py-4 sm:py-5 text-base sm:text-lg text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/20 transition-all shadow-2xl backdrop-blur-xl"
          />
          <button 
            onClick={() => handleSearch()} 
            className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-[#3b82f6] hover:bg-[#2563eb] text-white p-2.5 sm:p-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 cursor-pointer"
            title="Search"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-1.5 text-white/50 text-xs font-bold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Search Filters:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['All', 'Owners', 'Buildings', 'Phone Numbers'].map(f => (
              <button 
                key={f}
                onClick={() => handleFilterPillClick(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filterType === f 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400' 
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        {/* Results Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-8 pr-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-white/50">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-400 mb-2" />
              <p className="text-sm">Searching database records...</p>
            </div>
          )}

          {/* ─── 1. BUILDINGS RESULTS VIEW (Only buildings appear!) ───────────── */}
          {!loading && filterType === 'Buildings' && (
            <div className="space-y-3">
              {buildingResults.length > 0 && (
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                  Found {buildingResults.length} matching {buildingResults.length === 1 ? 'building' : 'buildings'}:
                </div>
              )}
              {buildingResults.map((b) => (
                <div 
                  key={b.rawName}
                  onClick={() => handleExploreBuilding(b)}
                  className="bg-[#03152d]/90 hover:bg-[#07244d] border border-white/10 hover:border-blue-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all cursor-pointer shadow-xl group hover:scale-[1.005]"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition-all flex-shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-white font-bold text-base sm:text-lg group-hover:text-blue-300 transition-colors truncate">
                          {b.name}
                        </h3>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300">
                          {b.area}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          b.propertyType === 'Commercial' 
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
                            : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                        }`}>
                          {b.propertyType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-white/60 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <strong className="text-white">{b.ownersCount}</strong> Owners
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          <strong className="text-white">{b.unitsCount}</strong> Units in DB
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <Phone className="w-3.5 h-3.5" />
                          {b.contactCoverage}% Phone Coverage ({b.contactsCount} phones)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExploreBuilding(b);
                    }}
                    className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 flex-shrink-0 shadow-sm group-hover:bg-blue-600 cursor-pointer"
                  >
                    <span>Explore building</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ─── 2. OWNERS & PHONE RESULTS VIEW ───────────────────────────────── */}
          {!loading && (filterType === 'Owners' || filterType === 'Phone Numbers') && (
            <div className="space-y-3">
              {ownerResults.map((r, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedOwner(r)}
                  className="bg-[#03152d]/90 hover:bg-[#07244d] border border-white/10 hover:border-blue-500/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer shadow-xl group hover:scale-[1.005]"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-sm flex-shrink-0">
                      {r.full_name ? String(r.full_name).charAt(0) : 'O'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold text-base group-hover:text-blue-300 transition-colors truncate">
                          {r.full_name || 'Property Owner'}
                        </h3>
                        {r.lead_id && (
                          <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            {r.lead_id}
                          </span>
                        )}
                        {r.property_category && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            r.property_category === 'Commercial'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                              : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                          }`}>
                            {r.property_category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-white/60 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-400"/> 
                          {r.building_name || 'Dubai'}
                        </span>
                        {r.unit_number && (
                          <span className="bg-blue-500/20 text-blue-300 text-[11px] px-1.5 py-0.5 rounded-md font-mono font-bold border border-blue-500/30">
                            Unit {r.unit_number}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <Phone className="w-3.5 h-3.5"/> 
                          {r.phone_normalized || 'No phone'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOwner(r);
                    }}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 rounded-xl text-xs font-bold text-white transition-all flex-shrink-0 cursor-pointer shadow-sm group-hover:bg-blue-600"
                  >
                    View 360
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ─── 3. COMBINED "ALL" RESULTS VIEW ──────────────────────────────── */}
          {!loading && filterType === 'All' && (
            <div className="space-y-6">
              {/* Buildings Section */}
              {buildingResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">
                      Matching Buildings ({buildingResults.length})
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {buildingResults.slice(0, 4).map((b) => (
                      <div 
                        key={b.rawName}
                        onClick={() => handleExploreBuilding(b)}
                        className="bg-[#03152d]/90 hover:bg-[#07244d] border border-white/10 hover:border-blue-500/50 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all cursor-pointer shadow-xl group hover:scale-[1.005]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-bold text-base group-hover:text-blue-300 transition-colors truncate">
                                {b.name}
                              </h3>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20">
                                {b.area}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-white/60 mt-0.5">
                              <span><strong>{b.ownersCount}</strong> Owners</span>
                              <span>•</span>
                              <span><strong>{b.unitsCount}</strong> Units</span>
                              <span>•</span>
                              <span className="text-emerald-400">{b.contactCoverage}% Phones</span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExploreBuilding(b);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer group-hover:bg-blue-600"
                        >
                          <span>Explore</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owners Section */}
              {ownerResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-blue-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white/70">
                      Matching Owner Profiles ({ownerResults.length})
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {ownerResults.map((r, i) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedOwner(r)}
                        className="bg-[#03152d]/90 hover:bg-[#07244d] border border-white/10 hover:border-blue-500/50 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all cursor-pointer shadow-xl group hover:scale-[1.005]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-sm flex-shrink-0">
                            {r.full_name ? String(r.full_name).charAt(0) : 'O'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-bold text-base group-hover:text-blue-300 transition-colors truncate">
                                {r.full_name || 'Property Owner'}
                              </h3>
                              {r.lead_id && (
                                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                  {r.lead_id}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-white/60 mt-0.5 flex-wrap">
                              <span>{r.building_name || 'Dubai'}</span>
                              {r.unit_number && <span>Unit {r.unit_number}</span>}
                              <span className="font-mono text-emerald-400">{r.phone_normalized || 'No phone'}</span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOwner(r);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 rounded-xl text-xs font-bold text-white transition-all flex-shrink-0 cursor-pointer shadow-sm group-hover:bg-blue-600"
                        >
                          View 360
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && query.length >= 2 && buildingResults.length === 0 && ownerResults.length === 0 && (
            <div className="text-center text-white/40 py-16">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30 text-blue-400" />
              <p className="text-base font-semibold text-white/70">No results found for "{query}"</p>
              <p className="text-xs text-white/40 mt-1">Try another search keyword or switch filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Explore Building Slide-Over Drawer (Takes user INSIDE the building) ── */}
      {selectedBuilding && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-fade-in">
          {/* Backdrop click to close */}
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => setSelectedBuilding(null)}
          />

          {/* Drawer Content */}
          <div className="w-full max-w-2xl bg-[#021024] border-l border-white/15 h-full flex flex-col shadow-2xl animate-slide-left relative overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/10 bg-[#03152d]/95 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-mono">
                    {selectedBuilding.area}
                  </div>
                  <h2 className="text-2xl font-bold font-serif text-white tracking-tight leading-snug">
                    {selectedBuilding.name}
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    {selectedBuilding.propertyType} • Verified owners registry
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBuilding(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-black/20 border-b border-white/10">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-white/40 uppercase font-mono font-medium">Units in DB</div>
                <div className="text-xl font-bold font-serif text-white mt-0.5">
                  {selectedBuilding.unitsCount}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-white/40 uppercase font-mono font-medium">Profiles</div>
                <div className="text-xl font-bold font-serif text-white mt-0.5">
                  {selectedBuilding.ownersCount}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-white/40 uppercase font-mono font-medium">Phones</div>
                <div className="text-xl font-bold font-serif text-emerald-400 mt-0.5">
                  {selectedBuilding.contactsCount} / {selectedBuilding.ownersCount}
                </div>
              </div>
            </div>

            {/* Search filter inside Drawer */}
            <div className="p-4 border-b border-white/10 bg-black/10">
              <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-3.5 py-2">
                <Search className="w-4 h-4 text-white/40 mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Filter by owner name, unit #, or phone..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
                />
                {drawerSearch && (
                  <button onClick={() => setDrawerSearch('')} className="text-white/40 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Owners Inside Building List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2.5">
              {loadingBuildingOwners ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/40">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mb-2" />
                  <p className="text-xs">Fetching verified owner records in {selectedBuilding.name}...</p>
                </div>
              ) : filteredDrawerOwners.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No owner records match your filter.</p>
                </div>
              ) : (
                filteredDrawerOwners.map((owner, idx) => (
                  <div
                    key={`${owner.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Unit Badge */}
                      <div className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-xs font-bold flex-shrink-0">
                        Unit {owner.unit !== 'N/A' ? owner.unit : '—'}
                      </div>

                      {/* Owner Details */}
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-white tracking-tight truncate group-hover:text-blue-300 transition-colors">
                          {owner.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/50 flex-wrap">
                          <span className="font-mono text-white/40">{owner.lead_id}</span>
                          <span>•</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3 h-3" /> Verified Owner
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Phone & Owner 360 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {owner.phone && owner.phone !== 'N/A' ? (
                        <button
                          onClick={(e) => copyPhone(owner.phone, e)}
                          title="Click to copy phone"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedPhone === owner.phone ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{owner.phone}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/30 text-xs font-medium">
                          Unlisted
                        </span>
                      )}

                      {/* View Owner 360 */}
                      <button
                        onClick={() => {
                          setSelectedOwner(owner);
                          setSelectedBuilding(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                      >
                        <span>Owner 360</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 bg-[#03152d]/95 flex items-center justify-between text-xs text-white/50">
              <span>Showing {filteredDrawerOwners.length} owners in {selectedBuilding.name}</span>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
