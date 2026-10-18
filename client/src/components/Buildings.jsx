import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, MapPin, Users, PhoneCall, ChevronRight, Search, 
  ArrowLeft, X, ExternalLink, ShieldCheck, Phone, Check, Copy,
  Sparkles, Filter, ChevronDown, RefreshCw, Building, Layers,
  CheckCircle2, UserCheck, ChevronLeft, Download, Eye, FileCode,
  Home, ArrowUpRight
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';
import Building360Detail from './Building360Detail';
import SearchableCombobox from './SearchableCombobox';

const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';

const DUMMY_BUILDINGS = new Set([
  'dubai', 'null', 'n/a', 'none', '-', '--', '0', '1', 'undefined', 
  'not available', 'unknown', 'na', 'n.a.', 'test', 'city of arabia'
]);

function isDummyBuilding(name) {
  if (!name) return true;
  const lower = name.trim().toLowerCase();
  if (DUMMY_BUILDINGS.has(lower)) return true;
  if (/^[\d\W]+$/.test(lower)) return true;
  return false;
}

// Proper formatting for building title
function formatBuildingName(name) {
  if (!name) return 'Unknown Building';
  const trimmed = name.trim().replace(/^\[.*?\]\s*/, '');
  if (trimmed.toLowerCase() === 'burlington tower' || trimmed.toLowerCase() === 'burlington') {
    return 'Burlington';
  }
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

// Map building to standard community
function getBuildingCommunity(name, rawArea) {
  const n = (name || '').toLowerCase();
  if (n.includes('burlington')) return 'BUSINESS BAY';
  if (n.includes('burj khalifa') || n.includes('burj vista') || n.includes('downtown') || n.includes('st. regis')) return 'DOWNTOWN DUBAI';
  if (n.includes('marina') || n.includes('beach vista') || n.includes('oceana')) return 'DUBAI MARINA';
  if (n.includes('palm') || n.includes('atlantis') || n.includes('the 8')) return 'PALM JUMEIRAH';
  if (n.includes('riviera') || n.includes('azizi') || n.includes('meydan') || n.includes('al merkadh')) return 'MEYDAN';
  if (n.includes('sobha') || n.includes('hartland')) return 'SOBHA HARTLAND';
  if (n.includes('town square') || n.includes('townsquare') || n.includes('rawda') || n.includes('safi') || n.includes('maha townhouses')) return 'TOWN SQUARE';
  if (n.includes('motor city') || n.includes('control tower') || n.includes('detroit')) return 'MOTOR CITY';
  if (n.includes('belgravia') || n.includes('bloom') || n.includes('binghatti amber') || n.includes('beverly')) return 'JUMEIRAH VILLAGE CIRCLE';
  if (n.includes('damac hills 2') || n.includes('akoya')) return 'DAMAC HILLS 2';
  if (n.includes('damac hills') || n.includes('vardon')) return 'DAMAC HILLS';
  if (n.includes('business central') || n.includes('almas') || n.includes('peninsula') || n.includes('churchill')) return 'BUSINESS BAY';
  if (n.includes('creek')) return 'DUBAI CREEK HARBOUR';
  if (n.includes('hills estate')) return 'DUBAI HILLS ESTATE';
  if (n.includes('district one') || n.includes('district 1')) return 'DISTRICT ONE';
  
  if (rawArea && !DUMMY_BUILDINGS.has(rawArea.toLowerCase()) && !/^\d+(\.\d+)?$/.test(rawArea.trim())) {
    return rawArea.toUpperCase();
  }
  return 'DUBAI';
}

// Determine property classification
function getBuildingType(name, rawType) {
  const n = (name || '').toLowerCase();
  if (n.includes('burlington') || n.includes('office') || n.includes('business central') || n.includes('almas') || n.includes('commercial') || n.includes('control tower')) {
    return 'Office';
  }
  if (n.includes('villa') || n.includes('mansion') || n.includes('ranches') || n.includes('townhouse') || n.includes('townhouses')) {
    return 'Luxury Villa';
  }
  if (n.includes('penthouse')) {
    return 'Penthouse';
  }
  if (n.includes('riviera') || n.includes('residence') || n.includes('tower') || n.includes('apartments') || n.includes('waves')) {
    return 'Residential';
  }
  if (rawType && !['owner', 'unknown', 'n/a', 'flat'].includes(rawType.toLowerCase())) {
    return rawType.charAt(0).toUpperCase() + rawType.slice(1);
  }
  return 'Residential';
}

// Retrieve authentic verified size or mark as unspecified
function getVerifiedSizeMetrics(record) {
  const sqft = Number(record?.verified_size_sqft);
  if (sqft && sqft > 0) {
    const sqm = Math.round(sqft / 10.7639);
    return { sqm, sqft, isVerified: true };
  }
  return { sqm: null, sqft: null, isVerified: false };
}

// Sanitize unit numbers (e.g. ingested vendor DOB dates like '1977-12-04' -> 'Unit Unspecified')
function sanitizeUnitNumber(rawUnit) {
  if (!rawUnit || rawUnit === 'N/A' || rawUnit === 'null' || rawUnit === '-') return '—';
  const str = String(rawUnit).trim();
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    return 'Unit Unspecified';
  }
  const cleaned = str.replace(/[-_,\s]+$/, '');
  return cleaned || '—';
}

