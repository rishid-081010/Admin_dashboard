import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, ArrowLeft, Search, Download, Phone, Check, 
  Layers, Users, ChevronRight, Filter, Sparkles, Copy, ExternalLink, 
  RefreshCw, MapPin, CheckCircle2, ChevronLeft, ArrowUpRight, Hash,
  LayoutGrid, ListFilter
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

// Retrieve authentic verified size or mark as unspecified
function getVerifiedSizeMetrics(record) {
  const sqft = Number(record?.verified_size_sqft);
  if (sqft && sqft > 0) {
    const sqm = Math.round(sqft / 10.7639);
    return { sqm, sqft, isVerified: true };
  }
  return { sqm: null, sqft: null, isVerified: false };
}

// Sanitize unit numbers (e.g. ingested vendor DOB dates like '1977-12-04' -> 'Unit Unspecified', strip trailing -0 export artifacts)
function sanitizeUnitNumber(rawUnit) {
  if (!rawUnit || rawUnit === 'N/A' || rawUnit === 'null' || rawUnit === '-') return '—';
  let str = String(rawUnit).trim();
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    return 'Unit Unspecified';
  }
  // Strip trailing -0 or -00 export artifacts (e.g. 102-0 -> 102, 1406-0 -> 1406)
  str = str.replace(/^(\d+)-0+$/, '$1');
  str = str.replace(/^(?:APT|UNIT|FLAT|VILLA|SUITE)?\s*([A-Za-z0-9_-]+)-0+$/i, '$1');
  const cleaned = str.replace(/[-_,\s]+$/, '');
  return cleaned || '—';
}

function getFloorFromUnit(unit) {
  if (!unit || unit === '—' || unit === 'N/A' || unit === 'Unit Unspecified') return 'G';
  const str = String(unit).trim().toUpperCase();
  if (/^PH/i.test(str)) return 'PH';
  if (/^TH/i.test(str)) return 'TH';
  if (/^B\d/i.test(str)) return str.slice(0, 2);
  if (/^M/i.test(str)) return 'M';
  if (/^G/i.test(str)) return 'G';

  // Strip any trailing -0 first just in case
  const cleanStr = str.replace(/^(\d+)-0+$/, '$1');
  const clean = cleanStr.replace(/[^\d]/g, '');
  if (!clean) return 'G';
  if (clean.length <= 2) return '1';
  if (clean.length === 3) return clean.slice(0, 1);
  return clean.slice(0, clean.length - 2);
}

function isCommercialUnit(type, category, reportedType) {
  if (category && String(category).toLowerCase() === 'commercial') return true;
  const combined = `${type || ''} ${reportedType || ''}`.toLowerCase();
  return /commercial|office|shop|retail|hotel|warehouse|showroom|land|business|restaurant|store|clinic/i.test(combined);
}

function resolveBuildingUnitType(r, building = {}) {
  if (r.verified_property_type && !/^(?:null|nan|unknown|owner|buyer|tenant)$/i.test(r.verified_property_type)) {
    return r.verified_property_type;
  }
  const rep = (r.reported_property_type || '').trim();
  if (rep && !/^(?:owner|buyer|tenant|unit owner|unknown|nan|null|n\/a|-)$/i.test(rep)) {
    return rep;
  }
  const bldgName = (r.building_name || building.name || '').toLowerCase();
  if (bldgName.includes('villa') || bldgName.includes('townhouse') || bldgName.includes('mira') || bldgName.includes('damac hills') || bldgName.includes('arabian ranches')) {
    return 'Villa / Townhouse';
  }
  if (bldgName.includes('plot') || bldgName.includes('land')) {
    return 'Land Plot';
  }
  if (bldgName.includes('office') || (bldgName.includes('tower') && bldgName.includes('commercial'))) {
    return 'Commercial Office';
  }
  return r.property_category || building.propertyType || 'Apartment / Residential';
}

