import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, SlidersHorizontal, ChevronDown, List, LayoutGrid,
  X, Building2, Phone, Mail, MapPin, ExternalLink, Share2, 
  MoreHorizontal, UserCheck, RefreshCw, ChevronLeft, ChevronRight,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import Owner360Detail from './Owner360Detail';
import SearchableCombobox from './SearchableCombobox';
import ownerFiltersMetadata from '../data/ownerFiltersMetadata.json';
import { parseIdQuery } from '../utils/idParser';

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

// Clean valuation formatter with support for Billions (B) and Millions (M)
function formatValuationShort(val) {
  if (!val || val <= 0) return null;
  const num = parseFloat(val);
  if (num >= 1000000000) {
    return `AED ${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `AED ${(num / 1000000).toFixed(1)}M`;
  }
  return `AED ${Math.round(num).toLocaleString()}`;
}

// Robust name formatting helper to normalize spacing, strip stray symbols, and format title case cleanly
function formatOwnerName(rawName, buildingName, unitNumber) {
  if (!rawName) {
    if (buildingName && unitNumber) {
      const uClean = String(unitNumber).replace(/^unit\s*[:#-]?\s*/i, '').replace(/[\s\-_/]+$/, '').trim();
      return `Owner (${buildingName} Unit ${uClean})`;
    } else if (buildingName && buildingName !== 'Dubai' && buildingName !== '1') {
      return `Property Owner (${buildingName})`;
    }
    return 'Verified Property Owner';
  }

  let s = String(rawName).trim();
  const lowerRaw = s.toLowerCase();

  // 1. Check dummy values first
  if (!s || 
      /^[\s,.;:\-_~?!@#$%^&*()[\]{}"'/]+$/.test(s) ||
      /\?{2,}/.test(s) ||
      ['null', 'n/a', 'na', 'none', 'unknown', 'nil', 'undefined', 'nan', '-ls', '1 nos', 'nos', '-', '--'].includes(lowerRaw)) {
    if (buildingName && unitNumber) {
      const uClean = String(unitNumber).replace(/^unit\s*[:#-]?\s*/i, '').replace(/[\s\-_/]+$/, '').trim();
      return `Owner (${buildingName} Unit ${uClean})`;
    } else if (buildingName && buildingName !== 'Dubai' && buildingName !== '1') {
      return `Property Owner (${buildingName})`;
    }
    return 'Verified Property Owner';
  }

  // 2. Replace semicolons, underscores, pipes, and slashes with clean single spaces
  s = s.replace(/[;_|\\/]+/g, ' ');

  // 3. Replace commas with single space
  s = s.replace(/,\s*/g, ' ');

  // 4. Clean up multiple dots or dashes like "..", "--"
  s = s.replace(/\.{2,}/g, '.').replace(/-{2,}/g, '-');

  // 5. Strip leading/trailing punctuation & symbols
  s = s.replace(/^[\s,.;:\-_~?!@#$%^&*+/|]+/, '').replace(/[\s,.;:\-_~?!@#$%^&*+/|]+$/, '').trim();

  // 6. Normalize multiple spaces into a single space
  s = s.replace(/\s+/g, ' ').trim();

  // Re-check if empty after stripping
  if (!s || s.length < 2) {
    if (buildingName && unitNumber) {
      const uClean = String(unitNumber).replace(/^unit\s*[:#-]?\s*/i, '').replace(/[\s\-_/]+$/, '').trim();
      return `Owner (${buildingName} Unit ${uClean})`;
    } else if (buildingName && buildingName !== 'Dubai' && buildingName !== '1') {
      return `Property Owner (${buildingName})`;
    }
    return 'Verified Property Owner';
  }

  // 7. Title casing: if ALL CAPS or all lower
  const isAllCaps = s === s.toUpperCase() && /[A-Z]/.test(s);
  const isAllLower = s === s.toLowerCase() && /[a-z]/.test(s);

  // Short legal acronyms to keep uppercase
  const preserveAcronyms = new Set([
    'LLC', 'L.L.C', 'L.L.C.', 'DMCC', 'PJSC', 'P.J.S.C', 'FZE', 'F.Z.E', 'FZCO', 
    'FZ-LLC', 'LTD', 'L.T.D', 'INC', 'CORP', 'PLC', 'UAE', 'USA', 'UK', 'DWC', 
    'REIT', 'LGT', 'DIFC', 'JLT', 'JVC'
  ]);

  s = s.split(' ').map(word => {
    const cleanWord = word.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (preserveAcronyms.has(cleanWord) || preserveAcronyms.has(word.toUpperCase())) {
      return word.toUpperCase();
    }
    if (word.includes('-')) {
      return word.split('-').map(part => {
        const cleanPart = part.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (preserveAcronyms.has(cleanPart)) return cleanPart;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }).join('-');
    }

    if (isAllCaps || isAllLower) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word;
  }).join(' ');

  return s;
}

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
  const [classificationFilter, setClassificationFilter] = useState('Any'); // 'Any' | 'OWNER' | 'BUYER' | 'TENANT' | 'UNKNOWN'
  const [portfolioSizeFilter, setPortfolioSizeFilter] = useState('Any');   // 'Any' | 'Single Unit' | 'Multi-Unit (2+)' | 'Large Portfolio (5+)'

  // ─── Sort & View Mode ────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState('Most Properties');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // ─── Data & Pagination State ─────────────────────────────────────────────
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [customPageInput, setCustomPageInput] = useState('');
  const customPageInputRef = useRef(null);
  const [totalCount, setTotalCount] = useState(2220643);
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const isSearching = searchTerm.trim().length > 1;

  const handleCustomPageSubmit = () => {
    const pageNum = parseInt(customPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setCustomPageInput('');
    }
  };

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
    if (classificationFilter !== 'Any') count++;
    if (portfolioSizeFilter !== 'Any') count++;
    return count;
  }, [
    areaFilter, buildingFilter, propertyTypeFilter, bedroomsFilter, 
    sourceFileFilter, dateFrom, dateTo, crmPresentFilter, 
    agentFilter, bitrixStatusFilter, phoneFilter, classificationFilter, portfolioSizeFilter
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
    setClassificationFilter('Any');
    setPortfolioSizeFilter('Any');
    setCurrentPage(1);
  };

  // ─── Query Execution ─────────────────────────────────────────────────────
  const fetchOwners = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const isSearching = searchTerm.trim().length > 1;

      let url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/canonical_owners?select=canonical_owner_id,full_name,primary_building,primary_area,phone_normalized,phone_raw,nationality,emirates_id,total_units,total_portfolio_valuation,ownership_type,match_criteria,match_confidence,bitrix_id,assigned_agent,assigned_agent_id,bitrix_status,sample_owner_id&limit=${itemsPerPage}&offset=${offset}`;

      // 1. Search Query
      if (isSearching) {
        const queryTerm = searchTerm.trim();
        const parsed = parseIdQuery(queryTerm);

        if (parsed) {
          if (parsed.intent === 'phone') {
            const pExact = queryTerm.startsWith('+') ? queryTerm : `+${parsed.digits}`;
            url += `&phone_normalized=eq.${encodeURIComponent(pExact)}`;
          } else if (parsed.intent === 'bitrix') {
            url += `&bitrix_id=eq.${encodeURIComponent(queryTerm)}`;
          } else {
            const orClauses = [
              `canonical_owner_id.ilike.*${encodeURIComponent(queryTerm)}*`,
              `sample_owner_id.ilike.*${encodeURIComponent(queryTerm)}*`
            ];
            if (parsed.digits && parsed.digits.length >= 7) {
              const pExact = queryTerm.startsWith('+') ? queryTerm : `+${parsed.digits}`;
              orClauses.push(`phone_normalized.eq.${encodeURIComponent(pExact)}`);
            }
            url += `&or=(${orClauses.join(',')})`;
          }
        } else {
          const enc = encodeURIComponent(queryTerm);
          url += `&or=(full_name.ilike.*${enc}*,primary_building.ilike.*${enc}*,assigned_agent.ilike.*${enc}*,canonical_owner_id.ilike.*${enc}*)`;
        }
      }

      // 2. Area
      if (areaFilter !== 'Any') {
        const areaParam = areaFilter.replace(/\s*\(JLT\)|\s*\(JVC\)/g, '');
        url += `&primary_area=ilike.*${encodeURIComponent(areaParam)}*`;
      }

      // 3. Building
      if (buildingFilter !== 'Any') {
        url += `&primary_building=ilike.*${encodeURIComponent(buildingFilter)}*`;
      }

      // 4. Ownership Classification
      if (classificationFilter !== 'Any') {
        url += `&ownership_type=eq.${encodeURIComponent(classificationFilter)}`;
      }

      // 5. Portfolio Size
      if (portfolioSizeFilter === 'Single Unit') {
        url += '&total_units=eq.1';
      } else if (portfolioSizeFilter === 'Multi-Unit (2+)') {
        url += '&total_units=gte.2';
      } else if (portfolioSizeFilter === 'Large Portfolio (5+)') {
        url += '&total_units=gte.5';
      }

      // 6. Present in CRM
      if (crmPresentFilter === 'Yes') {
        url += '&bitrix_id=not.is.null';
      } else if (crmPresentFilter === 'No') {
        url += '&bitrix_id=is.null';
      }

      // 7. Agent
      if (agentFilter !== 'Any') {
        if (agentFilter === 'Unassigned') {
          url += '&assigned_agent=is.null';
        } else {
          url += `&assigned_agent=eq.${encodeURIComponent(agentFilter)}`;
        }
      }

      // 8. Bitrix Status
      if (bitrixStatusFilter !== 'Any') {
        url += `&bitrix_status=eq.${encodeURIComponent(bitrixStatusFilter)}`;
      }

      // 9. Phone
      if (phoneFilter === 'Yes') {
        url += '&phone_normalized=not.is.null';
      } else if (phoneFilter === 'No') {
        url += '&phone_normalized=is.null';
      }

      // 10. Sort Order (Always active)
      if (sortBy === 'Name A–Z') {
        url += `&order=full_name.asc`;
      } else if (sortBy === 'Name Z–A') {
        url += `&order=full_name.desc`;
      } else if (sortBy === 'Price: High to Low') {
        url += `&order=total_portfolio_valuation.desc.nullslast`;
      } else if (sortBy === 'Price: Low to High') {
        url += `&order=total_portfolio_valuation.asc.nullslast`;
      } else if (sortBy === 'Most Properties') {
        url += `&order=total_units.desc.nullslast`;
      } else if (sortBy === 'Lead ID (Newest)') {
        url += `&order=canonical_owner_id.desc`;
      } else if (sortBy === 'Lead ID (Oldest)') {
        url += `&order=canonical_owner_id.asc`;
      } else {
        url += `&order=total_units.desc.nullslast`;
      }
      
      const response = await axios.get(url, { 
        headers: { 
          apikey: SUPABASE_API_KEY, 
          Authorization: `Bearer ${SUPABASE_API_KEY}`,
          Prefer: 'count=planned'
        } 
      });

      // Parse live exact count from Content-Range header (e.g. "0-49/2220643")
      const contentRange = response.headers['content-range'] || response.headers['Content-Range'];
      if (contentRange) {
        const parts = String(contentRange).split('/');
        if (parts.length > 1) {
          const parsedCount = parseInt(parts[1], 10);
          if (!isNaN(parsedCount)) {
            setTotalCount(parsedCount);
          }
        }
      }
      
      if (Array.isArray(response.data)) {
        const mapped = response.data.map(row => {
          let cleanBuilding = row.primary_building ? String(row.primary_building).trim() : 'Dubai';
          if (cleanBuilding === '1' || cleanBuilding.toLowerCase() === 'null') {
            cleanBuilding = row.primary_area || 'Dubai';
          }
          if (/^[A-Z]{2,}\d+[A-Z0-9_-]+$/i.test(cleanBuilding)) {
            cleanBuilding = `Plot Demarcation: ${cleanBuilding}`;
          } else if (/^\d{1,4}$/.test(cleanBuilding)) {
            cleanBuilding = `${row.primary_area ? `${row.primary_area} · ` : ''}Villa / Plot ${cleanBuilding}`;
          } else if (['dubai', 'uae'].includes(cleanBuilding.toLowerCase()) && row.primary_area && row.primary_area.toLowerCase() !== 'dubai') {
            cleanBuilding = row.primary_area;
          }

          let cleanName = formatOwnerName(row.full_name, cleanBuilding, null);

          let cleanPhoneDisplay = 'N/A';
          if (row.phone_normalized) {
            let p = String(row.phone_normalized).trim();
            if (p.startsWith('+00')) p = '+' + p.slice(3);
            cleanPhoneDisplay = p;
          } else if (row.phone_raw) {
            cleanPhoneDisplay = String(row.phone_raw).trim();
          }

          return {
            id: row.canonical_owner_id,
            canonical_owner_id: row.canonical_owner_id,
            sample_owner_id: row.sample_owner_id,
            owner_id: row.sample_owner_id || row.canonical_owner_id,
            lead_id: row.canonical_owner_id,
            name: cleanName,
            raw_full_name: row.full_name,
            building: cleanBuilding,
            area: row.primary_area ? String(row.primary_area).trim() : 'Dubai',
            phone: cleanPhoneDisplay,
            phone_normalized: cleanPhoneDisplay !== 'N/A' ? cleanPhoneDisplay : null,
            email: 'N/A',
            units: row.total_units || 1,
            total_units: row.total_units || 1,
            unit_number: null,
            property_type: row.total_units > 1 ? `${row.total_units} Properties Portfolio` : 'Individual Asset',
            property_category: 'Residential',
            nationality: row.nationality || null,
            emirates_id: row.emirates_id || null,
            passport_expiry: null,
            verified_purchase_price: row.total_portfolio_valuation || null,
            total_portfolio_valuation: row.total_portfolio_valuation || 0,
            ownership_type: row.ownership_type || 'OWNER',
            match_criteria: row.match_criteria || 'SINGLE_DEED',
            match_confidence: row.match_confidence || 'STANDARD',
            source: 'Verified',
            bitrix_id: row.bitrix_id ? String(row.bitrix_id) : null,
            bitrix_status: row.bitrix_status || null,
            assigned_agent: row.assigned_agent || null,
            assigned_agent_id: row.assigned_agent_id || null,
            portfolioValue: formatValuationShort(row.total_portfolio_valuation) || (row.total_units > 1 ? `${row.total_units} Units Portfolio` : 'Standard'),
            lastContact: row.bitrix_id ? 'In Bitrix' : 'Never'
          };
        });
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
    agentFilter, bitrixStatusFilter, phoneFilter, classificationFilter, portfolioSizeFilter, sortBy
  ]);

  // ─── Bitrix24 Integration Actions ────────────────────────────────────────
  const pushToBitrix = async (lead, agentIdOverride, agentNameOverride) => {
    setSyncingId(lead.id);
    try {
      const targetAgentId = agentIdOverride || lead.assigned_agent_id || globalAgentId || '6';
      const targetAgent = availableAgents.find(a => String(a.id) === String(targetAgentId));
      const targetAgentName = agentNameOverride || lead.assigned_agent || (targetAgent ? targetAgent.name : globalAgentName);

      let newBitrixId = null;
      try {
        const bRes = await axios.post('/api/push-to-bitrix.php', {
          owner: lead,
          agentId: targetAgentId,
          agentName: targetAgentName
        });
        newBitrixId = bRes.data?.bitrix_id;
      } catch (e1) {
        // Fallback to Express backend or Bitrix webhook
        try {
          const bRes = await axios.post('/api/push-to-bitrix', {
            owner: lead,
            lead: lead,
            agentId: targetAgentId,
            agentName: targetAgentName
          });
          newBitrixId = bRes.data?.bitrix_id;
        } catch (e2) {
          const w_url = 'https://crm.asquared.ae/rest/6/se51vx22azw2dq1s/crm.lead.add.json';
          const bRes = await axios.post(w_url, {
            fields: { 
              TITLE: `[${lead.lead_id}] ${lead.name} - ${lead.building} (${lead.units || 1} Units)`, 
              NAME: lead.name, 
              PHONE: lead.phone && lead.phone !== 'N/A' ? [{ VALUE: lead.phone, VALUE_TYPE: "WORK" }] : [], 
              ASSIGNED_BY_ID: targetAgentId,
              COMMENTS: `Owner ID: ${lead.lead_id}\nBuilding: ${lead.building}\nTotal Units: ${lead.units || 1}\nPortfolio Value: ${lead.portfolioValue || 'Standard'}\nAssigned Agent: ${targetAgentName}\nPushed via A-Squared Data Portal` 
            }
          });
          newBitrixId = bRes.data?.result;
        }
      }
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
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Owners Data
          </h1>
        </div>
      </div>

      {/* ─── Main Search & Filtration Toolbar ──────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 p-3 sm:p-4 mb-4 select-none">
        
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
              className="w-full bg-[#06111e] hover:bg-[#091728] focus:bg-[#091728] border border-[#1a2c42] focus:border-blue-500/80 rounded-2xl pl-12 pr-10 py-3 text-xs sm:text-sm font-medium text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner focus:ring-2 focus:ring-blue-500/20"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
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
                  : 'bg-[#06111e] hover:bg-[#091728] text-white/90 border-[#1a2c42]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              <span className="font-bold tracking-wide">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showFiltersBox ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Sort</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#06111e] hover:bg-[#091728] border border-[#1a2c42] focus:border-blue-500/60 rounded-xl pl-3 pr-8 py-2.5 text-xs font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                >
                  <option value="Most Properties" className="bg-[#0c1829] text-white">Most Properties (Portfolio)</option>
                  <option value="Name A–Z" className="bg-[#0c1829] text-white">Name A–Z</option>
                  <option value="Name Z–A" className="bg-[#0c1829] text-white">Name Z–A</option>
                  <option value="Price: High to Low" className="bg-[#0c1829] text-white">Price: High to Low</option>
                  <option value="Price: Low to High" className="bg-[#0c1829] text-white">Price: Low to High</option>
                  <option value="Lead ID (Newest)" className="bg-[#0c1829] text-white">Lead ID (Newest)</option>
                  <option value="Lead ID (Oldest)" className="bg-[#0c1829] text-white">Lead ID (Oldest)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
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

            {classificationFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 font-medium">
                Type: {classificationFilter}
                <button onClick={() => setClassificationFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}

            {portfolioSizeFilter !== 'Any' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-medium">
                Portfolio: {portfolioSizeFilter}
                <button onClick={() => setPortfolioSizeFilter('Any')} className="hover:text-white"><X className="w-3 h-3" /></button>
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
          <div className="mt-4 border border-[#233549] bg-[#06111e] rounded-2xl shadow-2xl animate-fade-in flex flex-col max-h-[75vh] overflow-hidden">
            
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

                {/* Ownership Classification */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Ownership Classification
                  </label>
                  <div className="relative">
                    <select
                      value={classificationFilter}
                      onChange={(e) => { setClassificationFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any</option>
                      <option value="OWNER" className="bg-slate-900 text-white">Confirmed Owner</option>
                      <option value="BUYER" className="bg-slate-900 text-white">Buyer</option>
                      <option value="TENANT" className="bg-slate-900 text-white">Tenant</option>
                      <option value="UNKNOWN" className="bg-slate-900 text-white">Unknown Classification</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {/* Portfolio Size */}
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">
                    Portfolio Size
                  </label>
                  <div className="relative">
                    <select
                      value={portfolioSizeFilter}
                      onChange={(e) => { setPortfolioSizeFilter(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-[#0b162c] hover:bg-[#0f1d3a] border border-white/15 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white outline-none cursor-pointer transition-all appearance-none"
                    >
                      <option value="Any" className="bg-slate-900 text-white">Any Size</option>
                      <option value="Single Unit" className="bg-slate-900 text-white">Single Unit (1 Property)</option>
                      <option value="Multi-Unit (2+)" className="bg-slate-900 text-white">Multi-Unit (2+ Properties)</option>
                      <option value="Large Portfolio (5+)" className="bg-slate-900 text-white">VIP Portfolio (5+ Properties)</option>
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
        <div className="flex-1 min-h-0 bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 relative flex flex-col overflow-hidden">
          <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
            <table className="w-full text-left border-collapse text-[13.5px]">
              <thead className="bg-[#071322] border-b border-[#233549] text-xs uppercase tracking-wider text-slate-400 sticky top-0 z-20 shadow-md shadow-black/40">
                <tr>
                  <th className="w-[28%] px-5 py-3.5 font-semibold text-left bg-[#071322] align-middle">Lead ID &amp; Owner</th>
                  <th className="w-[18%] px-5 py-3.5 font-semibold text-left bg-[#071322] align-middle">Phone &amp; Email</th>
                  <th className="w-[22%] px-5 py-3.5 font-semibold text-left bg-[#071322] align-middle">Property &amp; Portfolio</th>
                  <th className="w-[13%] px-5 py-3.5 font-semibold text-left bg-[#071322] align-middle">Assigned Agent</th>
                  <th className="w-[11%] px-5 py-3.5 font-semibold text-left bg-[#071322] align-middle">Bitrix ID / Status</th>
                  <th className="w-[8%] px-5 py-3.5 font-semibold text-right bg-[#071322] align-middle">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b2b3d]">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-12 text-slate-400">Loading owner records...</td></tr>
                ) : owners.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-slate-400">No owners found matching filters.</td></tr>
                ) : owners.map((owner) => {
                  const isSynced = !!owner.bitrix_id || pushedIds.has(owner.id);
                  const isSyncing = syncingId === owner.id;

                  return (
                    <tr 
                      key={owner.id} 
                      className="hover:bg-[#102035] transition-colors group cursor-pointer border-b border-[#1b2b3d]/60 last:border-b-0 h-[68px]" 
                      onClick={() => setSelectedOwner(owner)}
                    >
                      {/* 1. Lead ID & Owner Name */}
                      <td className="px-5 py-3 font-medium text-white align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs shrink-0 shadow-sm">
                            {owner.name ? (String(owner.name).match(/[a-zA-Z0-9]/) || ['O'])[0].toUpperCase() : 'O'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white/95 group-hover:text-blue-400 transition-colors truncate text-sm leading-snug">
                              {owner.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold tracking-tight">
                                {owner.lead_id}
                              </span>
                              {owner.units > 1 ? (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 tracking-tight">
                                  {owner.units} Units Portfolio
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10 uppercase tracking-wider font-semibold">
                                  1 Unit
                                </span>
                              )}
                              {owner.ownership_type && owner.ownership_type !== 'OWNER' && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 uppercase tracking-wider">
                                  {owner.ownership_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Phone & Email */}
                      <td className="px-5 py-3 align-middle">
                        <div className="flex flex-col justify-center space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-white/85">
                            <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" />
                            <span className="font-mono tracking-tight">{owner.phone}</span>
                            {owner.phone && owner.phone !== 'N/A' && !owner.phone.startsWith('+9714') && !owner.phone.startsWith('04') && (
                              <a
                                href={`https://wa.me/${String(owner.phone).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Chat on WhatsApp"
                                className="text-emerald-400 hover:text-emerald-300 ml-1 p-0.5 rounded hover:bg-emerald-500/15 inline-flex items-center"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Mail className="w-3.5 h-3.5 text-white/40 shrink-0" />
                            <span className="truncate max-w-[160px]">{owner.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Property & Portfolio */}
                      <td className="px-5 py-3 align-middle">
                        <div className="flex flex-col justify-center space-y-1 text-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetB = owner.building && owner.building !== 'Dubai' ? owner.building : (owner.area || 'Dubai');
                              window.location.hash = `#buildings?tower=${encodeURIComponent(targetB)}`;
                            }}
                            className="font-medium text-white/90 hover:text-blue-400 flex items-center gap-1.5 transition-colors group/bldg cursor-pointer text-left"
                            title={`View ${owner.building} in Building 360`}
                          >
                            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate max-w-[190px] font-medium">{owner.building}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-white/30 group-hover/bldg:text-blue-400 transition-colors shrink-0" />
                          </button>
                          <div className="flex items-center gap-2 text-white/50 flex-wrap">
                            {owner.total_portfolio_valuation > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold shrink-0">
                                {formatValuationShort(owner.total_portfolio_valuation)} Valuation
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 text-[10px] shrink-0">
                                Single Deed
                              </span>
                            )}
                            <span className="flex items-center gap-1 truncate text-slate-300">
                              <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                              {owner.area}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Assigned Agent */}
                      <td className="px-5 py-3 align-middle">
                        {owner.assigned_agent ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-[10px] shrink-0">
                              {owner.assigned_agent.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold text-white/90 truncate max-w-[140px]">
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
                      <td className="px-5 py-3 align-middle">
                        {owner.bitrix_status ? (
                          <div className="flex flex-col justify-center gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold w-fit">
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

                      {/* 6. Classification */}
                      <td className="px-5 py-3 text-right align-middle">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          owner.ownership_type === 'OWNER'
                            ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                            : owner.ownership_type === 'BUYER'
                            ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                            : owner.ownership_type === 'TENANT'
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'bg-slate-500/15 border border-slate-500/30 text-slate-300'
                        }`}>
                          {owner.ownership_type || 'OWNER'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="p-4 border-t border-[#233549] bg-[#071322] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
            <span>
              {isSearching ? (
                `Found ${owners.length} matching owner record${owners.length === 1 ? '' : 's'}`
              ) : (
                `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${((currentPage - 1) * itemsPerPage) + owners.length} of ${totalCount.toLocaleString()} owner records (Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()})`
              )}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
              >
                Previous
              </button>
              
              {/* First Page */}
              <button 
                onClick={() => setCurrentPage(1)} 
                className={`px-3 py-1 rounded-md text-xs font-medium ${currentPage === 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#06111e] border border-[#1a2c42] text-slate-300 hover:text-white transition-colors'}`}
              >
                1
              </button>
              
              {/* Ellipsis if beyond page 3 */}
              {currentPage > 3 && (
                <button 
                  onClick={() => customPageInputRef.current?.focus()} 
                  title="Click to jump to custom page"
                  className="px-1.5 py-1 text-slate-500 hover:text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  ...
                </button>
              )}
              
              {/* Preceding page */}
              {currentPage > 2 && (
                <button 
                  onClick={() => setCurrentPage(currentPage - 1)} 
                  className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  {currentPage - 1}
                </button>
              )}

              {/* Current page (if not first and not last) */}
              {currentPage !== 1 && currentPage !== totalPages && (
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium shadow-sm">
                  {currentPage}
                </button>
              )}
              
              {/* Following page */}
              {currentPage < totalPages - 1 && (
                <button 
                  onClick={() => setCurrentPage(currentPage + 1)} 
                  className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  {currentPage + 1}
                </button>
              )}

              {/* Second following page if near start */}
              {currentPage === 1 && totalPages > 2 && (
                <button 
                  onClick={() => setCurrentPage(2)} 
                  className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  2
                </button>
              )}
              {currentPage === 1 && totalPages > 3 && (
                <button 
                  onClick={() => setCurrentPage(3)} 
                  className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  3
                </button>
              )}
              
              {/* Ellipsis if not near end */}
              {currentPage < totalPages - 2 && (
                <button 
                  onClick={() => customPageInputRef.current?.focus()} 
                  title="Click to jump to custom page"
                  className="px-1.5 py-1 text-slate-500 hover:text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  ...
                </button>
              )}

              {/* Last Page */}
              {totalPages > 1 && currentPage !== 1 && (
                <button 
                  onClick={() => setCurrentPage(totalPages)} 
                  className={`px-3 py-1 rounded-md text-xs font-medium ${currentPage === totalPages ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#06111e] border border-[#1a2c42] text-slate-300 hover:text-white transition-colors'}`}
                >
                  {totalPages.toLocaleString()}
                </button>
              )}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage >= totalPages} 
                className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
              >
                Next
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
      ) : (
        /* ─── Grid (Cards) View ────────────────────────────────────────────── */
        <div className="flex-1 min-h-0 bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 relative flex flex-col overflow-hidden p-4">
          <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
            {loading ? (
              <div className="text-center py-16 text-slate-400">Loading owner cards...</div>
            ) : owners.length === 0 ? (
              <div className="text-center py-16 text-slate-400">No owners found matching filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {owners.map(owner => {
                  const isSynced = !!owner.bitrix_id || pushedIds.has(owner.id);
                  const isSyncing = syncingId === owner.id;

                  return (
                    <div
                      key={owner.id}
                      onClick={() => setSelectedOwner(owner)}
                      className="bg-[#06111e] hover:bg-[#102035] border border-[#1b2b3d] hover:border-[#385175] rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between shadow-lg group"
                    >
                      <div>
                        {/* Top Row: Avatar + Lead ID + CRM badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs">
                              {owner.name ? (String(owner.name).match(/[a-zA-Z0-9]/) || ['O'])[0].toUpperCase() : 'O'}
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors line-clamp-1">
                                {owner.name}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono text-blue-400 font-bold">
                                  {owner.lead_id}
                                </span>
                                {owner.owner_id && (
                                  <span className="text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1 py-0.5 rounded border border-purple-500/20" title="Master Leads ID">
                                    {owner.owner_id}
                                  </span>
                                )}
                              </div>
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
                            {owner.total_portfolio_valuation > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                                {formatValuationShort(owner.total_portfolio_valuation)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between text-white/40 text-[11px] mt-1.5">
                            <span>{owner.area}</span>
                            <span className="uppercase text-[9px] tracking-wider font-semibold text-white/50">
                              {owner.property_type}
                            </span>
                          </div>
                        </div>

                        {/* Contact info */}
                        <div className="space-y-1 mb-4 text-xs text-white/70">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-white/40" />
                              <span className="font-mono">{owner.phone}</span>
                            </div>
                            {owner.phone && owner.phone !== 'N/A' && !owner.phone.startsWith('+9714') && !owner.phone.startsWith('04') && (
                              <a
                                href={`https://wa.me/${String(owner.phone).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Chat on WhatsApp"
                                className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded hover:bg-emerald-500/15 flex items-center gap-1 text-[11px]"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
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
          <div className="p-3 border-t border-[#233549] bg-[#071322] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              {isSearching ? (
                `Found ${owners.length} matching owner record${owners.length === 1 ? '' : 's'}`
              ) : (
                `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${((currentPage - 1) * itemsPerPage) + owners.length} of ${totalCount.toLocaleString()} owners (Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()})`
              )}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(1)} 
                className={`px-3 py-1 rounded-md text-xs font-medium ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-[#06111e] border border-[#1a2c42] text-slate-300 hover:text-white transition-colors'}`}
              >
                1
              </button>
              {currentPage !== 1 && (
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium">
                  {currentPage}
                </button>
              )}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium"
              >
                Next
              </button>
              <div className="flex items-center gap-1.5 ml-1.5 pl-2 border-l border-[#233549]">
                <span className="text-slate-400 text-xs">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={customPageInput}
                  onChange={(e) => setCustomPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomPageSubmit();
                  }}
                  placeholder="Page #"
                  className="w-16 px-2 py-1 bg-[#06111e] border border-[#1a2c42] focus:border-blue-500 rounded-md text-white text-xs text-center font-mono outline-none transition-colors"
                />
                <button
                  onClick={handleCustomPageSubmit}
                  disabled={!customPageInput || isNaN(parseInt(customPageInput, 10))}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-30"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
