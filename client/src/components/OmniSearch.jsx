import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Building2, User, Phone, MapPin, 
  ArrowRight, ShieldCheck, Copy, Check, Filter, 
  ExternalLink, Sparkles, RefreshCw, X, ChevronRight, Hash, Database,
  Clock, DollarSign, Award, Layers
} from 'lucide-react';
import Owner360Detail from './Owner360Detail';
import Building360Detail from './Building360Detail';
import { parseIdQuery, isIdMatched } from '../utils/idParser';
import { cleanUnitNumber } from '../utils/leadCleanerClient';

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const SEARCH_FILTER_PILLS = [
  'All',
  'Owners',
  'Buildings',
  'Area',
  'Phone Numbers',
  'Emirates ID',
  'Lead ID',
  'Bitrix ID',
  'Master Leads ID'
];

function formatAedValuation(val) {
  const num = Number(val);
  if (!num || isNaN(num) || num <= 0) return null;
  if (num >= 1000000000) {
    return `AED ${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `AED ${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `AED ${(num / 1000).toFixed(0)}K`;
  }
  return `AED ${num.toLocaleString()}`;
}

function formatBuildingName(name) {
  if (!name) return 'Dubai Residence';
  let cleaned = name.trim().replace(/^\[.*?\]\s*/, '');
  cleaned = cleaned.replace(/_DEWA$|_PREMISE$|_FINAL$/i, '').trim();
  cleaned = cleaned.replace(/^The\s+/i, '').trim();
  const isAllCaps = cleaned === cleaned.toUpperCase();
  if (!isAllCaps) return cleaned;
  return cleaned
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bTower\b/i, 'Tower')
    .replace(/\bTowers\b/i, 'Towers')
    .replace(/\bJlt\b/i, 'JLT')
    .replace(/\bJvc\b/i, 'JVC')
    .replace(/\bJbr\b/i, 'JBR')
    .replace(/\bDamac\b/i, 'DAMAC');
}