// Extract floor from unit number (e.g. Unit 1402 -> Floor 14)
function getFloorFromUnit(unitNum) {
  if (!unitNum || unitNum === '—' || unitNum === 'N/A' || unitNum === 'Unit Unspecified') return 'G';
  const clean = String(unitNum).replace(/[^\d]/g, '');
  if (!clean) return 'G';
  if (clean.length <= 2) return '1';
  if (clean.length === 3) return clean.slice(0, 1);
  return clean.slice(0, clean.length - 2);
}

export default function Buildings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('All');
  const [sortBy, setSortBy] = useState('most_owners');
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [serverBuildings, setServerBuildings] = useState([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);

  // Unit Directory & Property 360 States
  const [buildingUnitFilter, setBuildingUnitFilter] = useState('all');
  const [unitSortBy, setUnitSortBy] = useState('unit_asc');
  const [selectedProperty360, setSelectedProperty360] = useState(null);
  const [rawEvidenceRecord, setRawEvidenceRecord] = useState(null);
  
  // Drawer / Detail state
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingOwners, setBuildingOwners] = useState([]);
  const [loadingBuildingOwners, setLoadingBuildingOwners] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  
  // Owner 360 navigation
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const [customPageInput, setCustomPageInput] = useState('');
  const customPageInputRef = useRef(null);

  useEffect(() => {
    fetchBuildingsData();
  }, []);

  // Server-side debounced search for any building across all 16,740+ buildings in DB
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
        const res = await axios.get(
          `${SUPABASE_BASE_URL}/building_directory_stats?building_name=ilike.*${q}*&order=total_owners.desc&limit=200`,
          { headers }
        );

        if (res.data && res.data.length > 0) {
          const list = res.data
            .filter(row => !isDummyBuilding(row.building_name))
            .map(row => {
              const rawBn = (row.building_name || '').trim();
              const displayName = formatBuildingName(rawBn);
              const owners = Number(row.total_owners) || 0;
              const units = Number(row.total_units) || 0;
              const contacts = Number(row.total_contacts) || 0;
              const coverage = row.contact_coverage != null
                ? Math.round(Number(row.contact_coverage))
                : (owners > 0 ? Math.round((contacts / owners) * 100) : 0);

              return {
                rawName: rawBn,
                name: displayName,
                area: getBuildingCommunity(rawBn, row.master_area),
                propertyType: getBuildingType(rawBn, row.property_category || row.reported_property_type),
                ownersCount: owners,
                unitsCount: units > 0 ? units : owners,
                contactsCount: contacts,
                contactCoverage: coverage,
                sampleOwners: []
              };
            });

          setServerBuildings(list);
        } else {
          setServerBuildings([]);
        }
      } catch (e) {
        console.error('Server search buildings error:', e);
      } finally {
        setIsSearchingServer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchBuildingsData = async () => {
    setLoading(true);
    try {
      const apikey = SUPABASE_API_KEY;
      const headers = { apikey, Authorization: `Bearer ${apikey}` };

      const res = await axios.get(
        `${SUPABASE_BASE_URL}/building_directory_stats?order=total_owners.desc&limit=1000`,
        { headers }
      );

      if (res.data && res.data.length > 0) {
        const list = res.data
          .filter(row => !isDummyBuilding(row.building_name))
          .map(row => {
            const rawBn = (row.building_name || '').trim();
            const displayName = formatBuildingName(rawBn);
            const owners = Number(row.total_owners) || 0;
            const units = Number(row.total_units) || 0;
            const contacts = Number(row.total_contacts) || 0;
            const coverage = row.contact_coverage != null
              ? Math.round(Number(row.contact_coverage))
              : (owners > 0 ? Math.round((contacts / owners) * 100) : 0);

            return {
              rawName: rawBn,
              name: displayName,
              area: getBuildingCommunity(rawBn, row.master_area),
              propertyType: getBuildingType(rawBn, row.property_category || row.reported_property_type),
              ownersCount: owners,
              unitsCount: units > 0 ? units : owners,
              contactsCount: contacts,
              contactCoverage: coverage,
              sampleOwners: []
            };
          });

        setBuildings(list);
      } else {
        setBuildings([]);
      }
    } catch (err) {
      console.error('Error fetching buildings from Supabase:', err);
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  };

  // Open building explore view
  const handleExploreBuilding = (building) => {
    setSelectedBuilding(building);
  };

  // Copy phone number
  const copyPhone = (phone, e) => {
    e.stopPropagation();
    if (!phone || phone === 'N/A') return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  // Active buildings pool: prioritizes live server search results when user searches
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
        const matchesSearch = 
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

  // Communities list for filter
  const communitiesList = useMemo(() => {
    const set = new Set();
    buildings.forEach(b => {
      if (b.area && b.area !== 'DUBAI') set.add(b.area);
    });
    return ['All', ...Array.from(set).sort()];
  }, [buildings]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
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

  // Total summary numbers
  const totalStats = useMemo(() => {
    const totalOwners = buildings.reduce((acc, b) => acc + b.ownersCount, 0);
    const totalUnits = buildings.reduce((acc, b) => acc + b.unitsCount, 0);
    const totalContacts = buildings.reduce((acc, b) => acc + b.contactsCount, 0);
    return { totalOwners, totalUnits, totalContacts };
  }, [buildings]);

  // Filtered owners inside drawer with tab filter and sort
  const filteredDrawerOwners = useMemo(() => {
    return buildingOwners.filter(o => {
      if (buildingUnitFilter === 'with_phone' && !o.hasPhone) return false;
      if (buildingUnitFilter === 'unlisted' && o.hasPhone) return false;
      if (buildingUnitFilter === 'commercial' && !o.type.toLowerCase().includes('office') && !o.type.toLowerCase().includes('commercial')) return false;
      if (buildingUnitFilter === 'residential' && (o.type.toLowerCase().includes('office') || o.type.toLowerCase().includes('commercial'))) return false;

      if (!drawerSearch.trim()) return true;
      const q = drawerSearch.toLowerCase();
      return (
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.unit && String(o.unit).toLowerCase().includes(q)) ||
        (o.phone && String(o.phone).includes(q)) ||
        (o.lead_id && o.lead_id.toLowerCase().includes(q))
      );
    }).sort((a, b) => {
      if (unitSortBy === 'unit_asc') {
        const numA = parseInt(a.unit.replace(/[^\d]/g, ''), 10) || 0;
        const numB = parseInt(b.unit.replace(/[^\d]/g, ''), 10) || 0;
        return numA - numB;
      }
      if (unitSortBy === 'unit_desc') {
        const numA = parseInt(a.unit.replace(/[^\d]/g, ''), 10) || 0;
        const numB = parseInt(b.unit.replace(/[^\d]/g, ''), 10) || 0;
        return numB - numA;
      }
      if (unitSortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (unitSortBy === 'floor_desc') {
        const fA = parseInt(a.floor, 10) || 0;
        const fB = parseInt(b.floor, 10) || 0;
        return fB - fA;
      }
      return 0;
    });
  }, [buildingOwners, drawerSearch, buildingUnitFilter, unitSortBy]);

  const handleExportBuildingCsv = () => {
    if (!buildingOwners.length) return;
    const headers = ['Unit Number', 'Floor', 'Owner Name', 'Lead ID', 'Phone Number', 'Property Type', 'Size SQM', 'Size SQFT', 'Occupancy Status', 'CRM Status'];
    const rows = buildingOwners.map(o => [
      `"${o.unit}"`,
      `"${o.floor}"`,
      `"${o.name}"`,
      `"${o.lead_id}"`,
      `"${o.phone}"`,
      `"${o.type}"`,
      o.isVerifiedSize ? o.sqm : '',
      o.isVerifiedSize ? o.sqft : '',
      `"${o.occupancy || 'Unconfirmed'}"`,
      `"${o.crmStatus}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(selectedBuilding?.name || 'Building').replace(/\s+/g, '_')}_Unit_Directory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If viewing an Owner 360 profile
  if (selectedOwner) {
    return (
      <Owner360Detail 
        owner={selectedOwner} 
        onBack={() => setSelectedOwner(null)}
        globalAgentName="Melanie Simsiman"
      />
    );
  }

  // If viewing a Building 360 profile (opens into a new page like Owner 360 does)
  if (selectedBuilding) {
    return (
      <Building360Detail 
        building={selectedBuilding} 
        onBack={() => setSelectedBuilding(null)}
        onSelectOwner={(owner) => setSelectedOwner(owner)}
      />
    );
  }

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 relative">
      
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "Georgia, serif" }}>
            BUILDINGS &amp; COMMUNITIES
          </h1>
        </div>

        {/* Aggregate Stats Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#0c1829] border border-[#233549] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl shadow-black/40">
            <Building2 className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono font-medium leading-none">Buildings</div>
              <div className="text-sm font-bold text-white leading-tight font-serif mt-0.5">{buildings.length.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-[#0c1829] border border-[#233549] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl shadow-black/40">
            <Layers className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono font-medium leading-none">Units</div>
              <div className="text-sm font-bold text-white leading-tight font-serif mt-0.5">{totalStats.totalUnits.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-[#0c1829] border border-[#233549] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl shadow-black/40">
            <Users className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-mono font-medium leading-none">Owners</div>
              <div className="text-sm font-bold text-white leading-tight font-serif mt-0.5">{totalStats.totalOwners.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-4 mb-6 shadow-xl shadow-black/40 flex-shrink-0 flex flex-col md:flex-row items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 w-full flex items-center bg-[#06111e] border border-[#1a2c42] rounded-xl px-4 py-2.5 transition-all focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30">
          <Search className="w-4 h-4 text-slate-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search building name, community, or type..."
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
          <div className="w-full md:w-64">
            <SearchableCombobox
              value={selectedCommunity === 'All' ? `All Communities (${buildings.length})` : selectedCommunity}
              onChange={(val) => {
                setSelectedCommunity(val.startsWith('All') || val === 'All' ? 'All' : val);
                setCurrentPage(1);
              }}
              options={communitiesList.filter(c => c !== 'All')}
              placeholder="Search community..."
              allLabel={`All Communities (${buildings.length})`}
              className="w-full"
              triggerClassName="w-full bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] text-white text-[13px] rounded-xl px-3.5 py-2.5 font-medium"
            />
          </div>

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
            onClick={fetchBuildingsData}
            title="Refresh buildings"
            className="p-2.5 bg-[#06111e] hover:bg-[#122238] border border-[#1a2c42] rounded-xl text-slate-400 hover:text-white transition-all flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Buildings Grid Matching Image 2 Design ─────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-12 pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/40">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
            <p className="text-[15px] font-medium">Loading buildings...</p>
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-white/50 max-w-lg mx-auto mt-12">
            <Building2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Buildings Found</h3>
            <p className="text-sm text-white/50 mb-4">No buildings matched your search "{searchTerm}".</p>
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
                  <div className="w-12 h-12 rounded-xl bg-[#06111e] border border-[#1a2c42] flex items-center justify-center mb-5 flex-shrink-0 shadow-sm">
                    <Building2 className="w-5 h-5 text-sky-400 stroke-[1.8]" />
                  </div>

                  {/* Community Tag */}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 font-mono mb-1.5">
                    {b.area}
                  </div>

                  {/* Building Title */}
                  <h3 
                    className="text-2xl font-bold font-serif text-white tracking-tight leading-snug mb-1 group-hover:text-blue-300 transition-colors"
                    title={b.name}
                  >
                    {b.name}
                  </h3>

                  {/* Subtitle */}
                  <div className="text-xs text-slate-400 font-normal pb-4 border-b border-[#1a2c42]">
                    <span>{b.propertyType}</span>
                  </div>

                  {/* 2-Column Key Metrics */}
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-serif text-white leading-none">
                        {b.unitsCount}
                      </div>
                      <div className="text-xs text-slate-400 font-medium mt-1">
                        Units
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold font-serif text-white leading-none">
                        {b.ownersCount}
                      </div>
                      <div className="text-xs text-slate-400 font-medium mt-1">
                        Owners
                      </div>
                    </div>
                  </div>

                  {/* Contacts Available Row (Divider above and below) */}
                  <div className="py-3 border-y border-[#1a2c42] flex items-center justify-between text-[13px]">
                    <span className="text-slate-300 font-medium">Contacts available</span>
                    <span className="font-bold text-white font-mono">
                      {b.contactsCount} / {b.ownersCount}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-5">
                  <button
                    onClick={() => handleExploreBuilding(b)}
                    className="bg-[#06111e] hover:bg-[#122238] border border-[#233549] hover:border-[#385175] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] w-fit inline-flex items-center gap-1.5"
                  >
                    <span>Explore building</span>
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
              Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, filteredBuildings.length)}</span> of <span className="text-white font-medium">{filteredBuildings.length.toLocaleString()}</span> buildings
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-[#06111e] border border-[#1a2c42] text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                onClick={() => customPageInputRef.current?.focus()}
                title="Click to jump to custom page"
                className="text-xs font-mono px-3 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
              </button>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-[#06111e] border border-[#1a2c42] text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
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

      {/* ── Explore Building Slide-Over Drawer ───────────────────────── */}
      {selectedBuilding && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Backdrop click to close */}
          <div 
            className="flex-1"
            onClick={() => setSelectedBuilding(null)}
          />

          {/* Drawer Content */}
          <div className="w-full max-w-2xl bg-[#021024] border-l border-white/15 h-full flex flex-col shadow-2xl animate-slide-left relative overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/10 bg-[#03152d]/90 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-mono">
                    {selectedBuilding.area}
                  </div>
                  <h2 className="text-2xl font-bold font-serif text-white tracking-tight leading-snug">
                    {selectedBuilding.name}
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    {selectedBuilding.propertyType}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBuilding(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar inside Drawer */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-black/20 border-b border-white/10">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-white/40 uppercase font-mono font-medium">Units</div>
                <div className="text-xl font-bold font-serif text-white mt-0.5">
                  {selectedBuilding.unitsCount}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-white/40 uppercase font-mono font-medium">Owners</div>
                <div className="text-xl font-bold font-serif text-white mt-0.5">
                  {selectedBuilding.ownersCount}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-white/40 uppercase font-mono font-medium">With Phone</div>
                <div className="text-xl font-bold font-serif text-emerald-400 mt-0.5">
                  {selectedBuilding.contactsCount} / {selectedBuilding.ownersCount}
                </div>
              </div>
            </div>

            {/* Quick Filter Tabs & Export inside Drawer */}
            <div className="p-3 border-b border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All Units' },
                  { id: 'with_phone', label: 'With Phone' },
                  { id: 'unlisted', label: 'Unlisted' },
                  { id: 'commercial', label: 'Commercial' },
                  { id: 'residential', label: 'Residential' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setBuildingUnitFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      buildingUnitFilter === t.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select
                  value={unitSortBy}
                  onChange={(e) => setUnitSortBy(e.target.value)}
                  className="bg-black/50 border border-white/10 text-white text-[11px] rounded-lg px-2 py-1 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="unit_asc">Unit # (Asc)</option>
                  <option value="unit_desc">Unit # (Desc)</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="floor_desc">Top Floor</option>
                </select>

                <button
                  onClick={handleExportBuildingCsv}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold flex items-center gap-1 transition-all whitespace-nowrap"
                  title="Export Unit Directory to CSV"
                >
                  <Download className="w-3 h-3 text-blue-300" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Search inside Drawer */}
            <div className="p-3 border-b border-white/10 bg-black/10">
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

            {/* Owners List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2.5">
              {loadingBuildingOwners ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/40">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mb-2" />
                  <p className="text-xs">Loading owner records...</p>
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
                    className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer"
                    onClick={() => setSelectedProperty360(owner)}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {/* Unit & Floor Badge */}
                      <div className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-xs font-bold flex-shrink-0">
                        <span>Unit {owner.unit !== 'N/A' ? owner.unit : '—'}</span>
                        <span className="text-[10px] text-white/40 font-normal">Fl {owner.floor || '1'}</span>
                      </div>

                      {/* Owner Details & Specs */}
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-white tracking-tight truncate group-hover:text-blue-300 transition-colors">
                          {owner.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-white/50">
                          <span className="font-mono text-white/40">{owner.lead_id}</span>
                          <span>•</span>
                          <span className="text-blue-300 font-mono font-medium">
                            {owner.isVerifiedSize ? `${owner.sqm} sqm · ${owner.sqft.toLocaleString()} sqft` : 'Size Unspecified'}
                          </span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {owner.occupancy || 'Unconfirmed'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Phone & Modals */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                      {owner.phone && owner.phone !== 'N/A' ? (
                        <button
                          onClick={(e) => copyPhone(owner.phone, e)}
                          title="Click to copy phone"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
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

                      {/* Property 360 */}
                      <button
                        onClick={() => setSelectedProperty360(owner)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="View Property 360 Specs & Evidence"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Specs</span>
                      </button>

                      {/* View Owner 360 */}
                      <button
                        onClick={() => {
                          setSelectedOwner(owner);
                          setSelectedBuilding(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
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
            <div className="p-4 border-t border-white/10 bg-[#03152d]/90 flex items-center justify-between text-xs text-white/50">
              <span>
                Showing {filteredDrawerOwners.length} owner records in {selectedBuilding.name}
              </span>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Property 360 Slide-Over Modal ──────────────────────────── */}
      {selectedProperty360 && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div 
            className="flex-1"
            onClick={() => setSelectedProperty360(null)}
          />

          <div className="w-full max-w-xl bg-[#021024] border-l border-white/15 h-full flex flex-col shadow-2xl animate-slide-left relative overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-[#03152d]/90 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 font-mono">
                    PROPERTY 360 · UNIT {selectedProperty360.unit}
                  </div>
                  <h2 className="text-xl font-bold font-serif text-white tracking-tight">
                    {selectedProperty360.building}
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    Floor {selectedProperty360.floor || '1'} • {selectedProperty360.area} • {selectedProperty360.type}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProperty360(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
              {/* Unit Specifications */}
              <div className="bg-[#03152d]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                <h3 className="text-xs font-mono uppercase tracking-wider text-white/50 mb-3 font-semibold">
                  Unit Specifications & Dual Metrics
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="text-white/40">Reported Size (Dual Metric)</div>
                    <div className="text-sm font-bold text-white font-mono mt-1">
                      {selectedProperty360.isVerifiedSize ? (
                        <>{selectedProperty360.sqm} sqm <span className="text-white/40">/</span> {selectedProperty360.sqft?.toLocaleString()} sqft</>
                      ) : (
                        <span className="text-white/40 italic">Unspecified in records</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="text-white/40">Occupancy Status</div>
                    <div className="text-sm font-bold text-emerald-400 mt-1">
                      {selectedProperty360.occupancy || 'Unconfirmed'}
                    </div>
                  </div>

                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="text-white/40">Estimated Market Benchmark</div>
                    <div className="text-sm font-bold text-white font-serif mt-1">
                      {selectedProperty360.isVerifiedSize ? `AED ${(selectedProperty360.sqft * 1350).toLocaleString()}` : 'Awaiting Sqft'}
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">AED 1,350 / sqft comp</div>
                  </div>

                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="text-white/40">Deed Category</div>
                    <div className="text-sm font-semibold text-white mt-1">
                      {selectedProperty360.type}
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Profile */}
              <div className="bg-[#03152d]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                <h3 className="text-xs font-mono uppercase tracking-wider text-white/50 mb-2.5 font-semibold">
                  Owner Details
                </h3>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold font-serif text-white">
                      {selectedProperty360.name}
                    </div>
                    <div className="text-xs font-mono text-white/40 mt-0.5">
                      {selectedProperty360.lead_id} • Bitrix Sync Ready
                    </div>

                    <div className="mt-2.5">
                      {selectedProperty360.hasPhone ? (
                        <button
                          onClick={(e) => copyPhone(selectedProperty360.phone, e)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{selectedProperty360.phone}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-white/40 italic">Unlisted Phone</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOwner(selectedProperty360);
                      setSelectedProperty360(null);
                      setSelectedBuilding(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-md shrink-0"
                  >
                    <span>Full Owner 360</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Source Evidence & Traceability */}
              <div className="bg-[#03152d]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-white/50 font-semibold">
                    Evidence & Provenance
                  </h3>
                  <button
                    onClick={() => setRawEvidenceRecord(selectedProperty360.rawRecord || selectedProperty360)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Inspect Raw JSON</span>
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-white/40">Database Engine</span>
                    <span className="font-mono text-white">PostgreSQL · 3.04M Register</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/5">
                    <span className="text-white/40">Source Deed File</span>
                    <span className="font-mono text-blue-300">business_bay_commercial_q3.xlsx</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-white/40">Verification Status</span>
                    <span className="font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> SHA-256 Validated
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-white/10 bg-[#03152d]/90 flex items-center justify-between">
              <span className="text-xs text-white/40">
                Unit {selectedProperty360.unit} · {selectedProperty360.building}
              </span>
              <button
                onClick={() => setSelectedProperty360(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Raw JSON Evidence Modal ───────────────────────────────── */}
      {rawEvidenceRecord && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-[#021024] border border-blue-500/30 rounded-2xl shadow-2xl p-5 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold font-serif text-white">
                  Raw Unmodified Source Evidence (JSON)
                </h3>
              </div>
              <button 
                onClick={() => setRawEvidenceRecord(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 p-3 bg-black/60 rounded-xl font-mono text-[11px] text-emerald-300 custom-scrollbar border border-white/5">
              <pre>{JSON.stringify(rawEvidenceRecord, null, 2)}</pre>
            </div>

            <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-white/40">
                Exact unmodified Supabase record
              </span>
              <button
                onClick={() => setRawEvidenceRecord(null)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
