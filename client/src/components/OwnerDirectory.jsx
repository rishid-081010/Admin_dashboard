import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, MoreHorizontal, User, Phone, Mail, 
  Building2, MapPin, Database, ExternalLink, Share2, 
  CheckCircle2, UserCheck, RefreshCw, ChevronDown, List, LayoutGrid,
  SlidersHorizontal, X, ArrowUpDown
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';

const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

export default function OwnerDirectory({ globalAgentId = '6', globalAgentName = 'Melanie Simsiman', agentsList = [] }) {
  // Search & Core Filters matching user screenshot
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('All areas');
  const [contactFilter, setContactFilter] = useState('All contacts');
  const [agentFilter, setAgentFilter] = useState('All agents');
  const [sortBy, setSortBy] = useState('Name A–Z');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Expandable "More filters" state
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('All types');
  const [bedroomsFilter, setBedroomsFilter] = useState('All');

  // Data & Pagination State
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Slider / Action State
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [pushedIds, setPushedIds] = useState(new Set());
  const [syncingId, setSyncingId] = useState(null);

  // Available Areas
  const areasList = [
    'All areas',
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

  // Default agent list if none passed
  const availableAgents = agentsList && agentsList.length > 0 ? agentsList : [
    { id: '6', name: 'Melanie Simsiman', role: 'Admin' },
    { id: '7', name: 'Akarsh Arora', role: 'Agent' },
    { id: '186', name: 'NIDAF KHAN', role: 'Agent' },
    { id: '201', name: 'Humesh Gurung', role: 'Agent' }
  ];

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const isSearching = searchTerm.trim().length > 1;

      // Base select
      let url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?select=lead_id,owner_id,full_name,building_name,master_area,unit_number,phone_normalized,phone_raw,email,nationality,emirates_id,passport_expiry,reported_property_type,verified_bedrooms,verified_purchase_price,verified_purchase_date,verified_size_sqft,vendor_source_file,bitrix_id,assigned_agent,assigned_agent_id&limit=${itemsPerPage}&offset=${offset}`;

      // 1. Search Logic (Indexed equality for phones and IDs; trigram/ilike for names)
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

      // 2. Area Filter
      if (areaFilter !== 'All areas') {
        const areaParam = areaFilter.replace(/\s*\(JLT\)|\s*\(JVC\)/g, '');
        url += `&master_area=ilike.*${encodeURIComponent(areaParam)}*`;
      }

      // 3. Contact Filter
      if (contactFilter === 'Has phone & email') {
        url += `&phone_normalized=not.is.null&email=not.is.null`;
      } else if (contactFilter === 'Has phone only') {
        url += `&phone_normalized=not.is.null&email=is.null`;
      } else if (contactFilter === 'In Bitrix24') {
        url += `&bitrix_id=not.is.null`;
      } else if (contactFilter === 'Not in CRM') {
        url += `&bitrix_id=is.null`;
      }

      // 4. Agent Filter
      if (agentFilter !== 'All agents') {
        if (agentFilter === 'Unassigned') {
          url += `&assigned_agent=is.null`;
        } else {
          url += `&assigned_agent=eq.${encodeURIComponent(agentFilter)}`;
        }
      }

      // 5. More Filters: Property Type
      if (propertyTypeFilter !== 'All types') {
        url += `&reported_property_type=ilike.*${encodeURIComponent(propertyTypeFilter)}*`;
      }

      // 6. More Filters: Bedrooms
      if (bedroomsFilter !== 'All') {
        url += `&verified_bedrooms=eq.${encodeURIComponent(bedroomsFilter)}`;
      }

      // 7. Sort Order (Avoid complex order during full-text search to maintain B-tree speed)
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
      console.error("Supabase unreachable", error);
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOwners();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [
    currentPage, searchTerm, areaFilter, contactFilter, 
    agentFilter, sortBy, propertyTypeFilter, bedroomsFilter
  ]);

  // Push lead to Bitrix CRM & write back bitrix_id and assigned_agent to Supabase
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

  // Re-assign agent directly from the table dropdown and sync to Supabase & Bitrix
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
        try {
          await axios.post('https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/crm.lead.update.json', {
            id: lead.bitrix_id,
            fields: { ASSIGNED_BY_ID: selectedAgent.id }
          });
        } catch (bErr) {
          console.warn("Bitrix agent update notice:", bErr);
        }
      }

      setOwners(prev => prev.map(o => o.id === lead.id ? {
        ...o,
        assigned_agent: selectedAgent.name,
        assigned_agent_id: String(selectedAgent.id)
      } : o));
    } catch (err) {
      console.error("Failed to assign agent:", err);
      alert("Failed to update assigned agent in database");
    }
  };

  if (selectedOwner) {
    return (
      <Owner360Detail
        owner={selectedOwner}
        onBack={() => setSelectedOwner(null)}
        onPushToBitrix={pushToBitrix}
        isPushed={pushedIds.has(selectedOwner.id) || !!selectedOwner.bitrix_id}
        globalAgentName={selectedOwner.assigned_agent || globalAgentName}
      />
    );
  }

  return (
    <div className="w-full flex flex-col h-full animate-fade-in relative text-white/80">
      {/* Header */}
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

      {/* ─── Filtration Bar (Exact match to User's Specification) ───────── */}
      <div className="bg-[#021024]/90 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-xl p-3 sm:p-3.5 mb-5 select-none">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Left Controls Group */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            
            {/* 1. Search input */}
            <div className="relative min-w-[210px] sm:min-w-[240px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search name, building or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/15 focus:border-blue-500/60 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-white/50 focus:outline-none transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. All areas dropdown */}
            <div className="relative">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-blue-500/60 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-white outline-none cursor-pointer transition-all appearance-none"
              >
                {areasList.map(area => (
                  <option key={area} value={area} className="bg-slate-900 text-white">
                    {area}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
            </div>

            {/* 3. All contacts dropdown */}
            <div className="relative">
              <select
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value)}
                className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-blue-500/60 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-white outline-none cursor-pointer transition-all appearance-none"
              >
                <option value="All contacts" className="bg-slate-900 text-white">All contacts</option>
                <option value="Has phone & email" className="bg-slate-900 text-white">Has phone &amp; email</option>
                <option value="Has phone only" className="bg-slate-900 text-white">Has phone only</option>
                <option value="In Bitrix24" className="bg-slate-900 text-white">In Bitrix24</option>
                <option value="Not in CRM" className="bg-slate-900 text-white">Not in CRM</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
            </div>

            {/* 4. All agents dropdown */}
            <div className="relative">
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-blue-500/60 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-white outline-none cursor-pointer transition-all appearance-none"
              >
                <option value="All agents" className="bg-slate-900 text-white">All agents</option>
                <option value="Unassigned" className="bg-slate-900 text-white">Unassigned</option>
                {availableAgents.map(ag => (
                  <option key={ag.id} value={ag.name} className="bg-slate-900 text-white">
                    {ag.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
            </div>

            {/* 5. More filters button */}
            <button
              onClick={() => setShowMoreFilters(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showMoreFilters || propertyTypeFilter !== 'All types' || bedroomsFilter !== 'All'
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm'
                  : 'bg-white/[0.05] hover:bg-white/[0.08] text-white/80 border-white/15'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-white/60" />
              <span>More filters</span>
              {(propertyTypeFilter !== 'All types' || bedroomsFilter !== 'All') && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              )}
            </button>
          </div>

          {/* Right Controls Group: Sort + View Mode Toggle */}
          <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
            {/* Sort Section */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/50">Sort</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 focus:border-blue-500/60 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-white outline-none cursor-pointer transition-all appearance-none"
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
                className={`p-1.5 rounded-lg transition-all ${
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
                className={`p-1.5 rounded-lg transition-all ${
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

        {/* Expandable More Filters Drawer */}
        {showMoreFilters && (
          <div className="mt-3.5 pt-3.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in text-xs">
            <div>
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block mb-1">Property Type</label>
              <select
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-1.5 text-white outline-none"
              >
                <option value="All types" className="bg-slate-900 text-white">All types</option>
                <option value="Apartment" className="bg-slate-900 text-white">Apartment</option>
                <option value="Villa" className="bg-slate-900 text-white">Villa</option>
                <option value="Townhouse" className="bg-slate-900 text-white">Townhouse</option>
                <option value="Penthouse" className="bg-slate-900 text-white">Penthouse</option>
                <option value="Commercial" className="bg-slate-900 text-white">Commercial</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block mb-1">Bedrooms</label>
              <select
                value={bedroomsFilter}
                onChange={(e) => setBedroomsFilter(e.target.value)}
                className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-1.5 text-white outline-none"
              >
                <option value="All" className="bg-slate-900 text-white">Any Bedrooms</option>
                <option value="1" className="bg-slate-900 text-white">1 Bedroom</option>
                <option value="2" className="bg-slate-900 text-white">2 Bedrooms</option>
                <option value="3" className="bg-slate-900 text-white">3 Bedrooms</option>
                <option value="4" className="bg-slate-900 text-white">4+ Bedrooms</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setPropertyTypeFilter('All types');
                  setBedroomsFilter('All');
                  setAreaFilter('All areas');
                  setContactFilter('All contacts');
                  setAgentFilter('All agents');
                  setSearchTerm('');
                  setSortBy('Name A–Z');
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium transition-all"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: List Table View or Grid View */}
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 font-bold border border-white/20 shrink-0">
                            {String(owner.name).charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white group-hover:text-[#3b82f6] transition-colors">{owner.name}</span>
                              {owner.property_type && (
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                  owner.property_type === 'BUYER' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                  owner.property_type === 'SELLER' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {owner.property_type}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                {owner.lead_id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Phone & Email */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 text-white/80 font-mono text-xs">
                            <Phone className="w-3.5 h-3.5 text-white/40"/> {owner.phone}
                          </span>
                          <span className="flex items-center gap-2 text-white/60 text-xs">
                            <Mail className="w-3.5 h-3.5 text-white/40"/> {owner.email}
                          </span>
                        </div>
                      </td>

                      {/* 3. Property & Unit */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-white/80 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-blue-400 shrink-0"/> {owner.building}
                          </span>
                          {owner.unit_number && (
                            <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-md font-mono font-bold border border-blue-500/30">
                              Unit {owner.unit_number}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-white/40 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5"/> {owner.area}
                        </div>
                      </td>

                      {/* 4. Assigned Agent (Interactive Select) */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <select
                            value={owner.assigned_agent_id || ''}
                            onChange={(e) => {
                              const found = availableAgents.find(a => String(a.id) === String(e.target.value));
                              if (found) {
                                handleAssignAgent(e, owner, found);
                              }
                            }}
                            className={`text-xs rounded-lg px-2.5 py-1.5 outline-none font-medium transition-colors border ${
                              owner.assigned_agent 
                                ? 'bg-purple-500/10 text-purple-200 border-purple-500/30' 
                                : 'bg-black/30 text-white/50 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <option value="" className="bg-slate-900 text-white/50">Unassigned</option>
                            {availableAgents.map(ag => (
                              <option key={ag.id} value={ag.id} className="bg-slate-900 text-white">
                                {ag.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 5. Bitrix ID / CRM Status */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        {isSynced ? (
                          <a
                            href={`https://crm.asquared.ae/crm/lead/details/${owner.bitrix_id}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-500/25 transition-all group"
                            title="View lead in Bitrix24 CRM"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Bitrix #{owner.bitrix_id}</span>
                            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                          </a>
                        ) : (
                          <button
                            onClick={() => pushToBitrix(owner)}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                          >
                            {isSyncing ? (
                              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5 text-blue-400" />
                            )}
                            <span>{isSyncing ? 'Syncing...' : 'Push to Bitrix'}</span>
                          </button>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="px-5 py-4 text-right">
                        <button 
                          className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors" 
                          onClick={(e) => { e.stopPropagation(); setSelectedOwner(owner); }}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between text-sm text-white/60">
            <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {((currentPage - 1) * itemsPerPage) + owners.length} of 3.04M owner records</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30">Previous</button>
              
              <button onClick={() => setCurrentPage(1)} className={`px-3 py-1 rounded-md font-medium ${currentPage === 1 ? 'bg-[#3b82f6] text-white' : 'bg-white/5 border border-white/10 hover:text-white transition-colors'}`}>1</button>
              
              {currentPage > 3 && <span className="px-2 py-1">...</span>}
              
              {currentPage > 2 && <button onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">{currentPage - 1}</button>}
              
              {currentPage !== 1 && <button className="px-3 py-1 bg-[#3b82f6] text-white rounded-md font-medium">{currentPage}</button>}
              
              <button onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">{currentPage + 1}</button>
              <button onClick={() => setCurrentPage(currentPage + 2)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">{currentPage + 2}</button>
              
              <span className="px-2 py-1">...</span>
              <button onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">Next</button>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Grid (Cards) View ────────────────────────────────────────── */
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
                              {String(owner.name).charAt(0)}
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
                              <span className="font-mono text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                Unit {owner.unit_number}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-white/30" />
                            {owner.area}
                          </div>
                        </div>

                        {/* Phone & Email */}
                        <div className="space-y-1 text-xs text-white/70 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-white/40" />
                            <span className="font-mono text-[11px]">{owner.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-white/40" />
                            <span className="text-[11px] truncate text-white/50">{owner.email || 'No email on file'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Controls: Assigned Agent + Bitrix Push */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <select
                            value={owner.assigned_agent_id || ''}
                            onChange={(e) => {
                              const found = availableAgents.find(a => String(a.id) === String(e.target.value));
                              if (found) handleAssignAgent(e, owner, found);
                            }}
                            className="bg-transparent text-white/70 text-xs outline-none cursor-pointer truncate max-w-[120px]"
                          >
                            <option value="" className="bg-slate-900 text-white/50">Unassigned</option>
                            {availableAgents.map(ag => (
                              <option key={ag.id} value={ag.id} className="bg-slate-900 text-white">
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
                            Open CRM <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <button
                            onClick={() => pushToBitrix(owner)}
                            disabled={isSyncing}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                            Push
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-t border-white/10 bg-black/20 flex items-center justify-between text-xs text-white/60">
            <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {((currentPage - 1) * itemsPerPage) + owners.length} of 3.04M owners</span>
            <div className="flex gap-1.5">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors disabled:opacity-30">Previous</button>
              <button onClick={() => setCurrentPage(p => p + 1)} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md hover:text-white transition-colors">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