export default function OmniSearch({ onOpenBuildingTab, isModal = false, onClose }) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searchedFilter, setSearchedFilter] = useState('All');
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = localStorage.getItem('asq_recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const searchSeqRef = useRef(0);
  
  // Results
  const [ownerResults, setOwnerResults] = useState([]);
  const [buildingResults, setBuildingResults] = useState([]);
  const [areaResults, setAreaResults] = useState([]);
  const [idResults, setIdResults] = useState([]);

  // Full Page Detail Views
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Community / Area Explorer State
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaBuildingsList, setAreaBuildingsList] = useState([]);
  const [loadingAreaDetails, setLoadingAreaDetails] = useState(false);
  const [areaDrawerSearch, setAreaDrawerSearch] = useState('');

  const [copiedPhone, setCopiedPhone] = useState(null);

  // Autofocus input on load or when modal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, [isModal]);

  // Read URL Hash Parameters on Mount
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      if (hash.startsWith('#search')) {
        const queryParams = new URLSearchParams(hash.split('?')[1] || '');
        const qParam = queryParams.get('q');
        const filterParam = queryParams.get('filter');
        if (filterParam && SEARCH_FILTER_PILLS.includes(filterParam)) {
          setFilterType(filterParam);
        }
        if (qParam && qParam.trim()) {
          setQuery(qParam.trim());
          handleSearch(filterParam || 'All', qParam.trim());
        }
      }
    } catch (e) {
      console.warn('Failed to parse URL hash params:', e);
    }
  }, []);

  const saveRecentSearch = (term) => {
    if (!term || term.trim().length < 2) return;
    const clean = term.trim();
    setRecentSearches(prev => {
      const updated = [clean, ...prev.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('asq_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSelectBuilding = (building) => {
    setSelectedBuilding({
      name: building.canonical_name || building.name,
      rawName: building.canonical_name || building.rawName || building.name,
      area: building.master_area || building.area || 'Dubai',
      propertyType: building.property_category || building.propertyType || 'Residential',
      ownersCount: building.total_owners || building.ownersCount || 0,
      unitsCount: building.total_units || building.unitsCount || 0,
      contactsCount: building.total_contacts || building.contactsCount || 0,
      contactCoverage: building.contact_coverage || building.contactCoverage || 0,
      entityType: building.entity_type || building.entityType || 'building'
    });
  };

  const handleSelectOwner = (item) => {
    setSelectedOwner({
      id: item.canonical_owner_id || item.owner_id || item.lead_id,
      canonical_owner_id: item.canonical_owner_id,
      name: item.full_name || item.name || 'Property Owner',
      raw_full_name: item.full_name || item.name,
      lead_id: item.lead_id || (item.sample_owner_id ? `LEAD-${item.sample_owner_id}` : undefined),
      sample_owner_id: item.sample_owner_id || item.owner_id,
      emirates_id: item.emirates_id,
      phone: item.phone_normalized || item.phone,
      phone_normalized: item.phone_normalized || item.phone,
      email: item.email,
      nationality: item.nationality,
      building: item.primary_building || item.building_name,
      area: item.primary_area || item.master_area,
      total_units: item.total_units || 1,
      units: item.total_units || 1,
      total_portfolio_valuation: item.total_portfolio_valuation,
      match_criteria: item.match_criteria || (item.emirates_id ? 'EMIRATES_ID' : 'MOBILE_AND_NAME'),
      bitrix_id: item.bitrix_id,
      bitrix_status: item.bitrix_status,
      assigned_agent: item.assigned_agent
    });
  };

  const handleSearch = async (overrideFilter, overrideQuery) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    const currentFilter = overrideFilter || filterType;
    if (q.length < 1) {
      setOwnerResults([]);
      setBuildingResults([]);
      setAreaResults([]);
      setIdResults([]);
      setHasSearched(false);
      setSearchedQuery('');
      return;
    }

    const seq = ++searchSeqRef.current;
    setLoading(true);
    const headers = { 
      apikey: SUPABASE_API_KEY, 
      Authorization: `Bearer ${SUPABASE_API_KEY}` 
    };

    // Safe fetch helper that always returns an Array and never throws
    const safeGet = async (url) => {
      try {
        const res = await axios.get(url, { headers, timeout: 9000 });
        return Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.warn('Search query warning:', url, err?.message);
        return [];
      }
    };

    // ── CANONICAL HIGH-PERFORMANCE FETCHERS ──
    const fetchBuildings = async () => {
      const rows = await safeGet(`${SUPABASE_BASE_URL}/canonical_buildings?canonical_name=ilike.*${encodeURIComponent(q)}*&entity_type=neq.junk&order=total_owners.desc&limit=30`);
      return rows.map(b => ({
        canonical_name: b.canonical_name,
        name: b.canonical_name,
        rawName: b.canonical_name,
        area: b.master_area || 'Dubai',
        propertyType: b.property_category || 'Residential',
        ownersCount: b.total_owners || 0,
        unitsCount: b.total_units || 0,
        contactsCount: b.total_contacts || 0,
        contactCoverage: b.contact_coverage || 0,
        entityType: b.entity_type
      }));
    };

    const fetchAreas = async () => {
      const rows = await safeGet(`${SUPABASE_BASE_URL}/canonical_buildings?canonical_name=ilike.*${encodeURIComponent(q)}*&entity_type=eq.community&order=total_owners.desc&limit=20`);
      return rows.map(a => ({
        rawName: a.canonical_name,
        name: a.canonical_name,
        totalBuildings: a.source_count || 1,
        totalUnits: a.total_units || 0,
        totalOwners: a.total_owners || 0,
        phoneCoverage: a.contact_coverage || 0
      }));
    };

    const fetchOwners = async () => {
      const rows = await safeGet(`${SUPABASE_BASE_URL}/canonical_owners?full_name=ilike.*${encodeURIComponent(q)}*&select=*&order=total_portfolio_valuation.desc.nullslast&limit=30`);
      return rows;
    };

    const fetchPhone = async () => {
      const cleanDigits = q.replace(/[^0-9]/g, '');
      const orClauses = [];

      // 1. Exact string as entered
      if (q.trim().startsWith('+')) {
        orClauses.push(`phone_normalized.eq.${encodeURIComponent(q.trim())}`);
      }

      // 2. UAE mobile format (05x -> +9715x)
      if (cleanDigits.startsWith('05') && cleanDigits.length === 10) {
        orClauses.push(`phone_normalized.eq.${encodeURIComponent(`+971${cleanDigits.slice(1)}`)}`);
      } else if (cleanDigits.startsWith('5') && cleanDigits.length === 9) {
        orClauses.push(`phone_normalized.eq.${encodeURIComponent(`+971${cleanDigits}`)}`);
      }

      // 3. UAE landlines (04 -> Dubai, 02 -> Abu Dhabi, 06 -> Sharjah)
      if (/^0[2-7]\d{7}$/.test(cleanDigits)) {
        orClauses.push(`phone_normalized.eq.${encodeURIComponent(`+971${cleanDigits.slice(1)}`)}`);
      }

      // 4. International prefix (971...)
      if (cleanDigits.startsWith('971')) {
        orClauses.push(`phone_normalized.eq.${encodeURIComponent(`+${cleanDigits}`)}`);
      }

      // 5. Raw digits with +
      if (cleanDigits.length >= 7) {
        orClauses.push(`phone_normalized.eq.${encodeURIComponent(`+${cleanDigits}`)}`);
      }

      const uniqueClauses = Array.from(new Set(orClauses));
      if (uniqueClauses.length === 0) return [];

      // Primary: query canonical_owners (indexed)
      const canonicalRows = await safeGet(`${SUPABASE_BASE_URL}/canonical_owners?or=(${uniqueClauses.join(',')})&select=*&limit=30`);
      if (canonicalRows.length > 0) return canonicalRows;

      // Secondary fallback: query owners_data
      const rawRows = await safeGet(`${SUPABASE_BASE_URL}/owners_data?or=(${uniqueClauses.join(',')})&select=*&limit=30`);
      return rawRows;
    };

    const fetchEid = async () => {
      const parsed = parseIdQuery(q);
      const variants = parsed?.eidVariants || [q.trim()];
      const orClauses = variants.map(v => `emirates_id.eq.${encodeURIComponent(v)}`);

      // 1. Query canonical_owners (indexed by idx_canonical_owners_eid)
      const canonicalRows = await safeGet(`${SUPABASE_BASE_URL}/canonical_owners?or=(${orClauses.join(',')})&select=*&limit=30`);
      if (canonicalRows.length > 0) return canonicalRows;

      // 2. Secondary fallback: query owners_data
      const rawRows = await safeGet(`${SUPABASE_BASE_URL}/owners_data?or=(${orClauses.join(',')})&select=*&limit=30`);
      return rawRows;
    };

    const fetchLeadId = () => {
      const parsed = parseIdQuery(q);
      if (parsed) {
        const orClauses = parsed.leadVariants.map(v => `lead_id.eq.${encodeURIComponent(v)}`);
        return safeGet(`${SUPABASE_BASE_URL}/owners_data?or=(${orClauses.join(',')})&select=*&limit=50`);
      }
      return safeGet(`${SUPABASE_BASE_URL}/owners_data?lead_id=eq.${encodeURIComponent(q.trim())}&select=*&limit=50`);
    };

    const fetchBitrixId = async () => {
      const parsed = parseIdQuery(q);
      const bitrixVal = parsed?.intVal ? String(parsed.intVal) : q.trim().replace(/[^0-9]/g, '');
      if (!bitrixVal) return [];

      // Query canonical_owners first (indexed by idx_canonical_owners_bitrix_id)
      const cRows = await safeGet(`${SUPABASE_BASE_URL}/canonical_owners?bitrix_id=eq.${encodeURIComponent(bitrixVal)}&select=*&limit=30`);
      if (cRows.length > 0) return cRows;

      // Fallback: owners_data
      return safeGet(`${SUPABASE_BASE_URL}/owners_data?bitrix_id=eq.${encodeURIComponent(bitrixVal)}&select=*&limit=50`);
    };

    const fetchSupabaseId = () => {
      const parsed = parseIdQuery(q);
      if (parsed) {
        const orClauses = parsed.ownerVariants.map(v => `owner_id.eq.${encodeURIComponent(v)}`);
        return safeGet(`${SUPABASE_BASE_URL}/owners_data?or=(${orClauses.join(',')})&select=*&limit=50`);
      }
      return safeGet(`${SUPABASE_BASE_URL}/owners_data?owner_id=eq.${encodeURIComponent(q.trim())}&select=*&limit=50`);
    };

    const fetchAllIds = async () => {
      const parsed = parseIdQuery(q);
      if (!parsed) return [];

      if (parsed.intent === 'eid') return fetchEid();
      if (parsed.intent === 'lead') return fetchLeadId();
      if (parsed.intent === 'owner') return fetchSupabaseId();
      if (parsed.intent === 'bitrix') return fetchBitrixId();

      // 'any': Search across Lead ID, Bitrix ID, and Master Leads ID (owner_id)
      const orClauses = [
        ...parsed.leadVariants.map(v => `lead_id.eq.${encodeURIComponent(v)}`),
        ...parsed.ownerVariants.map(v => `owner_id.eq.${encodeURIComponent(v)}`),
        ...parsed.bitrixVariants.map(v => `bitrix_id.eq.${encodeURIComponent(v)}`)
      ];
      return safeGet(`${SUPABASE_BASE_URL}/owners_data?or=(${Array.from(new Set(orClauses)).join(',')})&select=*&limit=50`);
    };

    try {
      if (currentFilter === 'Buildings') {
        setOwnerResults([]);
        setAreaResults([]);
        setIdResults([]);
        const rows = await fetchBuildings();
        setBuildingResults(rows);
      } else if (currentFilter === 'Area') {
        setOwnerResults([]);
        setBuildingResults([]);
        setIdResults([]);
        const rows = await fetchAreas();
        setAreaResults(rows);
      } else if (currentFilter === 'Owners') {
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        const rows = await fetchOwners();
        setOwnerResults(rows);
      } else if (currentFilter === 'Phone Numbers') {
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        const rows = await fetchPhone();
        setOwnerResults(rows);
      } else if (currentFilter === 'Emirates ID') {
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        setOwnerResults([]);
        const rows = await fetchEid();
        setIdResults(rows);
      } else if (currentFilter === 'Lead ID') {
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        setOwnerResults([]);
        const rows = await fetchLeadId();
        setIdResults(rows);
      } else if (currentFilter === 'Bitrix ID') {
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        setOwnerResults([]);
        const rows = await fetchBitrixId();
        setIdResults(rows);
      } else if (currentFilter === 'Master Leads ID' || currentFilter === 'Supabase ID') {
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        setOwnerResults([]);
        const rows = await fetchSupabaseId();
        setIdResults(rows);
      } else {
        // ── 'All' FILTER: Unified Intelligent Multi-Entity Search ──
        const parsed = parseIdQuery(q);
        const cleanDigits = q.replace(/[^0-9]/g, '');
        
        const isEid = parsed?.intent === 'eid' || cleanDigits.startsWith('784');
        const isPureId = !isEid && parsed && (parsed.intent !== 'any' || (cleanDigits.length >= 4 && !/[a-zA-Z]/.test(q.replace(/^(id|#|no\.?)\s*/i, ''))));
        const shouldRunTextSearch = !isPureId && !isEid;
        const hasIdCheck = !!parsed && !isEid;
        const hasPhoneCheck = !isEid && (q.trim().startsWith('+') || (cleanDigits.length >= 8 && (cleanDigits.startsWith('05') || cleanDigits.startsWith('971') || cleanDigits.startsWith('04') || cleanDigits.startsWith('02'))));

        const [bldgRows, areaRows, ownerRows, idRows, phoneRows, eidRows] = await Promise.all([
          shouldRunTextSearch ? fetchBuildings() : Promise.resolve([]),
          shouldRunTextSearch ? fetchAreas() : Promise.resolve([]),
          shouldRunTextSearch ? fetchOwners() : Promise.resolve([]),
          hasIdCheck ? fetchAllIds() : Promise.resolve([]),
          hasPhoneCheck ? fetchPhone() : Promise.resolve([]),
          isEid ? fetchEid() : Promise.resolve([])
        ]);

        setBuildingResults(bldgRows || []);
        setAreaResults(areaRows || []);

        // Combine owners with any phone matches
        const combinedOwners = Array.isArray(ownerRows) ? [...ownerRows] : [];
        if (Array.isArray(phoneRows) && phoneRows.length > 0) {
          const existingIds = new Set(combinedOwners.map(o => o.canonical_owner_id || o.owner_id || o.lead_id));
          phoneRows.forEach(p => {
            const id = p.canonical_owner_id || p.owner_id || p.lead_id;
            if (!existingIds.has(id)) {
              existingIds.add(id);
              combinedOwners.push(p);
            }
          });
        }
        setOwnerResults(combinedOwners);

        const combinedIds = [...(Array.isArray(idRows) ? idRows : []), ...(Array.isArray(eidRows) ? eidRows : [])];
        setIdResults(combinedIds);
      }

      if (seq !== searchSeqRef.current) return;
      setHasSearched(true);
      setSearchedQuery(q);
      setSearchedFilter(currentFilter);
      saveRecentSearch(q);

      // URL Hash Sync for deep linking
      if (!isModal && q) {
        const targetHash = `#search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(currentFilter)}`;
        if (window.location.hash !== targetHash) {
          window.history.replaceState(null, '', targetHash);
        }
      }
    } catch (err) {
      console.error('OmniSearch error:', err);
    } finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  // Immediate search on clipboard paste
  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text')?.trim();
    if (pasted) {
      setQuery(pasted);
      handleSearch(filterType, pasted);
    }
  };

  // Debounced auto-search when query or filter changes
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setOwnerResults([]);
      setBuildingResults([]);
      setAreaResults([]);
      setIdResults([]);
      setHasSearched(false);
      setSearchedQuery('');
      return;
    }

    // Skip if already searched for this exact query & filter
    if (trimmed.toLowerCase() === searchedQuery.trim().toLowerCase() && filterType === searchedFilter) {
      return;
    }

    // Faster debounce for ID patterns (150ms), smooth debounce for text (350ms)
    const isIdLike = /^(lead|own|bitrix|eid|#)?[-\s]?\d+/i.test(trimmed);
    const delay = isIdLike ? 150 : 350;

    const timer = setTimeout(() => {
      handleSearch(filterType, trimmed);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, filterType, searchedQuery, searchedFilter]);

  const handleFilterPillClick = (f) => {
    setFilterType(f);
    if (query.trim().length >= 1) {
      handleSearch(f, query.trim());
    }
  };

  // Open Inside-Area Explorer Drawer
  const openAreaExplorer = async (area) => {
    setSelectedArea(area);
    setAreaDrawerSearch('');
    setLoadingAreaDetails(true);

    try {
      const headers = { 
        apikey: SUPABASE_API_KEY, 
        Authorization: `Bearer ${SUPABASE_API_KEY}` 
      };
      const cleanArea = (area.rawName || area.name).replace(/'/g, "''");
      const endpoint = `${SUPABASE_BASE_URL}/canonical_buildings?master_area=ilike.*${encodeURIComponent(cleanArea)}*&entity_type=neq.junk&order=total_owners.desc&limit=50`;
      const res = await axios.get(endpoint, { headers, timeout: 9000 });
      
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map(b => ({
          canonical_name: b.canonical_name,
          name: b.canonical_name,
          rawName: b.canonical_name,
          area: b.master_area || area.name,
          propertyType: b.property_category || 'Residential',
          ownersCount: b.total_owners || 0,
          unitsCount: b.total_units || 0,
          contactsCount: b.total_contacts || 0,
          contactCoverage: b.contact_coverage || 0
        }));
        setAreaBuildingsList(mapped);
      } else {
        setAreaBuildingsList([]);
      }
    } catch (e) {
      console.error('Error fetching area details:', e);
      setAreaBuildingsList([]);
    } finally {
      setLoadingAreaDetails(false);
    }
  };

  const copyPhone = (phone, e) => {
    e.stopPropagation();
    if (!phone || phone === 'N/A') return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  const filteredAreaBuildings = useMemo(() => {
    if (!areaDrawerSearch.trim()) return areaBuildingsList;
    const q = areaDrawerSearch.toLowerCase();
    return areaBuildingsList.filter(b => b.name && b.name.toLowerCase().includes(q));
  }, [areaBuildingsList, areaDrawerSearch]);

  // If an Owner 360 profile is open, render it full page
  if (selectedOwner) {
    return (
      <Owner360Detail 
        owner={selectedOwner} 
        onBack={() => setSelectedOwner(null)}
        onSelectBuilding={(bldgName) => {
          setSelectedOwner(null);
          handleSelectBuilding({ name: bldgName, rawName: bldgName });
        }}
        globalAgentName="Melanie Simsiman"
      />
    );
  }

  // If a Building 360 profile is open, render it full page
  if (selectedBuilding) {
    return (
      <Building360Detail 
        building={selectedBuilding} 
        onBack={() => setSelectedBuilding(null)}
        onSelectOwner={(owner) => handleSelectOwner(owner)}
      />
    );
  }

  const getSearchPlaceholder = () => {
    switch (filterType) {
      case 'Buildings':
        return 'Search building name or tower (e.g. Burj Crown, Marina Gate, Burj Khalifa)...';
      case 'Area':
        return 'Search community or area (e.g. Downtown Dubai, Dubai Marina, Business Bay)...';
      case 'Owners':
        return 'Search investor or owner name (e.g. Alla Kuznetsova, Al Maktoum)...';
      case 'Phone Numbers':
        return 'Search phone digits (e.g. 0501234567, 97150..., or landlines 04...)...';
      case 'Emirates ID':
        return 'Type Emirates ID (e.g. 784-1987-6869517-7 or 784198768695177)...';
      case 'Lead ID':
        return 'Type Lead ID in any format (e.g. LEAD-1433897, lead 1433897, or 1433897)...';
      case 'Bitrix ID':
        return 'Type CRM Bitrix ID in any format (e.g. 33271, bitrix 33271, or crm 33271)...';
      case 'Master Leads ID':
      case 'Supabase ID':
        return 'Type Master Leads ID in any format (e.g. OWN-2723960, master 2723960, or 2723960)...';
      default:
        return 'Search anything: investor, tower, community, phone, Emirates ID, or CRM ID...';
    }
  };

  const totalResultsCount = areaResults.length + buildingResults.length + ownerResults.length + idResults.length;

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/80 relative">
      
      {/* Optional Modal Top Bar with shortcut pill and close button */}
      {isModal && (
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 px-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-sm font-bold text-white tracking-wide">OMNI SEARCH ENGINE</span>
            <kbd className="px-2 py-0.5 rounded text-[10.5px] bg-white/10 text-white/60 font-mono border border-white/10">
              Ctrl + F6
            </kbd>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col items-center justify-center mt-2 mb-4 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>SEARCH DATABASE</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Canonical 2.0
          </span>
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Fast indexed search across 2.22M+ verified owners and 69,000+ buildings
        </p>
      </div>

      {/* Center Search Container */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0">
        
        {/* Big Search Bar */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-5 sm:h-6 text-[#3b82f6]" />
          <input
            ref={inputRef}
            type="text"
            placeholder={getSearchPlaceholder()}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-[#0c1829] border-2 border-[#233549] focus:border-[#3b82f6] rounded-2xl pl-14 sm:pl-16 pr-24 sm:pr-28 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/20 transition-all shadow-2xl"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {query && (
              <button 
                type="button"
                onClick={() => {
                  setQuery('');
                  setOwnerResults([]);
                  setBuildingResults([]);
                  setAreaResults([]);
                  setIdResults([]);
                  setHasSearched(false);
                  setSearchedQuery('');
                  inputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-white p-1.5 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => handleSearch()} 
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white p-2 sm:p-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 cursor-pointer"
              title="Search"
            >
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-3 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filters:</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {SEARCH_FILTER_PILLS.map(f => (
              <button 
                key={f}
                onClick={() => handleFilterPillClick(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filterType === f 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400' 
                    : 'bg-[#0c1829] text-slate-300 border border-[#233549] hover:bg-[#122238] hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Searches Pills (when input is empty or just opened) */}
        {!hasSearched && !query && recentSearches.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Recent:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(term);
                    handleSearch(filterType, term);
                  }}
                  className="px-2.5 py-0.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-colors cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Results Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-8 pr-1 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-white/50">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-400 mb-2" />
              <p className="text-sm">Searching verified canonical records...</p>
            </div>
          )}

          {!loading && hasSearched && searchedQuery.trim().toLowerCase() === query.trim().toLowerCase() && totalResultsCount === 0 && (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.02]">
              <Search className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No matching results found</h3>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                No records matched "{query}" under the <span className="text-blue-400 font-semibold">{filterType}</span> filter. Try switching to "All" or refining your search term.
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* A. ID LOOKUP RESULTS (Emirates ID, Lead ID, Bitrix ID, Master ID)   */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {!loading && idResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  Exact ID Matches ({idResults.length}):
                </span>
              </div>
              {idResults.map((item, idx) => (
                <div 
                  key={item.canonical_owner_id || item.owner_id || idx}
                  className="bg-[#0c1829] border border-[#233549] hover:border-emerald-400/60 rounded-xl p-4 transition-all shadow-xl shadow-black/40 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {item.full_name || 'Verified Owner'}
                        </span>
                        {item.emirates_id && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isIdMatched(item.emirates_id, query)
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold shadow-sm'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25 font-medium'
                          }`}>
                            EID: {item.emirates_id}
                          </span>
                        )}
                        {item.lead_id && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isIdMatched(item.lead_id, query)
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 font-bold shadow-sm'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium'
                          }`}>
                            Lead ID: {item.lead_id}
                          </span>
                        )}
                        {item.owner_id && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isIdMatched(item.owner_id, query)
                              ? 'bg-purple-500/25 text-purple-300 border-purple-500/40 font-bold shadow-sm'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-medium'
                          }`} title="Master Leads ID">
                            Master ID: {item.owner_id}
                          </span>
                        )}
                        {item.bitrix_id && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isIdMatched(item.bitrix_id, query)
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 font-bold shadow-sm'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-medium'
                          }`}>
                            Bitrix #{item.bitrix_id}
                          </span>
                        )}
                        {item.total_units > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {item.total_units} Units Portfolio
                          </span>
                        )}
                        {formatAedValuation(item.total_portfolio_valuation) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {formatAedValuation(item.total_portfolio_valuation)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                        {cleanUnitNumber(item.unit_number) && <span>Unit: <strong className="text-white/80">{cleanUnitNumber(item.unit_number)}</strong></span>}
                        {(item.primary_building || item.building_name) && <span>Building: <strong className="text-white/80">{item.primary_building || item.building_name}</strong></span>}
                        {(item.primary_area || item.master_area) && <span>Area: <strong className="text-white/80">{item.primary_area || item.master_area}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.phone_normalized && item.phone_normalized !== 'N/A' && (
                      <button
                        onClick={(e) => copyPhone(item.phone_normalized, e)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedPhone === item.phone_normalized ? <Check className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                        <span>{copiedPhone === item.phone_normalized ? 'Copied' : item.phone_normalized}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleSelectOwner(item)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Owner 360</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* B. MATCHED AREAS SECTION                                          */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {!loading && areaResults.length > 0 && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Matching Areas &amp; Communities ({areaResults.length}):
                </span>
                {filterType === 'All' && (
                  <button 
                    onClick={() => handleFilterPillClick('Area')}
                    className="text-blue-400 hover:text-blue-300 normal-case font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all areas</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {areaResults.map((area, idx) => (
                  <div
                    key={area.rawName || idx}
                    onClick={() => openAreaExplorer(area)}
                    className="bg-[#0c1829] hover:bg-[#102035] border border-[#233549] hover:border-amber-400/50 rounded-xl p-4 transition-all shadow-xl shadow-black/40 cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                            {area.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Community
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 my-2 py-2 border-y border-white/5 text-center">
                        <div>
                          <div className="text-sm font-extrabold text-white">{area.totalBuildings}</div>
                          <div className="text-[9.5px] text-white/40 uppercase">Buildings</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-blue-300">{area.totalUnits}</div>
                          <div className="text-[9.5px] text-white/40 uppercase">Units</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-emerald-300">{area.phoneCoverage}%</div>
                          <div className="text-[9.5px] text-white/40 uppercase">Phone Rate</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 flex items-center justify-end text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                      <span>Explore Area Community →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* C. MATCHED BUILDINGS SECTION                                      */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {!loading && buildingResults.length > 0 && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Matching Buildings &amp; Towers ({buildingResults.length}):
                </span>
                {filterType === 'All' && (
                  <button 
                    onClick={() => handleFilterPillClick('Buildings')}
                    className="text-blue-400 hover:text-blue-300 normal-case font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all buildings</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {buildingResults.map((b, idx) => (
                <div 
                  key={b.rawName || idx}
                  onClick={() => handleSelectBuilding(b)}
                  className="bg-[#0c1829] hover:bg-[#102035] border border-[#233549] hover:border-[#385175] rounded-xl p-4 transition-all shadow-xl shadow-black/40 flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                          {b.name}
                        </span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30 font-bold uppercase">
                          {b.area}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          b.propertyType === 'Commercial' 
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {b.propertyType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <strong className="text-white">{b.ownersCount}</strong> Owners
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-400" />
                          <strong className="text-white">{b.unitsCount}</strong> Units
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Phone className="w-3.5 h-3.5" />
                          {b.contactCoverage}% Phone Coverage ({b.contactsCount} phones)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBuilding(b);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#183153] hover:bg-blue-600 text-white border border-white/10 group-hover:border-blue-400 shadow-md flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Explore building</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* D. MATCHED OWNERS SECTION (Canonical Multi-Unit Portfolio)         */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {!loading && ownerResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white/50 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-400" />
                  Matching Owner Profiles ({ownerResults.length}):
                </span>
                {filterType === 'All' && (
                  <button 
                    onClick={() => handleFilterPillClick('Owners')}
                    className="text-blue-400 hover:text-blue-300 normal-case font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all owners</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {ownerResults.map((item, idx) => (
                <div 
                  key={item.canonical_owner_id || item.owner_id || idx}
                  className="bg-[#0c1829] hover:bg-[#102035] border border-[#233549] hover:border-[#385175] rounded-xl p-4 transition-all shadow-xl shadow-black/40 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 text-white/70 border border-white/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                          {item.full_name || 'Property Owner'}
                        </span>
                        
                        {item.nationality && (
                          <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded border border-white/10">
                            {item.nationality}
                          </span>
                        )}

                        {item.total_units > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {item.total_units} Units
                          </span>
                        )}

                        {formatAedValuation(item.total_portfolio_valuation) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatAedValuation(item.total_portfolio_valuation)}
                          </span>
                        )}

                        {item.emirates_id && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
                            EID: {item.emirates_id}
                          </span>
                        )}

                        {item.bitrix_id && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                            Bitrix #{item.bitrix_id}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                        {cleanUnitNumber(item.unit_number) && <span>Unit: <strong className="text-white/80">{cleanUnitNumber(item.unit_number)}</strong></span>}
                        {(item.primary_building || item.building_name) && <span>Primary Asset: <strong className="text-white/80">{item.primary_building || item.building_name}</strong></span>}
                        {(item.primary_area || item.master_area) && <span>Area: <strong className="text-white/80">{item.primary_area || item.master_area}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.phone_normalized && item.phone_normalized !== 'N/A' && (
                      <button
                        onClick={(e) => copyPhone(item.phone_normalized, e)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedPhone === item.phone_normalized ? <Check className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                        <span>{copiedPhone === item.phone_normalized ? 'Copied' : item.phone_normalized}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleSelectOwner(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Owner 360</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INSIDE-AREA EXPLORER DRAWER                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedArea && (
        <div className="absolute inset-y-0 right-0 w-full md:w-[640px] bg-[#020b18]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-40 flex flex-col animate-slide-left">
          <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10.5px] uppercase font-mono font-bold tracking-wider text-amber-400">
                  COMMUNITY EXPLORER
                </span>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {selectedArea.name}
                </h3>
                <p className="text-xs text-white/50">
                  {selectedArea.totalBuildings} Registered Towers &amp; Communities
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedArea(null)}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-3 gap-3 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="bg-[#03152d] border border-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase font-mono">Towers</div>
              <div className="text-lg font-extrabold text-amber-400">{selectedArea.totalBuildings}</div>
            </div>
            <div className="bg-[#03152d] border border-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase font-mono">Total Units</div>
              <div className="text-lg font-extrabold text-white">{selectedArea.totalUnits}</div>
            </div>
            <div className="bg-[#03152d] border border-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase font-mono">Owners</div>
              <div className="text-lg font-extrabold text-emerald-400">{selectedArea.totalOwners}</div>
            </div>
          </div>

          <div className="p-4 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder={`Search towers in ${selectedArea.name}...`}
                value={areaDrawerSearch}
                onChange={(e) => setAreaDrawerSearch(e.target.value)}
                className="w-full bg-[#03152d] border border-white/10 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5 min-h-0">
            {loadingAreaDetails && filteredAreaBuildings.length === 0 ? (
              <div className="py-16 text-center text-white/40 flex flex-col items-center">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mb-2" />
                <p className="text-xs">Loading towers in {selectedArea.name}...</p>
              </div>
            ) : filteredAreaBuildings.length > 0 ? (
              filteredAreaBuildings.map((b, i) => (
                <div 
                  key={b.rawName || i}
                  onClick={() => {
                    setSelectedArea(null);
                    handleSelectBuilding(b);
                  }}
                  className="bg-[#03152d]/80 hover:bg-[#062044] border border-white/5 hover:border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {b.name}
                      </div>
                      <div className="text-[11px] text-white/40 flex items-center gap-2">
                        <span>{b.ownersCount} Owners</span>
                        <span>•</span>
                        <span>{b.unitsCount || b.ownersCount} Units</span>
                        <span>•</span>
                        <span className="text-emerald-400">{b.contactCoverage}% Phone</span>
                      </div>
                    </div>
                  </div>

                  <button className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#183153] hover:bg-amber-600 text-white flex items-center gap-1 transition-all cursor-pointer">
                    <span>View Units</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-white/40">
                No matching towers found in this area.
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10 bg-[#010814] flex items-center justify-between text-xs text-white/40 shrink-0">
            <span>Showing {filteredAreaBuildings.length} towers in {selectedArea.name}</span>
            <button 
              onClick={() => setSelectedArea(null)}
              className="text-white/60 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
