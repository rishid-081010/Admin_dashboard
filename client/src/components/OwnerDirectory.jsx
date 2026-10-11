import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Filter, MoreHorizontal, User, Phone, Mail, 
  Building2, MapPin, Database, ExternalLink, Share2, 
  CheckCircle2, UserCheck, RefreshCw, ChevronDown, List, LayoutGrid,
  SlidersHorizontal, X, ArrowUpDown, Calendar, FileSpreadsheet, RotateCcw,
  Check, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';
import ownerFiltersMetadata from '../data/ownerFiltersMetadata.json';

const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const BITRIX_STATUSES = [
  { id: 'all', name: 'All Bitrix Statuses' },
  { id: 'NEW', name: 'Fresh leads' },
  { id: 'IN_PROCESS', name: 'Assigned' },
  { id: 'PROCESSED', name: 'No Answer' },
  { id: 'UC_K6BE93', name: 'Contacted — Qualifying' },
  { id: 'UC_ASQ_OWNER', name: 'Owner / Listing Qualification' },
  { id: 'UC_YYWHDB', name: 'Meeting and Viewing' },
  { id: 'UC_AU79U4', name: 'Qualified / Hot' },
  { id: 'UC_5A11LD', name: 'Offer / Negotiation' },
  { id: 'UC_2GDUWK', name: 'Deal Closed' },
  { id: '1', name: 'Not Interested' },
  { id: '2', name: 'Wrong Contact Details' },
  { id: '3', name: 'Broker/Agent' },
  { id: '4', name: "Don't Call Again" },
  { id: '5', name: 'Budget Issues' },
  { id: '6', name: 'Unreachable — Closed' },
  { id: 'JUNK', name: 'Junk Lead' },
  { id: 'CONVERTED', name: 'Booking' }
];

const PROPERTY_SUBTYPES = [
  'All',
  'Flat',
  'Unit',
  'Residential',
  'Villa',
  'Land',
  'Commercial',
  'Office',
  'Building',
  'Hotel Apartment',
  'Shop',
  'Hotel Rooms',
  'Industrial',
  'Warehouse',
  'Apartments',
  'Duplex'
];