export default function Building360Detail({ building, onBack, onSelectOwner, initialOwners = [] }) {
  const [owners, setOwners] = useState(initialOwners);
  const [loading, setLoading] = useState(!initialOwners || initialOwners.length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('all'); // 'all', 'with_phone', 'unlisted', 'commercial', 'residential'
  const [sortBy, setSortBy] = useState('unit_asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [copiedTowerName, setCopiedTowerName] = useState(false);
  const [selectedOwnerFor360, setSelectedOwnerFor360] = useState(null);
  const [buildingStats, setBuildingStats] = useState({
    ownersCount: building?.ownersCount || 0,
    unitsCount: building?.unitsCount || 0,
    contactsCount: building?.contactsCount || 0,
    contactCoverage: building?.contactCoverage || 0,
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [customPageInput, setCustomPageInput] = useState('');
  const customPageInputRef = useRef(null);

  // Fetch verified unit roster and building stats from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadBuildingUnits() {
      if (!building || (!building.rawName && !building.name)) return;
      
      setLoading(true);
      try {
        const headers = { 
          apikey: SUPABASE_API_KEY, 
          Authorization: `Bearer ${SUPABASE_API_KEY}` 
        };
        const rawBn = (building.rawName || building.name || '').trim();

        // If buildingStats not yet populated with aggregate numbers, fetch from canonical_buildings
        if (!building?.ownersCount) {
          try {
            const statsRes = await axios.get(
              `${SUPABASE_BASE_URL}/canonical_buildings?canonical_name=eq.${encodeURIComponent(building.canonical_name || rawBn)}&limit=1`,
              { headers }
            );
            if (isMounted && statsRes.data && statsRes.data[0]) {
              const s = statsRes.data[0];
              const oCount = Number(s.total_owners) || 0;
              const uCount = Number(s.total_units) || 0;
              const cCount = Number(s.total_contacts) || 0;
              const cov = s.contact_coverage != null
                ? Math.round(Number(s.contact_coverage))
                : (oCount > 0 ? Math.round((cCount / oCount) * 100) : 0);
              setBuildingStats({
                ownersCount: oCount,
                unitsCount: uCount,
                contactsCount: cCount,
                contactCoverage: cov
              });
            }
          } catch (e) {
            console.error('Failed to load building aggregate stats:', e);
          }
        }

        // Universal canonical filter: matches all source casing variants without one-off hacks
        let searchFilter;
        if (building.source_building_names && Array.isArray(building.source_building_names) && building.source_building_names.length > 0) {
          const formattedNames = building.source_building_names.map(n => `"${n.trim()}"`).join(',');
          searchFilter = `building_name=in.(${formattedNames})`;
        } else {
          searchFilter = `building_name=ilike.${encodeURIComponent(rawBn)}`;
        }

        // Fetch complete unit roster in chunks of 1000 without 500-unit truncation
        let allRecords = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore && isMounted) {
          const endpoint = `${SUPABASE_BASE_URL}/owners_data?${searchFilter}&select=owner_id,lead_id,full_name,building_name,master_area,unit_number,phone_normalized,email,property_category,reported_property_type,bitrix_id,verified_purchase_price,verified_size_sqft,emirates_id&limit=${batchSize}&offset=${offset}`;
          let res = await axios.get(endpoint, { headers });

          if (!res.data || res.data.length === 0) {
            if (offset === 0) {
              // Fallback to exact eq search in case in.(...) was not matched
              const fallbackEndpoint = `${SUPABASE_BASE_URL}/owners_data?building_name=eq.${encodeURIComponent(rawBn)}&select=owner_id,lead_id,full_name,building_name,master_area,unit_number,phone_normalized,email,property_category,reported_property_type,bitrix_id,verified_purchase_price,verified_size_sqft,emirates_id&limit=${batchSize}`;
              res = await axios.get(fallbackEndpoint, { headers });
              if (res.data && res.data.length > 0) {
                allRecords = res.data;
              }
            }
            hasMore = false;
          } else {
            allRecords = allRecords.concat(res.data);
            offset += res.data.length;
            if (res.data.length < batchSize || allRecords.length >= 10000) {
              hasMore = false;
            }
          }
        }

        if (isMounted && allRecords.length > 0) {
          const mapped = allRecords.map((r, i) => {
            const rawUnit = r.unit_number ? String(r.unit_number).trim() : 'N/A';
            const unit = sanitizeUnitNumber(rawUnit);
            const rawName = (r.full_name || '').trim();
            const cleanName = (!rawName || rawName === '_' || rawName === 'null' || rawName === '-') 
              ? `Verified Owner (${unit !== '—' && unit !== 'Unit Unspecified' ? 'Unit ' + unit : building.name})` 
              : rawName;
            
            const propType = resolveBuildingUnitType(r, building);
            const sizeMetrics = getVerifiedSizeMetrics(r);
            const hasPhone = Boolean(r.phone_normalized && String(r.phone_normalized).trim().length > 6);
            const floor = getFloorFromUnit(unit);

            return {
              id: r.owner_id || r.lead_id || `OWN-${i + 1}`,
              sample_owner_id: r.owner_id,
              emirates_id: r.emirates_id || null,
              raw_full_name: r.full_name,
              match_criteria: r.emirates_id ? 'EMIRATES_ID' : (r.phone_normalized ? 'MOBILE_AND_NAME' : null),
              lead_id: r.lead_id || `LEAD-${r.owner_id || (10400 + i)}`,
              name: cleanName,
              unit: unit,
              floor: floor,
              phone: hasPhone ? r.phone_normalized : null,
              phone_normalized: hasPhone ? r.phone_normalized : null,
              hasPhone: hasPhone,
              email: r.email || 'N/A',
              area: r.master_area || building.area || 'Dubai',
              building: building.name,
              type: propType,
              sqm: sizeMetrics.sqm,
              sqft: sizeMetrics.sqft,
              isVerifiedSize: sizeMetrics.isVerified,
              crmStatus: hasPhone ? 'Synced' : 'Draft',
              bitrix_id: r.bitrix_id,
              rawRecord: r
            };
          });
          setOwners(mapped);
        }
      } catch (err) {
        console.error('Failed to load building units from Supabase:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBuildingUnits();
    return () => { isMounted = false; };
  }, [building]);

  // Derived stats: dynamically prioritizes whichever is higher between canonical snapshot and live fetched deeds
  const metrics = useMemo(() => {
    const totalOwners = Math.max(owners.length, buildingStats.ownersCount || building?.ownersCount || 0);
    const unitsSet = new Set(owners.map(o => o.unit).filter(u => u && u !== 'N/A'));
    const verifiedUnits = Math.max(unitsSet.size > 0 ? unitsSet.size : owners.length, buildingStats.unitsCount || building?.unitsCount || 0);
    const withPhone = buildingStats.contactsCount != null && buildingStats.contactsCount > 0 
      ? Math.max(buildingStats.contactsCount, owners.filter(o => o.hasPhone).length)
      : (building?.contactsCount != null && building?.contactsCount > 0 ? building.contactsCount : owners.filter(o => o.hasPhone).length);
    const phoneCoverage = buildingStats.contactCoverage != null && buildingStats.contactCoverage > 0
      ? buildingStats.contactCoverage
      : (building?.contactCoverage != null && building?.contactCoverage > 0 ? building.contactCoverage : (totalOwners > 0 ? Math.round((withPhone / totalOwners) * 100) : 0));

    return {
      totalOwners,
      verifiedUnits,
      withPhone,
      phoneCoverage
    };
  }, [owners, building, buildingStats]);

  // Filter & Sort
  const filteredOwners = useMemo(() => {
    return owners.filter(o => {
      if (unitFilter === 'with_phone' && !o.hasPhone) return false;
      if (unitFilter === 'unlisted' && o.hasPhone) return false;
      if (unitFilter === 'commercial' && !isCommercialUnit(o.type, o.rawRecord?.property_category, o.rawRecord?.reported_property_type)) return false;
      if (unitFilter === 'residential' && isCommercialUnit(o.type, o.rawRecord?.property_category, o.rawRecord?.reported_property_type)) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.unit && String(o.unit).toLowerCase().includes(q)) ||
        (o.phone && String(o.phone).includes(q)) ||
        (o.lead_id && o.lead_id.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      if (sortBy === 'unit_asc') {
        const cleanA = String(a.unit || '').replace(/^(\d+)-0+$/, '$1');
        const cleanB = String(b.unit || '').replace(/^(\d+)-0+$/, '$1');
        const numA = parseInt(cleanA.replace(/[^\d]/g, ''), 10) || 0;
        const numB = parseInt(cleanB.replace(/[^\d]/g, ''), 10) || 0;
        return numA - numB;
      }
      if (sortBy === 'unit_desc') {
        const cleanA = String(a.unit || '').replace(/^(\d+)-0+$/, '$1');
        const cleanB = String(b.unit || '').replace(/^(\d+)-0+$/, '$1');
        const numA = parseInt(cleanA.replace(/[^\d]/g, ''), 10) || 0;
        const numB = parseInt(cleanB.replace(/[^\d]/g, ''), 10) || 0;
        return numB - numA;
      }
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'floor_desc') {
        const fA = parseInt(a.floor, 10) || 0;
        const fB = parseInt(b.floor, 10) || 0;
        return fB - fA;
      }
      return 0;
    });
  }, [owners, searchTerm, unitFilter, sortBy]);

  // Paginated records
  const totalPages = Math.ceil(filteredOwners.length / pageSize) || 1;
  const handleCustomPageSubmit = () => {
    const pageNum = parseInt(customPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setCustomPageInput('');
    }
  };

  const paginatedOwners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOwners.slice(start, start + pageSize);
  }, [filteredOwners, currentPage, pageSize]);

  const copyPhone = (phone, e) => {
    if (e) e.stopPropagation();
    if (!phone || phone === 'N/A') return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(phone)
        .then(() => {
          setCopiedPhone(phone);
          setTimeout(() => setCopiedPhone(null), 1800);
        })
        .catch(() => {});
    }
  };

  const copyTowerName = (e) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(building.name)
        .then(() => {
          setCopiedTowerName(true);
          setTimeout(() => setCopiedTowerName(false), 1800);
        })
        .catch(() => {});
    }
  };

  const handleExportCsv = () => {
    if (!owners.length) return;
    const headers = ['Unit Number', 'Floor', 'Owner Name', 'Lead ID', 'Phone Number', 'Property Type', 'Size SQM', 'Size SQFT', 'Area', 'CRM Status'];
    const rows = owners.map(o => [
      `"${String(o.unit || '').replace(/"/g, '""')}"`,
      `"${String(o.floor || '').replace(/"/g, '""')}"`,
      `"${String(o.name || '').replace(/"/g, '""')}"`,
      `"${String(o.lead_id || '').replace(/"/g, '""')}"`,
      `"${String(o.phone || '').replace(/"/g, '""')}"`,
      `"${String(o.type || '').replace(/"/g, '""')}"`,
      o.isVerifiedSize ? o.sqm : '',
      o.isVerifiedSize ? o.sqft : '',
      `"${String(o.area || '').replace(/"/g, '""')}"`,
      `"${String(o.crmStatus || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', blobUrl);
    const fileName = (building.canonical_name || building.name || 'Building').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
    link.setAttribute('download', `${fileName}_Verified_Units.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const handleOpenOwner = (owner) => {
    if (onSelectOwner) {
      onSelectOwner(owner);
    } else {
      setSelectedOwnerFor360(owner);
    }
  };

  // If viewing an Owner 360 profile inside Building 360
  if (selectedOwnerFor360) {
    return (
      <Owner360Detail 
        owner={selectedOwnerFor360} 
        onBack={() => setSelectedOwnerFor360(null)}
        globalAgentName="Melanie Simsiman"
      />
    );
  }

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 overflow-y-auto custom-scrollbar select-text pr-1 -mr-1">
      
      {/* ── 1. Top Navigation & Breadcrumbs Bar ─────────────────────── */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-all group shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-white/40 font-mono truncate">
            <span>BUILDINGS</span>
            <span>/</span>
            <span className="text-white/60 uppercase">{building.area || 'DUBAI'}</span>
            <span>/</span>
            <span className="text-blue-400 font-bold truncate">{building.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={copyTowerName}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-all"
            title="Copy Tower Name"
          >
            {copiedTowerName ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTowerName ? 'Copied' : 'Copy Name'}</span>
          </button>

          <button 
            onClick={handleExportCsv}
            disabled={owners.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── 2. Building 360 Hero Banner ────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 sm:p-6 mb-5 shadow-xl shadow-black/40 relative overflow-hidden shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Left: Building Identity */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 shadow-lg">
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="min-w-0">
              <h1 
                className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight truncate font-sans" 
              >
                {building.name}
              </h1>

              <div className="text-slate-400 text-xs mt-1">
                {building.area ? `${building.area} · ` : ''}{building.propertyType || 'Residential'}
              </div>
            </div>
          </div>

          {/* Right: 4 Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:max-w-xl w-full">
            <div className="bg-[#06111e] border border-[#1b2b3d] rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Units</div>
              <div className="text-xl sm:text-2xl font-bold font-sans text-white mt-0.5">
                {metrics.verifiedUnits.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#06111e] border border-[#1b2b3d] rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-medium">Owners</div>
              <div className="text-xl sm:text-2xl font-bold font-sans text-white mt-0.5">
                {metrics.totalOwners.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#06111e] border border-[#1b2b3d] rounded-xl p-3 text-center col-span-2 sm:col-span-2">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-medium flex items-center justify-center gap-1.5">
                <span>With Phone</span>
                <span className="text-emerald-400 font-bold">({metrics.phoneCoverage}%)</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-sans text-emerald-400 mt-0.5">
                {metrics.withPhone.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {metrics.totalOwners.toLocaleString()}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-[#1b2b3d] h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, metrics.phoneCoverage)}%` }} 
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. Search & Filter Bar ──────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-4 mb-4 shadow-xl shadow-black/40 shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="flex-1 flex items-center bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
          <Search className="w-4 h-4 text-white/40 mr-2.5 shrink-0" />
          <input 
            type="text"
            placeholder="Search by owner name, unit #, phone number, or Lead ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
          />
        </div>

        {/* Filter Tabs & Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 overflow-x-auto">
            {[
              { id: 'all', label: 'All Units' },
              { id: 'with_phone', label: 'With Phone' },
              { id: 'unlisted', label: 'Unlisted' },
              { id: 'commercial', label: 'Commercial' },
              { id: 'residential', label: 'Residential' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setUnitFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  unitFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-black/40 border border-white/10 text-white text-xs rounded-xl px-3 py-2 font-medium focus:outline-none cursor-pointer"
          >
            <option value="unit_asc">Unit # (Asc)</option>
            <option value="unit_desc">Unit # (Desc)</option>
            <option value="name_asc">Owner Name (A-Z)</option>
            <option value="floor_desc">Top Floor First</option>
          </select>

          {/* View mode toggle */}
          <div className="hidden sm:flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'}`}
              title="Table View"
            >
              <ListFilter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ── 4. Main Units & Owners Content View ─────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 overflow-hidden flex-1 flex flex-col min-h-0 mb-4">
        
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
            <p className="text-sm font-semibold">Loading unit records...</p>
          </div>
        ) : filteredOwners.length === 0 ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
            <Building2 className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-white">No matching unit records found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ── Table View ── */
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-[#071322] backdrop-blur-md shadow-md shadow-black/30">
                <tr className="border-b border-[#233549] bg-[#071322] text-[11.5px] uppercase font-mono text-slate-400 tracking-wider">
                  <th className="py-2.5 px-4 w-[12%] bg-[#071322]">Unit &amp; Floor</th>
                  <th className="py-2.5 px-4 w-[28%] bg-[#071322]">Owner Name</th>
                  <th className="py-2.5 px-4 w-[15%] bg-[#071322]">Lead ID</th>
                  <th className="py-2.5 px-4 w-[20%] bg-[#071322]">Direct Contact</th>
                  <th className="py-2.5 px-4 w-[13%] bg-[#071322]">Classification</th>
                  <th className="py-2.5 px-4 w-[12%] text-right bg-[#071322]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2b3d] text-xs">
                {paginatedOwners.map((owner) => (
                  <tr 
                    key={owner.id}
                    className="hover:bg-[#102035] transition-colors group cursor-pointer"
                    onClick={() => handleOpenOwner(owner)}
                  >
                    {/* Unit & Floor */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11.5px]">
                          Unit {owner.unit}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          Fl. {owner.floor}
                        </span>
                      </div>
                    </td>

                    {/* Owner Name */}
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-white group-hover:text-blue-300 transition-colors text-[13px] truncate max-w-[280px]">
                        {owner.name}
                      </div>
                    </td>

                    {/* Lead ID */}
                    <td className="py-2.5 px-4 font-mono text-white/60">
                      {owner.lead_id}
                    </td>

                    {/* Direct Contact Phone */}
                    <td className="py-2.5 px-4">
                      {owner.hasPhone && owner.phone ? (
                        <button
                          onClick={(e) => copyPhone(owner.phone, e)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all"
                        >
                          {copiedPhone === owner.phone ? <Check className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                          <span className="font-mono">{copiedPhone === owner.phone ? 'Copied!' : owner.phone}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
                          Unlisted
                        </span>
                      )}
                    </td>

                    {/* Property Classification & Specs */}
                    <td className="py-2.5 px-4 text-white/70">
                      <div className="text-[12px] font-medium">{owner.type}</div>
                      <div className="text-[10.5px] text-white/40 font-mono mt-0.5">
                        {owner.isVerifiedSize ? (
                          `${owner.sqft.toLocaleString()} sqft (${owner.sqm} sqm)`
                        ) : (
                          <span className="text-white/30 italic">Unspecified</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenOwner(owner);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1 shadow-sm transition-all group-hover:scale-105"
                      >
                        <span>Owner 360</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Grid View ── */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar flex-1">
            {paginatedOwners.map((owner) => (
              <div 
                key={owner.id}
                onClick={() => handleOpenOwner(owner)}
                className="bg-black/30 border border-white/10 hover:border-blue-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:bg-white/[0.04] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Unit {owner.unit}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      Fl. {owner.floor}
                    </span>
                  </div>

                  <span className="text-[10px] text-white/40 font-mono">
                    {owner.lead_id}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                    {owner.name}
                  </h4>
                  <div className="text-[11px] text-white/50 flex items-center justify-between mt-1">
                    <span>{owner.type}</span>
                    <span className="font-mono text-white/40">
                      {owner.isVerifiedSize ? `${owner.sqft.toLocaleString()} sqft` : 'Unspecified'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                  {owner.hasPhone && owner.phone ? (
                    <button
                      onClick={(e) => copyPhone(owner.phone, e)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all"
                    >
                      {copiedPhone === owner.phone ? <Check className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                      <span className="font-mono">{copiedPhone === owner.phone ? 'Copied' : owner.phone}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
                      Unlisted
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenOwner(owner);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow-sm transition-all"
                  >
                    <span>Owner 360</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 5. Pagination Bar ───────────────────────────────────────── */}
        <div className="p-3.5 border-t border-[#233549] bg-[#071322] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 shrink-0">
          <div>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredOwners.length)} of {filteredOwners.length.toLocaleString()} units
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-semibold"
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
              className="px-3 py-1.5 rounded-lg bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-semibold"
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

      </div>

    </div>
  );
}
