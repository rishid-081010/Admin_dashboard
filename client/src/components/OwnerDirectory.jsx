import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, ChevronDown, List, LayoutGrid,
  X, Building2, Phone, Mail, MapPin, ExternalLink, Share2, 
  MoreHorizontal, UserCheck, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';
import SearchableCombobox from './SearchableCombobox';
import ownerFiltersMetadata from '../data/ownerFiltersMetadata.json';

const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const BITRIX_STATUSES = [
  { id: 'Any', name: 'Any' },
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
  'Any',
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
  // ─── 1. Main Big Bar Search (Omni Search Style) ──────────────────────────
  const [searchTerm, setSearchTerm] = useState('');

  // ─── 2. Filters Subtab Open/Close State ───────────────────────────────────
  const [showFiltersBox, setShowFiltersBox] = useState(false);

  // ─── Location & Property Filters (All default to 'Any') ──────────────────
  const [areaFilter, setAreaFilter] = useState('Any');
  const [buildingFilter, setBuildingFilter] = useState('Any');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('Any');
  const [bedroomsFilter, setBedroomsFilter] = useState('Any');
  const [sourceFileFilter, setSourceFileFilter] = useState('Any');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ─── People & Assignment Filters (All default to 'Any') ──────────────────
  const [crmPresentFilter, setCrmPresentFilter] = useState('Any'); // 'Any' | 'Yes' | 'No'
  const [agentFilter, setAgentFilter] = useState('Any');           // 'Any' | 'Unassigned' | agent name
  const [bitrixStatusFilter, setBitrixStatusFilter] = useState('Any');
  const [phoneFilter, setPhoneFilter] = useState('Any');           // 'Any' | 'Yes' | 'No'
  const [emailFilter, setEmailFilter] = useState('Any');           // 'Any' | 'Yes' | 'No'

  // ─── Sort & View Mode ────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState('Name A–Z');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // ─── Data & Pagination State ─────────────────────────────────────────────
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // ─── Modal / Action State ────────────────────────────────────────────────
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [pushedIds, setPushedIds] = useState(new Set());
  const [syncingId, setSyncingId] = useState(null);

  // Available Areas
  const areasList = [
    'Downtown Dubai',
    'Dubai Marina',
    'Palm Jumeirah',
    'Business Bay',
    'Jumeirah Lakes Towers (JLT)',
    'Dubai Hills Estate',
    'Jumeirah Village Circle (JVC)',
    'Al Barsha',
    'Arabian Ranches',
    'Creek Harbour',
    'Meydan',
    'DIFC'
  ];

  // Available Agents
  const availableAgents = useMemo(() => {
    return agentsList && agentsList.length > 0 ? agentsList : [
      { id: '6', name: 'Melanie Simsiman', role: 'Admin' },
      { id: '7', name: 'Akarsh Arora', role: 'Agent' },
      { id: '186', name: 'NIDAF KHAN', role: 'Agent' },
      { id: '201', name: 'Humesh Gurung', role: 'Agent' }
    ];
  }, [agentsList]);

  // Preloaded buildings and sources list
  const allBuildings = useMemo(() => ownerFiltersMetadata?.buildings || [], []);
  const allSources = useMemo(() => ownerFiltersMetadata?.sources || [], []);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (areaFilter !== 'Any') count++;
    if (buildingFilter !== 'Any') count++;
    if (propertyTypeFilter !== 'Any') count++;
    if (bedroomsFilter !== 'Any') count++;
    if (sourceFileFilter !== 'Any') count++;
    if (dateFrom || dateTo) count++;
    if (crmPresentFilter !== 'Any') count++;
    if (agentFilter !== 'Any') count++;
    if (bitrixStatusFilter !== 'Any') count++;
    if (phoneFilter !== 'Any') count++;
    if (emailFilter !== 'Any') count++;
    return count;
  }, [
    areaFilter, buildingFilter, propertyTypeFilter, bedroomsFilter, 
    sourceFileFilter, dateFrom, dateTo, crmPresentFilter, 
    agentFilter, bitrixStatusFilter, phoneFilter, emailFilter
  ]);

  const clearFilters = () => {
    setAreaFilter('Any');
    setBuildingFilter('Any');
    setPropertyTypeFilter('Any');
    setBedroomsFilter('Any');
    setSourceFileFilter('Any');
    setDateFrom('');
    setDateTo('');
    setCrmPresentFilter('Any');
    setAgentFilter('Any');
    setBitrixStatusFilter('Any');
    setPhoneFilter('Any');
    setEmailFilter('Any');
    setCurrentPage(1);
  };

  // ─── Query Execution ─────────────────────────────────────────────────────
  const fetchOwners = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const isSearching = searchTerm.trim().length > 1;

      let url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?select=lead_id,owner_id,full_name,building_name,master_area,unit_number,phone_normalized,phone_raw,email,nationality,emirates_id,passport_expiry,reported_property_type,verified_bedrooms,verified_purchase_price,verified_purchase_date,verified_size_sqft,vendor_source_file,bitrix_id,assigned_agent,assigned_agent_id,bitrix_status&limit=${itemsPerPage}&offset=${offset}`;

      // 1. Search Query
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

      // 2. Area
      if (areaFilter !== 'Any') {
        const areaParam = areaFilter.replace(/\s*\(JLT\)|\s*\(JVC\)/g, '');
        url += `&master_area=ilike.*${encodeURIComponent(areaParam)}*`;
      }

      // 3. Building
      if (buildingFilter !== 'Any') {
        url += `&building_name=ilike.*${encodeURIComponent(buildingFilter)}*`;
      }

      // 4. Type
      if (propertyTypeFilter !== 'Any') {
        if (propertyTypeFilter === 'Residential' || propertyTypeFilter === 'Commercial') {
          url += `&property_category=eq.${encodeURIComponent(propertyTypeFilter)}`;
        } else {
          url += `&reported_property_type=ilike.*${encodeURIComponent(propertyTypeFilter)}*`;
        }
      }

      // 5. Bedrooms
      if (bedroomsFilter !== 'Any') {
        url += `&verified_bedrooms=eq.${encodeURIComponent(bedroomsFilter)}`;
      }

      // 6. Data Source
      if (sourceFileFilter !== 'Any') {
        url += `&vendor_source_file=eq.${encodeURIComponent(sourceFileFilter)}`;
      }

      // 7. Date from / Date to
      if (dateFrom) url += `&verified_purchase_date=gte.${dateFrom}`;
      if (dateTo) url += `&verified_purchase_date=lte.${dateTo}`;

      // 8. Present in CRM
      if (crmPresentFilter === 'Yes') {
        url += '&bitrix_id=not.is.null';
      } else if (crmPresentFilter === 'No') {
        url += '&bitrix_id=is.null';
      }

      // 9. Agent
      if (agentFilter !== 'Any') {
        if (agentFilter === 'Unassigned') {
          url += '&assigned_agent=is.null';
        } else {
          url += `&assigned_agent=eq.${encodeURIComponent(agentFilter)}`;
        }
      }

      // 10. Bitrix Status
      if (bitrixStatusFilter !== 'Any') {
        url += `&or=(bitrix_status.eq.${encodeURIComponent(bitrixStatusFilter)},bitrix_status_id.eq.${encodeURIComponent(bitrixStatusFilter)})`;
      }

      // 11. Phone
      if (phoneFilter === 'Yes') {
        url += '&phone_normalized=not.is.null';
      } else if (phoneFilter === 'No') {
        url += '&phone_normalized=is.null';
      }

      // 12. Email
      if (emailFilter === 'Yes') {
        url += '&email=not.is.null';
      } else if (emailFilter === 'No') {
        url += '&email=is.null';
      }

      // 13. Sort Order
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
        const mapped = response.data.map(row => {
          let cleanName = (row.full_name ? String(row.full_name).trim() : '');
          if (!cleanName || cleanName === '_' || cleanName === '-' || cleanName === '--' || cleanName.toLowerCase() === 'null') {
            if (row.building_name && row.unit_number) {
              cleanName = `Owner (${row.building_name} Unit ${row.unit_number})`;
            } else if (row.building_name) {
              cleanName = `Property Owner (${row.building_name})`;
            } else {
              cleanName = 'Verified Property Owner';
            }
          }

          return {
            id: row.owner_id ? String(row.owner_id) : 'UnknownID',
            lead_id: row.lead_id ? String(row.lead_id) : (row.owner_id ? String(row.owner_id) : 'LEAD-0000000'),
            name: cleanName,
          building: row.building_name ? String(row.building_name) : 'N/A',
          area: row.master_area ? String(row.master_area) : 'Dubai',
          phone: row.phone_normalized ? String(row.phone_normalized) : (row.phone_raw ? String(row.phone_raw) : 'N/A'),
          email: row.email ? String(row.email) : 'N/A',
          units: row.verified_bedrooms ? parseInt(row.verified_bedrooms) : 1,
          unit_number: row.unit_number ? String(row.unit_number) : null,
          property_type: row.reported_property_type || null,
          property_category: row.property_category || (row.reported_property_type && /commercial|office|shop|warehouse|industrial|hotel|showroom|store|workshop|factory/i.test(row.reported_property_type) ? 'Commercial' : 'Residential'),
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
        }; });
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
    currentPage, searchTerm, areaFilter, buildingFilter, propertyTypeFilter,
    bedroomsFilter, sourceFileFilter, dateFrom, dateTo, crmPresentFilter,
    agentFilter, bitrixStatusFilter, phoneFilter, emailFilter, sortBy
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

  // If an owner is selected, open the Owner 360 Profile as a dedicated full page
  if (selectedOwner) {
    return (
      <Owner360Detail 
        owner={selectedOwner} 
        onBack={() => setSelectedOwner(null)}
        onPushToBitrix={() => pushToBitrix(selectedOwner)}
        isPushed={!!selectedOwner.bitrix_id || pushedIds.has(selectedOwner.id)}
        globalAgentName={globalAgentName}
      />
    );
  }

  return (
    <div className="w-full flex flex-col h-full animate-fade-in relative text-white/80 overflow-y-auto custom-scrollbar pr-1">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1.5">
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
            
            {/* 2. Filters Button */}
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
            
            {areaFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                Area: {areaFilter}
                <button onClick={() => setAreaFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {buildingFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-medium">
                Building: {buildingFilter}
                <button onClick={() => setBuildingFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {propertyTypeFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 font-medium">
                Type: {propertyTypeFilter}
                <button onClick={() => setPropertyTypeFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {bedroomsFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-medium">
                Bedrooms: {bedroomsFilter === '0' ? 'Studio' : bedroomsFilter}
                <button onClick={() => setBedroomsFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {sourceFileFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-medium">
                Source: {sourceFileFilter}
                <button onClick={() => setSourceFileFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 font-medium">
                Date: {dateFrom || 'Start'} → {dateTo || 'End'}
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {crmPresentFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                CRM: {crmPresentFilter}
                <button onClick={() => setCrmPresentFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {agentFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                Agent: {agentFilter}
                <button onClick={() => setAgentFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {bitrixStatusFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 font-medium">
                Status: {BITRIX_STATUSES.find(s => s.id === bitrixStatusFilter)?.name || bitrixStatusFilter}
                <button onClick={() => setBitrixStatusFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {phoneFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-medium">
                Phone: {phoneFilter}
                <button onClick={() => setPhoneFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {emailFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-medium">
                Email: {emailFilter}
                <button onClick={() => setEmailFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-white/40 hover:text-red-300 underline font-semibold ml-1 cursor-pointer transition-colors"
            >
              Reset all
            </button>
          </div>
        )}

        {/* ─── Simple & Minimalist Filters Subtab (Matches User's Mockup) ───── */}
        {showFiltersBox && (
          <div className="mt-4 border-t border-white/10 bg-[#040e21]/95 backdrop-blur-xl rounded-2xl shadow-2xl animate-fade-in flex flex-col max-h-[75vh] overflow-hidden">
            
            {/* Scrollable Form Body */}
            <div className="overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5 flex-1">
              {/* Section 1: Location & property */}
              <div>
                <h3 className="text-base font-bold text-white tracking-tight mb-3">
                  Location &amp; property
                </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                
                {/* Area */}
                <SearchableCombobox
                  label="Area"
                  value={areaFilter}
                  onChange={(val) => { setAreaFilter(val); setCurrentPage(1); }}
                  options={areasList}
                  placeholder="Search area (e.g. Downtown, Marina)..."
                  allLabel="Any"
                />

                {/* Building */}
                <SearchableCombobox
                  label="Building"
                  value={buildingFilter}
                  onChange={(val) => { setBuildingFilter(val); setCurrentPage(1); }}
                  options={allBuildings}
                  placeholder="Search building (e.g. Burj Khalifa, Marina Gate)..."
                  allLabel="Any"
                />

                {/* Type */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Type
                  </label>
                  <div className="relative">
                    <select
                      value={propertyTypeFilter}
                      onChange={(e) => { setPropertyTypeFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      {PROPERTY_SUBTYPES.map(t => (
                        <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Bedrooms · 0 = studio */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Bedrooms · 0 = studio
                  </label>
                  <div className="relative">
                    <select
                      value={bedroomsFilter}
                      onChange={(e) => { setBedroomsFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any</option>
                      <option value="0" className="bg-slate-900 text-white">0 (Studio)</option>
                      <option value="1" className="bg-slate-900 text-white">1 Bedroom</option>
                      <option value="2" className="bg-slate-900 text-white">2 Bedrooms</option>
                      <option value="3" className="bg-slate-900 text-white">3 Bedrooms</option>
                      <option value="4" className="bg-slate-900 text-white">4 Bedrooms</option>
                      <option value="5" className="bg-slate-900 text-white">5+ Bedrooms</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Data from */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Data from
                  </label>
                  <div className="relative">
                    <select
                      value={sourceFileFilter}
                      onChange={(e) => { setSourceFileFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none truncate"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any</option>
                      {allSources.map(s => (
                        <option key={s} value={s} className="bg-slate-900 text-white truncate">{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Date from &lt;————&gt; Date to
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] border border-white/15 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] border border-white/15 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Section 2: People & assignment */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-base font-bold text-white tracking-tight mb-3">
                People &amp; assignment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                
                {/* Present in CRM */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Present in CRM
                  </label>
                  <div className="relative">
                    <select
                      value={crmPresentFilter}
                      onChange={(e) => { setCrmPresentFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any</option>
                      <option value="Yes" className="bg-slate-900 text-white">Yes</option>
                      <option value="No" className="bg-slate-900 text-white">No</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Agent */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Agent
                  </label>
                  <div className="relative">
                    <select
                      value={agentFilter}
                      onChange={(e) => { setAgentFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any</option>
                      <option value="Unassigned" className="bg-slate-900 text-white">Unassigned</option>
                      {availableAgents.map(ag => (
                        <option key={ag.id} value={ag.name} className="bg-slate-900 text-white">{ag.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={bitrixStatusFilter}
                      onChange={(e) => { setBitrixStatusFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      {BITRIX_STATUSES.map(st => (
                        <option key={st.id} value={st.id} className="bg-slate-900 text-white">{st.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Phone
                  </label>
                  <div className="relative">
                    <select
                      value={phoneFilter}
                      onChange={(e) => { setPhoneFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any</option>
                      <option value="Yes" className="bg-slate-900 text-white">Yes</option>
                      <option value="No" className="bg-slate-900 text-white">No</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <select
                      value={emailFilter}
                      onChange={(e) => { setEmailFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any</option>
                      <option value="Yes" className="bg-slate-900 text-white">Yes</option>
                      <option value="No" className="bg-slate-900 text-white">No</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Sticky Footer Buttons (Exact match to Image 1) */}
          <div className="p-4 sm:px-7 border-t border-white/10 bg-[#030d1d] flex items-center justify-between z-10 shrink-0 shadow-2xl">
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              Clear filters
            </button>

            <button
              onClick={() => setShowFiltersBox(false)}
              className="px-6 py-2.5 rounded-xl bg-[#0b2447] hover:bg-[#0e3061] text-white border border-blue-500/40 text-xs font-bold transition-all shadow-lg shadow-black/40 cursor-pointer"
            >
              Show results
            </button>
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
                  <th className="px-5 py-4 font-semibold text-right bg-[#051833]">Residential / Commercial</th>
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
                      <td className="px-5 py-4">
                        {owner.assigned_agent ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-[10px] shrink-0">
                              {owner.assigned_agent.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold text-white/90 truncate max-w-[150px]">
                              {owner.assigned_agent}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-white/40">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* 5. Bitrix ID / Status */}
                      <td className="px-5 py-4">
                        {owner.bitrix_status ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold w-fit">
                              {BITRIX_STATUSES.find(s => s.id === owner.bitrix_status)?.name || owner.bitrix_status}
                            </span>
                            {owner.bitrix_id && (
                              <a
                                href={`https://crm.asquared.ae/crm/lead/details/${owner.bitrix_id}/`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-white/40 hover:text-white/70 font-mono inline-flex items-center gap-1 mt-0.5"
                              >
                                <span>Lead #{owner.bitrix_id}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        ) : owner.bitrix_id ? (
                          <a
                            href={`https://crm.asquared.ae/crm/lead/details/${owner.bitrix_id}/`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-all w-fit"
                          >
                            <span>Lead #{owner.bitrix_id}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-white/30 text-sm font-semibold">—</span>
                        )}
                      </td>

                      {/* 6. Residential / Commercial */}
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          owner.property_category === 'Commercial'
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                        }`}>
                          {owner.property_category || 'Residential'}
                        </span>
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

                      {/* Bottom Row: Agent Assignment & Status */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span className={owner.assigned_agent ? "text-blue-300 font-semibold" : "text-white/40 font-medium"}>
                            {owner.assigned_agent || 'Unassigned'}
                          </span>
                        </div>

                        <div>
                          {owner.bitrix_status ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                              {BITRIX_STATUSES.find(s => s.id === owner.bitrix_status)?.name || owner.bitrix_status}
                            </span>
                          ) : owner.bitrix_id ? (
                            <a
                              href={`https://crm.asquared.ae/crm/lead/details/${owner.bitrix_id}/`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                            >
                              <span>Lead #{owner.bitrix_id}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-white/30 text-sm font-semibold">—</span>
                          )}
                        </div>
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

    </div>
  );
}