export default function OwnerDirectory({ globalAgentId = '6', globalAgentName = 'Melanie Simsiman', agentsList = [] }) {
  // ─── 1. Main Big Bar Search (Omni Search Engine style) ───────────────────
  const [searchTerm, setSearchTerm] = useState('');

  // ─── 2. Filters Box State & Sub-Filtering Options ────────────────────────
  const [showFiltersBox, setShowFiltersBox] = useState(false);

  // Sub-option: Present in CRM ('all' | 'yes' | 'no')
  const [crmPresent, setCrmPresent] = useState('all');
  // Sub-option (if present in CRM): Assigned / Unassigned ('all' | 'assigned' | 'unassigned')
  const [crmAssignment, setCrmAssignment] = useState('all');
  // Sub-option (if assigned): Agent Name ('all' or specific name)
  const [crmAgent, setCrmAgent] = useState('all');
  // Sub-option (if present in CRM): Bitrix Status ('all' or specific status)
  const [crmBitrixStatus, setCrmBitrixStatus] = useState('all');

  // Sub-option: Building (Searchable dropdown with search through buildings)
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const [isBuildingMenuOpen, setIsBuildingMenuOpen] = useState(false);

  // Sub-option: Type (Dropdown of all property subtypes)
  const [selectedPropertyType, setSelectedPropertyType] = useState('All');

  // Sub-option: Phone ('all' | 'yes' | 'no')
  const [phoneFilter, setPhoneFilter] = useState('all');

  // Sub-option: Email ('all' | 'yes' | 'no')
  const [emailFilter, setEmailFilter] = useState('all');

  // Sub-option: Data from (Roster of CSV/Excel source files with search feature)
  const [selectedSourceFile, setSelectedSourceFile] = useState('');
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);

  // Sub-option: Date from <----> Date to
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ─── 3. Right Side Controls ──────────────────────────────────────────────
  const [sortBy, setSortBy] = useState('Name A–Z');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // ─── Data & Pagination State ─────────────────────────────────────────────
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // ─── Slider / Action State ───────────────────────────────────────────────
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [pushedIds, setPushedIds] = useState(new Set());
  const [syncingId, setSyncingId] = useState(null);

  // Agents list
  const availableAgents = useMemo(() => {
    return agentsList && agentsList.length > 0 ? agentsList : [
      { id: '6', name: 'Melanie Simsiman', role: 'Admin' },
      { id: '7', name: 'Akarsh Arora', role: 'Agent' },
      { id: '186', name: 'NIDAF KHAN', role: 'Agent' },
      { id: '201', name: 'Humesh Gurung', role: 'Agent' }
    ];
  }, [agentsList]);

  // Filtered lists for searchable comboboxes
  const allBuildings = useMemo(() => ownerFiltersMetadata?.buildings || [], []);
  const filteredBuildings = useMemo(() => {
    if (!buildingSearchQuery.trim()) return allBuildings.slice(0, 50);
    const q = buildingSearchQuery.toLowerCase();
    return allBuildings.filter(b => b.toLowerCase().includes(q)).slice(0, 50);
  }, [allBuildings, buildingSearchQuery]);

  const allSources = useMemo(() => ownerFiltersMetadata?.sources || [], []);
  const filteredSources = useMemo(() => {
    if (!sourceSearchQuery.trim()) return allSources.slice(0, 50);
    const q = sourceSearchQuery.toLowerCase();
    return allSources.filter(s => s.toLowerCase().includes(q)).slice(0, 50);
  }, [allSources, sourceSearchQuery]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (crmPresent !== 'all') count++;
    if (crmPresent === 'yes' && crmAssignment !== 'all') count++;
    if (crmPresent === 'yes' && crmAssignment === 'assigned' && crmAgent !== 'all') count++;
    if (crmPresent === 'yes' && crmBitrixStatus !== 'all') count++;
    if (selectedBuilding) count++;
    if (selectedPropertyType !== 'All') count++;
    if (phoneFilter !== 'all') count++;
    if (emailFilter !== 'all') count++;
    if (selectedSourceFile) count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [
    crmPresent, crmAssignment, crmAgent, crmBitrixStatus, 
    selectedBuilding, selectedPropertyType, phoneFilter, emailFilter, 
    selectedSourceFile, dateFrom, dateTo
  ]);

  const resetAllFilters = () => {
    setCrmPresent('all');
    setCrmAssignment('all');
    setCrmAgent('all');
    setCrmBitrixStatus('all');
    setSelectedBuilding('');
    setBuildingSearchQuery('');
    setSelectedPropertyType('All');
    setPhoneFilter('all');
    setEmailFilter('all');
    setSelectedSourceFile('');
    setSourceSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // ─── Query Execution ─────────────────────────────────────────────────────
  const fetchOwners = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const isSearching = searchTerm.trim().length > 1;

      // Base select
      let url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?select=lead_id,owner_id,full_name,building_name,master_area,unit_number,phone_normalized,phone_raw,email,nationality,emirates_id,passport_expiry,reported_property_type,verified_bedrooms,verified_purchase_price,verified_purchase_date,verified_size_sqft,vendor_source_file,bitrix_id,assigned_agent,assigned_agent_id,bitrix_status&limit=${itemsPerPage}&offset=${offset}`;

      // 1. Omni Search Bar logic
      if (isSearching) {
        const queryTerm = searchTerm.trim();
        const cleanDigits = queryTerm.replace(/[^0-9]/g, '');
        
        if (queryTerm.startsWith('+') || (cleanDigits.length >= 7 && /^[+0-9\s-]+$/.test(queryTerm))) {
          const pExact = queryTerm.startsWith('+') ? queryTerm : `+${cleanDigits}`;
          url += `&or=(phone_normalized.eq.${encodeURIComponent(pExact)},bitrix_id.eq.${encodeURIComponent(cleanDigits)},lead_id.eq.${encodeURIComponent(queryTerm)})`;
        } else if (queryTerm.toUpperCase().startsWith('LEAD-')) {
          url += `&lead_id.ilike.*${encodeURIComponent(queryTerm)}*`;
        } else if (cleanDigits.length > 0 && queryTerm.length < 8 && !/[a-zA-Z]/.test(queryTerm)) {
          url += `&or=(bitrix_id.eq.${encodeURIComponent(cleanDigits)},lead_id.ilike.*${encodeURIComponent(queryTerm)}*,unit_number.eq.${encodeURIComponent(queryTerm)})`;
        } else {
          const enc = encodeURIComponent(queryTerm);
          url += `&or=(full_name.ilike.*${enc}*,building_name.ilike.*${enc}*,lead_id.ilike.*${enc}*,assigned_agent.ilike.*${enc}*)`;
        }
      }

      // 2. Present in CRM & nested sub-filters
      if (crmPresent === 'yes') {
        url += '&bitrix_id=not.is.null';

        // Assigned / Unassigned
        if (crmAssignment === 'unassigned') {
          url += '&assigned_agent=is.null';
        } else if (crmAssignment === 'assigned') {
          if (crmAgent !== 'all') {
            url += `&assigned_agent=eq.${encodeURIComponent(crmAgent)}`;
          } else {
            url += '&assigned_agent=not.is.null';
          }
        }

        // Status (only when in CRM)
        if (crmBitrixStatus !== 'all') {
          url += `&or=(bitrix_status.eq.${encodeURIComponent(crmBitrixStatus)},bitrix_status_id.eq.${encodeURIComponent(crmBitrixStatus)})`;
        }
      } else if (crmPresent === 'no') {
        url += '&bitrix_id=is.null';
      }

      // 3. Building
      if (selectedBuilding) {
        url += `&building_name=ilike.*${encodeURIComponent(selectedBuilding)}*`;
      }

      // 4. Type (Property subtype)
      if (selectedPropertyType && selectedPropertyType !== 'All') {
        url += `&reported_property_type=ilike.*${encodeURIComponent(selectedPropertyType)}*`;
      }

      // 5. Phone
      if (phoneFilter === 'yes') {
        url += '&phone_normalized=not.is.null';
      } else if (phoneFilter === 'no') {
        url += '&phone_normalized=is.null';
      }

      // 6. Email
      if (emailFilter === 'yes') {
        url += '&email=not.is.null';
      } else if (emailFilter === 'no') {
        url += '&email=is.null';
      }

      // 7. Data from (Source file roster)
      if (selectedSourceFile) {
        url += `&vendor_source_file=eq.${encodeURIComponent(selectedSourceFile)}`;
      }

      // 8. Date from <----> Date to
      if (dateFrom) {
        url += `&verified_purchase_date=gte.${dateFrom}`;
      }
      if (dateTo) {
        url += `&verified_purchase_date=lte.${dateTo}`;
      }

      // Sort Order
      if (!isSearching) {
        if (sortBy === 'Name A–Z') {
          url += `&order=full_name.asc`;
        } else if (sortBy === 'Name Z–A') {
          url += `&order=full_name.desc`;
        } else if (sortBy === 'Price: High to Low') {
          url += `&order=verified_purchase_price.desc.nullslast`;
        } else if (sortBy === 'Price: Low to High') {
          url += `&order=verified_purchase_price.asc.nullslast`;
        } else if (sortBy === 'Lead ID (Newest)') {
          url += `&order=lead_id.desc`;
        } else if (sortBy === 'Lead ID (Oldest)') {
          url += `&order=lead_id.asc`;
        } else {
          url += `&order=owner_id.asc`;
        }
      }
      
      const response = await axios.get(url, { 
        headers: { 
          apikey: SUPABASE_API_KEY, 
          Authorization: `Bearer ${SUPABASE_API_KEY}` 
        } 
      });
      
      if (Array.isArray(response.data)) {
        const mapped = response.data.map(row => ({
          id: row.owner_id ? String(row.owner_id) : 'UnknownID',
          lead_id: row.lead_id ? String(row.lead_id) : (row.owner_id ? String(row.owner_id) : 'LEAD-0000000'),
          name: row.full_name ? String(row.full_name) : 'Unknown Owner',
          building: row.building_name ? String(row.building_name) : 'N/A',
          area: row.master_area ? String(row.master_area) : 'Dubai',
          phone: row.phone_normalized ? String(row.phone_normalized) : (row.phone_raw ? String(row.phone_raw) : 'N/A'),
          email: row.email ? String(row.email) : 'N/A',
          units: row.verified_bedrooms ? parseInt(row.verified_bedrooms) : 1,
          unit_number: row.unit_number ? String(row.unit_number) : null,
          property_type: row.reported_property_type || null,
          nationality: row.nationality || null,
          emirates_id: row.emirates_id || null,
          passport_expiry: row.passport_expiry || null,
          verified_purchase_price: row.verified_purchase_price || null,
          verified_purchase_date: row.verified_purchase_date || null,
          verified_size_sqft: row.verified_size_sqft || null,
          vendor_source_file: row.vendor_source_file || null,
          source: 'Verified',
          bitrix_id: row.bitrix_id ? String(row.bitrix_id) : null,
          bitrix_status: row.bitrix_status || null,
          assigned_agent: row.assigned_agent || null,
          assigned_agent_id: row.assigned_agent_id || null,
          portfolioValue: row.verified_purchase_price ? `AED ${(parseFloat(row.verified_purchase_price) / 1000000).toFixed(1)}M` : 'Standard',
          lastContact: row.bitrix_id ? 'In Bitrix' : 'Never'
        }));
        setOwners(mapped);
      } else {
        setOwners([]);
      }
    } catch (error) {
      console.error("Supabase fetch failed", error);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOwners();
    }, 280);
    return () => clearTimeout(timeoutId);
  }, [
    currentPage, searchTerm, crmPresent, crmAssignment, crmAgent, 
    crmBitrixStatus, selectedBuilding, selectedPropertyType, 
    phoneFilter, emailFilter, selectedSourceFile, dateFrom, dateTo, sortBy
  ]);

  // ─── Bitrix24 Integration Actions ────────────────────────────────────────
  const pushToBitrix = async (lead, agentIdOverride, agentNameOverride) => {
    setSyncingId(lead.id);
    try {
      const targetAgentId = agentIdOverride || lead.assigned_agent_id || globalAgentId || '6';
      const targetAgent = availableAgents.find(a => String(a.id) === String(targetAgentId));
      const targetAgentName = agentNameOverride || lead.assigned_agent || (targetAgent ? targetAgent.name : globalAgentName);

      const w_url = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/crm.lead.add.json';
      const bRes = await axios.post(w_url, {
        fields: { 
          TITLE: `[${lead.lead_id}] ${lead.name} - ${lead.building}`, 
          NAME: lead.name, 
          PHONE: [{ VALUE: lead.phone, VALUE_TYPE: "WORK" }], 
          EMAIL: lead.email && lead.email !== 'N/A' ? [{ VALUE: lead.email, VALUE_TYPE: "WORK" }] : [],
          ASSIGNED_BY_ID: targetAgentId,
          COMMENTS: `Lead ID: ${lead.lead_id}\nBuilding: ${lead.building}\nUnit: ${lead.unit_number || 'N/A'}\nMaster Area: ${lead.area}\nAssigned Agent: ${targetAgentName}\nPushed via A-Squared Data Portal` 
        }
      });

      const newBitrixId = bRes.data?.result;
      if (newBitrixId) {
        await axios.patch(
          `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?owner_id=eq.${encodeURIComponent(lead.id)}`,
          {
            bitrix_id: String(newBitrixId),
            assigned_agent: targetAgentName,
            assigned_agent_id: String(targetAgentId)
          },
          { 
            headers: { 
              apikey: SUPABASE_API_KEY, 
              Authorization: `Bearer ${SUPABASE_API_KEY}`,
              'Content-Type': 'application/json'
            } 
          }
        );

        setOwners(prev => prev.map(o => o.id === lead.id ? {
          ...o,
          bitrix_id: String(newBitrixId),
          assigned_agent: targetAgentName,
          assigned_agent_id: String(targetAgentId)
        } : o));

        setPushedIds(prev => new Set([...prev, lead.id]));
        return newBitrixId;
      }
    } catch(err) {
      console.error("Push failed", err);
      alert("Failed to push to Bitrix: " + (err.message || 'Network error'));
    } finally {
      setSyncingId(null);
    }
  };

  const handleAssignAgent = async (e, lead, selectedAgent) => {
    if (e) e.stopPropagation();
    try {
      await axios.patch(
        `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?owner_id=eq.${encodeURIComponent(lead.id)}`,
        {
          assigned_agent: selectedAgent.name,
          assigned_agent_id: String(selectedAgent.id)
        },
        { 
          headers: { 
            apikey: SUPABASE_API_KEY, 
            Authorization: `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (lead.bitrix_id) {
        await axios.post('https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/crm.lead.update.json', {
          id: lead.bitrix_id,
          fields: { ASSIGNED_BY_ID: selectedAgent.id }
        });
      }

      setOwners(prev => prev.map(o => o.id === lead.id ? {
        ...o,
        assigned_agent: selectedAgent.name,
        assigned_agent_id: String(selectedAgent.id)
      } : o));
    } catch (err) {
      console.error("Agent assignment sync failed", err);
    }
  };

  return (
    <div className="w-full flex flex-col h-full animate-fade-in relative text-white/80">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1.5" style={{ fontFamily: "Georgia, serif" }}>
            OWNERS DATA
          </h1>
          <p className="text-white/60 text-[14px]">
            Directory of 3,042,722 verified property owners linked to Bitrix24 CRM pipeline.
          </p>
        </div>
      </div>

      {/* ─── Main Search & Filtration Toolbar ──────────────────────────────── */}
      <div className="bg-[#021024]/90 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-xl p-3 sm:p-4 mb-4 select-none">
        
        {/* Top Row: Big Search Bar + Filters Button + Sort + View Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* 1. Main Big Bar Search (Omni Search Style) */}
          <div className="relative flex-1 min-w-[260px] sm:min-w-[340px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
            <input
              type="text"
              placeholder="Search by owner name, phone number, building, unit, or Lead ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-black/40 hover:bg-black/50 focus:bg-black/60 border border-white/15 focus:border-blue-500/80 rounded-2xl pl-12 pr-10 py-3 text-xs sm:text-sm font-medium text-white placeholder-white/40 focus:outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls Cluster: Filters Button + Sort + View Mode */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 self-end lg:self-auto">
            
            {/* 2. Filters Box Launcher Button */}
            <button
              onClick={() => setShowFiltersBox(prev => !prev)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-semibold border transition-all cursor-pointer shadow-md ${
                showFiltersBox || activeFiltersCount > 0
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow-blue-900/30 ring-1 ring-blue-500/40'
                  : 'bg-white/[0.05] hover:bg-white/[0.09] text-white/90 border-white/15'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              <span className="font-bold tracking-wide">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${showFiltersBox ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/50 hidden sm:inline">Sort</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-blue-500/60 rounded-xl pl-3 pr-8 py-2.5 text-xs font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                >
                  <option value="Name A–Z" className="bg-slate-900 text-white">Name A–Z</option>
                  <option value="Name Z–A" className="bg-slate-900 text-white">Name Z–A</option>
                  <option value="Price: High to Low" className="bg-slate-900 text-white">Price: High to Low</option>
                  <option value="Price: Low to High" className="bg-slate-900 text-white">Price: Low to High</option>
                  <option value="Lead ID (Newest)" className="bg-slate-900 text-white">Lead ID (Newest)</option>
                  <option value="Lead ID (Oldest)" className="bg-slate-900 text-white">Lead ID (Oldest)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
              </div>
            </div>

            {/* View Mode Toggle: [ List | Grid ] */}
            <div className="flex items-center bg-black/40 border border-white/15 rounded-xl p-0.5 shadow-inner">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-white/40 hover:text-white'
                }`}
                title="List (Table) View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-white/40 hover:text-white'
                }`}
                title="Grid (Cards) View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* ─── Active Filter Pills (Clickable dismissal) ────────────────────── */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-white/10 text-xs animate-fade-in">
            <span className="text-white/40 font-bold text-[11px] uppercase tracking-wider">Active:</span>
            
            {crmPresent !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                CRM: {crmPresent === 'yes' ? 'In Bitrix24' : 'Not in CRM'}
                <button onClick={() => setCrmPresent('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {crmPresent === 'yes' && crmAssignment !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                {crmAssignment === 'assigned' ? 'Assigned' : 'Unassigned'}
                <button onClick={() => setCrmAssignment('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {crmPresent === 'yes' && crmAssignment === 'assigned' && crmAgent !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                Agent: {crmAgent}
                <button onClick={() => setCrmAgent('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {crmPresent === 'yes' && crmBitrixStatus !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                Status: {BITRIX_STATUSES.find(s => s.id === crmBitrixStatus)?.name || crmBitrixStatus}
                <button onClick={() => setCrmBitrixStatus('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {selectedBuilding && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-medium">
                Building: {selectedBuilding}
                <button onClick={() => setSelectedBuilding('')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {selectedPropertyType !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 font-medium">
                Type: {selectedPropertyType}
                <button onClick={() => setSelectedPropertyType('All')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {phoneFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-medium">
                Phone: {phoneFilter === 'yes' ? 'Has Phone' : 'No Phone'}
                <button onClick={() => setPhoneFilter('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {emailFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-medium">
                Email: {emailFilter === 'yes' ? 'Has Email' : 'No Email'}
                <button onClick={() => setEmailFilter('all')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {selectedSourceFile && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-medium">
                File: {selectedSourceFile}
                <button onClick={() => setSelectedSourceFile('')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 font-medium">
                Date: {dateFrom || 'Any'} → {dateTo || 'Any'}
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-white/40 hover:text-red-300 underline font-semibold ml-1 cursor-pointer transition-colors"
            >
              Reset all
            </button>
          </div>
        )}

        {/* ─── The Filters Box (One Big Expandable Box with All Sub-Filters) ─ */}
        {showFiltersBox && (
          <div className="mt-4 pt-4 border-t border-white/15 bg-black/40 rounded-2xl p-4 sm:p-5 shadow-2xl animate-fade-in text-xs space-y-4">
            
            {/* Box Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white text-sm">Advanced Filter Matrix</span>
                <span className="text-white/40 text-xs hidden sm:inline">— Target owners across CRM lifecycle, building inventory, and data sources</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllFilters}
                  className="px-2.5 py-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
                <button
                  onClick={() => setShowFiltersBox(false)}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  title="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              
              {/* ── 1. Present in CRM (with Conditional Sub-Filters) ── */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    Present in CRM
                  </label>
                  
                  {/* Yes / No / All toggle */}
                  <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-lg border border-white/10 mb-2.5">
                    {['all', 'yes', 'no'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          setCrmPresent(opt);
                          if (opt !== 'yes') {
                            setCrmAssignment('all');
                            setCrmAgent('all');
                            setCrmBitrixStatus('all');
                          }
                          setCurrentPage(1);
                        }}
                        className={`py-1 rounded text-center font-bold capitalize transition-all ${
                          crmPresent === opt 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {opt === 'all' ? 'All' : opt === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>

                  {/* Conditional sub-options: ONLY if present in CRM === 'yes' */}
                  {crmPresent === 'yes' && (
                    <div className="space-y-2.5 pt-2 border-t border-white/10 animate-fade-in">
                      
                      {/* Assignment status */}
                      <div>
                        <span className="text-[10px] font-semibold text-white/50 block mb-1">Assignment:</span>
                        <div className="grid grid-cols-3 gap-1 bg-black/30 p-0.5 rounded-lg border border-white/10">
                          {['all', 'assigned', 'unassigned'].map(asOpt => (
                            <button
                              key={asOpt}
                              onClick={() => {
                                setCrmAssignment(asOpt);
                                if (asOpt !== 'assigned') setCrmAgent('all');
                                setCurrentPage(1);
                              }}
                              className={`py-0.5 text-[11px] rounded text-center capitalize transition-all ${
                                crmAssignment === asOpt 
                                  ? 'bg-blue-500/40 text-blue-200 font-bold border border-blue-400/30' 
                                  : 'text-white/40 hover:text-white'
                              }`}
                            >
                              {asOpt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* If Assigned -> All agent names */}
                      {crmAssignment === 'assigned' && (
                        <div className="animate-fade-in">
                          <span className="text-[10px] font-semibold text-white/50 block mb-1">Agent Name:</span>
                          <select
                            value={crmAgent}
                            onChange={(e) => {
                              setCrmAgent(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-white outline-none focus:border-blue-500"
                          >
                            <option value="all" className="bg-slate-900 text-white">All Agents</option>
                            {availableAgents.map(ag => (
                              <option key={ag.id} value={ag.name} className="bg-slate-900 text-white">
                                {ag.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Bitrix Status -> All bitrix statuses (only if lead is in CRM) */}
                      <div className="animate-fade-in">
                        <span className="text-[10px] font-semibold text-white/50 block mb-1">Bitrix CRM Status:</span>
                        <select
                          value={crmBitrixStatus}
                          onChange={(e) => {
                            setCrmBitrixStatus(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-white outline-none focus:border-blue-500"
                        >
                          {BITRIX_STATUSES.map(st => (
                            <option key={st.id} value={st.id} className="bg-slate-900 text-white">
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>

                    </div>
                  )}
                </div>
              </div>

              {/* ── 2. Building (Dropdown with Search through buildings) ── */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 relative">
                <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Building
                  </span>
                  {selectedBuilding && (
                    <button 
                      onClick={() => setSelectedBuilding('')}
                      className="text-white/40 hover:text-red-300 text-[10px] lowercase"
                    >
                      clear
                    </button>
                  )}
                </label>

                {/* Search input for buildings */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search 300+ buildings..."
                    value={buildingSearchQuery}
                    onChange={(e) => {
                      setBuildingSearchQuery(e.target.value);
                      setIsBuildingMenuOpen(true);
                    }}
                    onFocus={() => setIsBuildingMenuOpen(true)}
                    className="w-full bg-black/50 border border-white/15 focus:border-emerald-500/60 rounded-lg pl-8 pr-7 py-1.5 text-white placeholder-white/30 outline-none text-xs"
                  />
                  {buildingSearchQuery && (
                    <button 
                      onClick={() => setBuildingSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Selected Building Display */}
                {selectedBuilding ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
                    <span className="font-semibold truncate">{selectedBuilding}</span>
                    <button onClick={() => setSelectedBuilding('')}><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="text-[11px] text-white/40 italic mb-1">
                    Select a building below or type to search:
                  </div>
                )}

                {/* Dropdown list of buildings */}
                {isBuildingMenuOpen && (
                  <div className="mt-1 max-h-36 overflow-y-auto custom-scrollbar bg-[#051329] border border-white/15 rounded-lg divide-y divide-white/5 shadow-2xl z-30">
                    <button
                      onClick={() => {
                        setSelectedBuilding('');
                        setIsBuildingMenuOpen(false);
                        setCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-white/50 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>All Buildings</span>
                      {!selectedBuilding && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                    {filteredBuildings.map(bldg => (
                      <button
                        key={bldg}
                        onClick={() => {
                          setSelectedBuilding(bldg);
                          setIsBuildingMenuOpen(false);
                          setCurrentPage(1);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-white/80 hover:bg-emerald-600/20 hover:text-emerald-200 transition-colors flex items-center justify-between text-xs truncate"
                      >
                        <span className="truncate">{bldg}</span>
                        {selectedBuilding === bldg && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 3. Type (Property Subtypes available in owners data) ── */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    Property Type
                  </label>
                  <p className="text-[11px] text-white/40 mb-2">Filter across verified property classifications:</p>
                  
                  <select
                    value={selectedPropertyType}
                    onChange={(e) => {
                      setSelectedPropertyType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 font-medium cursor-pointer"
                  >
                    {PROPERTY_SUBTYPES.map(type => (
                      <option key={type} value={type} className="bg-slate-900 text-white">
                        {type === 'All' ? 'All Property Types' : type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick chip shortcuts */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {['Flat', 'Villa', 'Commercial', 'Land'].map(pt => (
                    <button
                      key={pt}
                      onClick={() => {
                        setSelectedPropertyType(selectedPropertyType === pt ? 'All' : pt);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        selectedPropertyType === pt 
                          ? 'bg-purple-600 text-white border border-purple-400' 
                          : 'bg-white/5 hover:bg-white/10 text-white/50'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 4 & 5. Contact Channels (Phone & Email Yes/No) ── */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    Contact Verification
                  </label>

                  {/* Phone Yes/No */}
                  <div className="mb-3">
                    <span className="text-[10px] font-semibold text-white/50 block mb-1">Has Phone Number:</span>
                    <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                      {['all', 'yes', 'no'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            setPhoneFilter(opt);
                            setCurrentPage(1);
                          }}
                          className={`py-1 text-center font-bold capitalize rounded transition-all ${
                            phoneFilter === opt 
                              ? 'bg-amber-600 text-white shadow-sm' 
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {opt === 'all' ? 'All' : opt === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email Yes/No */}
                  <div>
                    <span className="text-[10px] font-semibold text-white/50 block mb-1">Has Email Address:</span>
                    <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                      {['all', 'yes', 'no'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            setEmailFilter(opt);
                            setCurrentPage(1);
                          }}
                          className={`py-1 text-center font-bold capitalize rounded transition-all ${
                            emailFilter === opt 
                              ? 'bg-amber-600 text-white shadow-sm' 
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {opt === 'all' ? 'All' : opt === 'yes' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* ── 6. Data from (Source File Roster with Search Feature) ── */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 relative md:col-span-2">
                <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                    Data from (Source File Roster)
                  </span>
                  {selectedSourceFile && (
                    <button 
                      onClick={() => setSelectedSourceFile('')}
                      className="text-white/40 hover:text-red-300 text-[10px] lowercase"
                    >
                      clear
                    </button>
                  )}
                </label>

                {/* Search input for source files */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search 400+ file rosters (e.g. jvc.xlsx, Business Bay, D1)..."
                    value={sourceSearchQuery}
                    onChange={(e) => {
                      setSourceSearchQuery(e.target.value);
                      setIsSourceMenuOpen(true);
                    }}
                    onFocus={() => setIsSourceMenuOpen(true)}
                    className="w-full bg-black/50 border border-white/15 focus:border-cyan-500/60 rounded-lg pl-8 pr-7 py-1.5 text-white placeholder-white/30 outline-none text-xs"
                  />
                  {sourceSearchQuery && (
                    <button 
                      onClick={() => setSourceSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Selected File Display */}
                {selectedSourceFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
                    <span className="font-semibold truncate">{selectedSourceFile}</span>
                    <button onClick={() => setSelectedSourceFile('')}><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="text-[11px] text-white/40 italic mb-1">
                    Select a source file below or search by file name:
                  </div>
                )}

                {/* Dropdown list of source files */}
                {isSourceMenuOpen && (
                  <div className="mt-1 max-h-36 overflow-y-auto custom-scrollbar bg-[#051329] border border-white/15 rounded-lg divide-y divide-white/5 shadow-2xl z-30">
                    <button
                      onClick={() => {
                        setSelectedSourceFile('');
                        setIsSourceMenuOpen(false);
                        setCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-white/50 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>All Data Sources</span>
                      {!selectedSourceFile && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                    {filteredSources.map(src => (
                      <button
                        key={src}
                        onClick={() => {
                          setSelectedSourceFile(src);
                          setIsSourceMenuOpen(false);
                          setCurrentPage(1);
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-white/80 hover:bg-cyan-600/20 hover:text-cyan-200 transition-colors flex items-center justify-between text-xs truncate"
                      >
                        <span className="truncate">{src}</span>
                        {selectedSourceFile === src && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 7. Date from <----> Date to ── */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 md:col-span-2">
                <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Date Range (Date from &lt;————&gt; Date to)
                  </span>
                  {(dateFrom || dateTo) && (
                    <button 
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="text-white/40 hover:text-red-300 text-[10px] lowercase"
                    >
                      clear
                    </button>
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                  <div className="relative">
                    <span className="text-[10px] text-white/40 block mb-0.5">Date from:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-black/60 border border-white/15 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-white outline-none text-xs"
                    />
                  </div>

                  <div className="relative">
                    <span className="text-[10px] text-white/40 block mb-0.5">Date to:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-black/60 border border-white/15 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-white outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Quick preset chips */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] text-white/40">Presets:</span>
                  {[
                    { label: '2024', from: '2024-01-01', to: '2024-12-31' },
                    { label: '2023', from: '2023-01-01', to: '2023-12-31' },
                    { label: '2022', from: '2022-01-01', to: '2022-12-31' }
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setDateFrom(p.from);
                        setDateTo(p.to);
                        setCurrentPage(1);
                      }}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 text-[10px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Box Footer Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-white/50 text-xs">
                {activeFiltersCount === 0 ? 'No filters currently applied' : `${activeFiltersCount} active filter${activeFiltersCount > 1 ? 's' : ''} applied`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllFilters}
                  className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium transition-all"
                >
                  Reset All Filters
                </button>
                <button
                  onClick={() => setShowFiltersBox(false)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-md shadow-blue-900/30"
                >
                  Apply &amp; Close
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ─── Main Content Area: List Table View or Grid View ───────────────── */}
      {viewMode === 'list' ? (
        <div className="flex-1 min-h-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg relative flex flex-col overflow-hidden">
          <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
            <table className="w-full text-left border-collapse text-[14px]">
              <thead className="bg-[#051833] border-b border-white/15 text-xs uppercase tracking-wider text-white/70 sticky top-0 z-20 shadow-md shadow-black/40">
                <tr>
                  <th className="px-5 py-4 font-semibold bg-[#051833]">Lead ID &amp; Owner</th>
                  <th className="px-5 py-4 font-semibold bg-[#051833]">Phone &amp; Email</th>
                  <th className="px-5 py-4 font-semibold bg-[#051833]">Property &amp; Unit</th>
                  <th className="px-5 py-4 font-semibold bg-[#051833]">Assigned Agent</th>
                  <th className="px-5 py-4 font-semibold bg-[#051833]">Bitrix ID / Status</th>
                  <th className="px-5 py-4 font-semibold text-right bg-[#051833]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-12 text-white/40">Loading owner records...</td></tr>
                ) : owners.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-white/40">No owners found matching filters.</td></tr>
                ) : owners.map((owner) => {
                  const isSynced = !!owner.bitrix_id || pushedIds.has(owner.id);
                  const isSyncing = syncingId === owner.id;

                  return (
                    <tr 
                      key={owner.id} 
                      className="hover:bg-white/5 transition-colors group cursor-pointer" 
                      onClick={() => setSelectedOwner(owner)}
                    >
                      {/* 1. Lead ID & Owner Name */}
                      <td className="px-5 py-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs shrink-0">
                            {owner.name ? String(owner.name).charAt(0) : 'O'}
                          </div>
                          <div>
                            <div className="font-semibold text-white/95 group-hover:text-blue-400 transition-colors">
                              {owner.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold">
                                {owner.lead_id}
                              </span>
                              {owner.property_type && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10 uppercase tracking-wider font-semibold">
                                  {owner.property_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Phone & Email */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-white/80">
                            <Phone className="w-3 h-3 text-white/40 shrink-0" />
                            <span className="font-mono">{owner.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Mail className="w-3 h-3 text-white/40 shrink-0" />
                            <span className="truncate max-w-[140px]">{owner.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Property & Unit */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="font-medium text-white/90 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                            <span>{owner.building}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/50">
                            {owner.unit_number && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 font-mono text-[10px] font-bold">
                                Unit {owner.unit_number}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-white/40" />
                              {owner.area}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Assigned Agent */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block w-44">
                          <select
                            value={owner.assigned_agent || ''}
                            onChange={(e) => {
                              const chosen = availableAgents.find(a => a.name === e.target.value);
                              if (chosen) handleAssignAgent(e, owner, chosen);
                            }}
                            className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 focus:border-blue-500/60 rounded-xl pl-7 pr-7 py-1.5 text-xs font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                          >
                            <option value="" disabled className="bg-slate-900 text-white/50">Unassigned</option>
                            {availableAgents.map(ag => (
                              <option key={ag.id} value={ag.name} className="bg-slate-900 text-white">
                                {ag.name}
                              </option>
                            ))}
                          </select>
                          <UserCheck className="w-3.5 h-3.5 text-blue-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 5. Bitrix ID / Status */}
                      <td className="px-5 py-4">
                        {isSynced ? (
                          <div className="flex flex-col gap-1">
                            <a
                              href={`https://crm.asquared.ae/crm/lead/details/${owner.bitrix_id}/`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-all w-fit group/btn"
                            >
                              <span>Lead #{owner.bitrix_id}</span>
                              <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                            </a>
                            {owner.bitrix_status && (
                              <span className="text-[10px] text-white/50">
                                {owner.bitrix_status}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pushToBitrix(owner);
                            }}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isSyncing ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                                <span>Syncing...</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3 h-3 text-blue-400" />
                                <span>Push to Bitrix</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOwner(owner);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                          title="Open 360 View"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/60">
            <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {((currentPage - 1) * itemsPerPage) + owners.length} of 3.04M owner records</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
              >
                Previous
              </button>
              
              <button 
                onClick={() => setCurrentPage(1)} 
                className={`px-3 py-1 rounded-md font-medium ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 hover:text-white transition-colors'}`}
              >
                1
              </button>
              
              {currentPage > 3 && <span className="px-1.5 py-1 text-white/40">...</span>}
              {currentPage > 2 && (
                <button 
                  onClick={() => setCurrentPage(currentPage - 1)} 
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors"
                >
                  {currentPage - 1}
                </button>
              )}
              {currentPage !== 1 && (
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md font-medium">
                  {currentPage}
                </button>
              )}
              
              <button 
                onClick={() => setCurrentPage(currentPage + 1)} 
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors"
              >
                {currentPage + 1}
              </button>
              <button 
                onClick={() => setCurrentPage(currentPage + 2)} 
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors"
              >
                {currentPage + 2}
              </button>
              
              <span className="px-1.5 py-1 text-white/40">...</span>
              <button 
                onClick={() => setCurrentPage(currentPage + 1)} 
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Grid (Cards) View ────────────────────────────────────────────── */
        <div className="flex-1 min-h-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-lg relative flex flex-col overflow-hidden p-4">
          <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
            {loading ? (
              <div className="text-center py-16 text-white/40">Loading owner cards...</div>
            ) : owners.length === 0 ? (
              <div className="text-center py-16 text-white/40">No owners found matching filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {owners.map(owner => {
                  const isSynced = !!owner.bitrix_id || pushedIds.has(owner.id);
                  const isSyncing = syncingId === owner.id;

                  return (
                    <div
                      key={owner.id}
                      onClick={() => setSelectedOwner(owner)}
                      className="bg-black/30 hover:bg-black/40 border border-white/10 hover:border-blue-500/40 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between shadow-lg group"
                    >
                      <div>
                        {/* Top Row: Avatar + Lead ID + CRM badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs">
                              {owner.name ? String(owner.name).charAt(0) : 'O'}
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors line-clamp-1">
                                {owner.name}
                              </h3>
                              <span className="text-[10px] font-mono text-blue-400 font-bold">
                                {owner.lead_id}
                              </span>
                            </div>
                          </div>

                          {isSynced ? (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              Bitrix #{owner.bitrix_id}
                            </span>
                          ) : (
                            <span className="bg-white/5 text-white/40 border border-white/10 text-[10px] font-medium px-2 py-0.5 rounded-md">
                              Not in CRM
                            </span>
                          )}
                        </div>

                        {/* Property & Building */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 mb-3 text-xs">
                          <div className="flex items-center justify-between text-white/90 font-medium">
                            <span className="flex items-center gap-1.5 truncate">
                              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              {owner.building}
                            </span>
                            {owner.unit_number && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 font-mono text-[10px] font-bold">
                                Unit {owner.unit_number}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-white/40 text-[11px] mt-1.5">
                            <span>{owner.area}</span>
                            {owner.property_type && (
                              <span className="uppercase text-[9px] tracking-wider font-semibold text-white/50">
                                {owner.property_type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Contact info */}
                        <div className="space-y-1 mb-4 text-xs text-white/70">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-white/40" />
                            <span className="font-mono">{owner.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-white/40" />
                            <span className="truncate">{owner.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Agent Assignment & Sync button */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 text-xs text-white/70">
                          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                          <select
                            value={owner.assigned_agent || ''}
                            onChange={(e) => {
                              const chosen = availableAgents.find(a => a.name === e.target.value);
                              if (chosen) handleAssignAgent(e, owner, chosen);
                            }}
                            className="bg-transparent border-none text-xs text-white/80 font-medium outline-none cursor-pointer"
                          >
                            <option value="" disabled className="bg-slate-900 text-white/50">Unassigned</option>
                            {availableAgents.map(ag => (
                              <option key={ag.id} value={ag.name} className="bg-slate-900 text-white">
                                {ag.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {isSynced ? (
                          <a
                            href={`https://crm.asquared.ae/crm/lead/details/${owner.bitrix_id}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <button
                            onClick={() => pushToBitrix(owner)}
                            disabled={isSyncing}
                            className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-semibold border border-blue-500/40 transition-colors flex items-center gap-1"
                          >
                            {isSyncing ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Share2 className="w-3 h-3" />
                                <span>Push</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grid View Pagination Footer */}
          <div className="p-3 border-t border-white/10 bg-black/20 flex items-center justify-between text-xs text-white/60">
            <span>Showing 1 to {owners.length} of 3.04M owners</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Owner 360 Detail View Slider Modal ────────────────────────────── */}
      {selectedOwner && (
        <Owner360Detail 
          owner={selectedOwner} 
          onClose={() => setSelectedOwner(null)}
          onAssignAgent={(agent) => handleAssignAgent(null, selectedOwner, agent)}
          onPushToBitrix={() => pushToBitrix(selectedOwner)}
        />
      )}
    </div>
  );
}
