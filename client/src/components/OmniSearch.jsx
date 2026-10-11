import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Building2, User, Phone, MapPin, 
  ArrowRight, ShieldCheck, Copy, Check, Filter, 
  ExternalLink, Sparkles, RefreshCw, X, ChevronRight, Hash, Database
} from 'lucide-react';
import Owner360Detail from './Owner360Detail';

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const KNOWN_COMMUNITIES = [
  'Downtown Dubai', 'Dubai Marina', 'Business Bay', 'Palm Jumeirah',
  'Jumeirah Lakes Towers (JLT)', 'Jumeirah Village Circle', 'Dubai Hills Estate',
  'Emaar Beachfront', 'Creek Harbour', 'Al Barsha', 'Arabian Ranches',
  'City Walk', 'Bluewaters Island', 'DIFC', 'Meydan', 'Motor City'
];

function formatBuildingName(name) {
  if (!name) return 'Dubai Residence';
  let cleaned = name.replace(/_DEWA$|_PREMISE$|_FINAL$/i, '').trim();
  cleaned = cleaned.replace(/^(Building|Tower|Villa|Residence|The)\s+/i, '').trim();
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getBuildingCommunity(rawName, masterArea) {
  if (masterArea && masterArea.trim() && masterArea.toLowerCase() !== 'dubai') {
    return masterArea.trim().toUpperCase();
  }
  const n = (rawName || '').toLowerCase();
  for (const c of KNOWN_COMMUNITIES) {
    if (n.includes(c.toLowerCase())) return c.toUpperCase();
  }
  if (n.includes('khalifa') || n.includes('opera') || n.includes('boulevard') || n.includes('fountain')) return 'DOWNTOWN DUBAI';
  if (n.includes('marina') || n.includes('gate') || n.includes('damac heights')) return 'DUBAI MARINA';
  if (n.includes('palm') || n.includes('atlantis') || n.includes('nakheel')) return 'PALM JUMEIRAH';
  if (n.includes('bay') || n.includes('executive') || n.includes('churchill')) return 'BUSINESS BAY';
  if (n.includes('jlt') || n.includes('lake') || n.includes('cluster')) return 'JLT';
  if (n.includes('jvc') || n.includes('circle')) return 'JVC';
  if (n.includes('creek') || n.includes('harbour') || n.includes('cove')) return 'DUBAI CREEK';
  if (n.includes('hills') || n.includes('park heights') || n.includes('collective')) return 'DUBAI HILLS';
  return 'DUBAI';
}

function getBuildingType(rawName, rawType) {
  const n = (rawName || '').toLowerCase();
  if (n.includes('office') || n.includes('tower b') || n.includes('commercial') || n.includes('business')) {
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

const SEARCH_FILTER_PILLS = [
  'All',
  'Owners',
  'Buildings',
  'Area',
  'Phone Numbers',
  'Lead ID',
  'Bitrix ID',
  'Supabase ID'
];

export default function OmniSearch({ onOpenBuildingTab, isModal = false, onClose }) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  
  // Results
  const [ownerResults, setOwnerResults] = useState([]);
  const [buildingResults, setBuildingResults] = useState([]);
  const [areaResults, setAreaResults] = useState([]);
  const [idResults, setIdResults] = useState([]);

  // Inside-Building Explorer State
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [buildingOwners, setBuildingOwners] = useState([]);
  const [loadingBuildingOwners, setLoadingBuildingOwners] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Inside-Area Explorer State
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaBuildingsList, setAreaBuildingsList] = useState([]);
  const [areaTopOwners, setAreaTopOwners] = useState([]);
  const [loadingAreaDetails, setLoadingAreaDetails] = useState(false);
  const [areaDrawerSearch, setAreaDrawerSearch] = useState('');

  // Owner 360 Full Page View
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Autofocus input on load or when modal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, [isModal]);

  const handleSearch = async (overrideFilter, overrideQuery) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    const currentFilter = overrideFilter || filterType;
    if (q.length < 1) return;

    setLoading(true);
    const headers = { 
      apikey: SUPABASE_API_KEY, 
      Authorization: `Bearer ${SUPABASE_API_KEY}` 
    };

    try {
      if (currentFilter === 'Buildings') {
        // ── 1. BUILDINGS ONLY: Search building_name, aggregate into distinct building entities
        setOwnerResults([]);
        setAreaResults([]);
        setIdResults([]);
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
      } else if (currentFilter === 'Area') {
        // ── 2. AREA ONLY: Search master_area, aggregate community stats
        setOwnerResults([]);
        setBuildingResults([]);
        setIdResults([]);
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?master_area=ilike.*${encodeURIComponent(q)}*&select=owner_id,lead_id,full_name,building_name,master_area,unit_number,phone_normalized,reported_property_type,property_category&limit=300`;
        const res = await axios.get(endpoint, { headers });

        const aMap = {};
        (res.data || []).forEach(row => {
          const rawArea = (row.master_area || '').trim();
          if (!rawArea || rawArea.length < 2 || rawArea.toLowerCase() === 'null') return;
          const key = rawArea.toLowerCase();
          if (!aMap[key]) {
            aMap[key] = {
              rawName: rawArea,
              name: rawArea,
              buildingsSet: new Set(),
              unitsSet: new Set(),
              ownersCount: 0,
              phonesCount: 0,
              residentialCount: 0,
              commercialCount: 0,
              sampleBuildings: new Set()
            };
          }
          aMap[key].ownersCount++;
          if (row.building_name && String(row.building_name).trim()) {
            aMap[key].buildingsSet.add(String(row.building_name).trim());
            if (aMap[key].sampleBuildings.size < 6) {
              aMap[key].sampleBuildings.add(formatBuildingName(String(row.building_name).trim()));
            }
          }
          if (row.unit_number && String(row.unit_number).trim()) aMap[key].unitsSet.add(String(row.unit_number).trim());
          if (row.phone_normalized && String(row.phone_normalized).trim().length > 6) aMap[key].phonesCount++;
          if (row.property_category === 'Commercial') aMap[key].commercialCount++;
          else aMap[key].residentialCount++;
        });

        const list = Object.values(aMap).map(a => ({
          rawName: a.rawName,
          name: a.name,
          totalBuildings: a.buildingsSet.size > 0 ? a.buildingsSet.size : 1,
          totalUnits: a.unitsSet.size > 0 ? a.unitsSet.size : a.ownersCount,
          totalOwners: a.ownersCount,
          phoneCoverage: a.ownersCount > 0 ? Math.round((a.phonesCount / a.ownersCount) * 100) : 0,
          sampleBuildings: Array.from(a.sampleBuildings),
          residentialCount: a.residentialCount,
          commercialCount: a.commercialCount
        })).sort((a, b) => b.totalOwners - a.totalOwners);

        setAreaResults(list);
      } else if (currentFilter === 'Lead ID') {
        // ── 3. LEAD ID ONLY: Exact or prefix match on generated Lead ID
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        setOwnerResults([]);
        const cleanTerm = q.trim();
        const rawDigits = cleanTerm.replace(/[^0-9]/g, '');
        const variants = [cleanTerm, cleanTerm.toUpperCase()];
        if (rawDigits) {
          variants.push(rawDigits);
          variants.push(`LEAD-${rawDigits}`);
          if (rawDigits.length < 7) {
            variants.push(`LEAD-${rawDigits.padStart(7, '0')}`);
          }
        }
        const uniqueVariants = Array.from(new Set(variants.filter(Boolean)));
        const orClause = uniqueVariants.map(v => `lead_id.eq.${encodeURIComponent(v)}`).join(',');
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?or=(${orClause})&select=*&limit=50`;
        const res = await axios.get(endpoint, { headers });
        setIdResults(res.data || []);
      } else if (currentFilter === 'Bitrix ID') {
        // ── 4. BITRIX ID ONLY: CRM Bitrix ID match
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        setOwnerResults([]);
        const cleanTerm = q.replace(/[^0-9]/g, '') || q.trim();
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?bitrix_id=eq.${encodeURIComponent(cleanTerm)}&select=*&limit=50`;
        const res = await axios.get(endpoint, { headers });
        setIdResults(res.data || []);
      } else if (currentFilter === 'Supabase ID') {
        // ── 5. SUPABASE ID ONLY: Primary key row ID match
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        setOwnerResults([]);
        const cleanTerm = q.trim();
        const rawDigits = cleanTerm.replace(/[^0-9]/g, '');
        const variants = [cleanTerm, cleanTerm.toUpperCase()];
        if (rawDigits) {
          variants.push(rawDigits);
          variants.push(`OWN-${rawDigits}`);
          if (rawDigits.length < 7) {
            variants.push(`OWN-${rawDigits.padStart(7, '0')}`);
          }
        }
        const uniqueVariants = Array.from(new Set(variants.filter(Boolean)));
        const orClause = uniqueVariants.map(v => `owner_id.eq.${encodeURIComponent(v)}`).join(',');
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?or=(${orClause})&select=*&limit=50`;
        const res = await axios.get(endpoint, { headers });
        setIdResults(res.data || []);
      } else if (currentFilter === 'Owners') {
        // ── 6. OWNERS ONLY: Search full_name
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?full_name=ilike.*${encodeURIComponent(q)}*&select=*&limit=50`;
        const res = await axios.get(endpoint, { headers });
        setOwnerResults(res.data || []);
      } else if (currentFilter === 'Phone Numbers') {
        // ── 7. PHONE NUMBERS ONLY
        setBuildingResults([]);
        setAreaResults([]);
        setIdResults([]);
        const cleanDigits = q.replace(/[^0-9]/g, '');
        const phoneTerm = cleanDigits.length >= 4 ? cleanDigits : q;
        const endpoint = `${SUPABASE_BASE_URL}/owners_data?phone_normalized=ilike.*${encodeURIComponent(phoneTerm)}*&select=*&limit=50`;
        const res = await axios.get(endpoint, { headers });
        setOwnerResults(res.data || []);
      } else {
        // ── 8. ALL: Combined LinkedIn-style intelligent search across Area, Buildings, and Owners
        // Run comprehensive multi-entity query
        const combinedEndpoint = `${SUPABASE_BASE_URL}/owners_data?or=(full_name.ilike.*${encodeURIComponent(q)}*,building_name.ilike.*${encodeURIComponent(q)}*,master_area.ilike.*${encodeURIComponent(q)}*,lead_id.ilike.*${encodeURIComponent(q)}*)&select=*&limit=250`;
        const res = await axios.get(combinedEndpoint, { headers });
        const allData = res.data || [];

        // 1. Matched Areas
        const qLower = q.toLowerCase();
        const aMap = {};
        allData.forEach(row => {
          const ma = (row.master_area || '').trim();
          if (ma && ma.toLowerCase().includes(qLower)) {
            const key = ma.toLowerCase();
            if (!aMap[key]) {
              aMap[key] = {
                rawName: ma,
                name: ma,
                buildingsSet: new Set(),
                unitsSet: new Set(),
                ownersCount: 0,
                phonesCount: 0,
                sampleBuildings: new Set()
              };
            }
            aMap[key].ownersCount++;
            if (row.building_name) {
              aMap[key].buildingsSet.add(row.building_name);
              if (aMap[key].sampleBuildings.size < 4) aMap[key].sampleBuildings.add(formatBuildingName(row.building_name));
            }
            if (row.unit_number) aMap[key].unitsSet.add(row.unit_number);
            if (row.phone_normalized) aMap[key].phonesCount++;
          }
        });
        const matchedAreasList = Object.values(aMap).map(a => ({
          rawName: a.rawName,
          name: a.name,
          totalBuildings: a.buildingsSet.size > 0 ? a.buildingsSet.size : 1,
          totalUnits: a.unitsSet.size > 0 ? a.unitsSet.size : a.ownersCount,
          totalOwners: a.ownersCount,
          phoneCoverage: a.ownersCount > 0 ? Math.round((a.phonesCount / a.ownersCount) * 100) : 0,
          sampleBuildings: Array.from(a.sampleBuildings)
        })).sort((a, b) => b.totalOwners - a.totalOwners);
        setAreaResults(matchedAreasList);

        // 2. Matched Buildings
        const bMap = {};
        allData.forEach(row => {
          const rawBn = (row.building_name || '').trim();
          if (rawBn && rawBn.toLowerCase().includes(qLower)) {
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
            if (bMap[key].sampleOwners.length < 20) {
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
          }
        });
        const matchedBuildingsList = Object.values(bMap).map(b => ({
          ...b,
          unitsCount: b.unitsSet.size > 0 ? b.unitsSet.size : b.ownersCount,
          contactCoverage: b.ownersCount > 0 ? Math.round((b.contactsCount / b.ownersCount) * 100) : 0
        })).sort((a, b) => b.ownersCount - a.ownersCount);
        setBuildingResults(matchedBuildingsList);

        // 3. Matched Owners / Direct Leads
        const matchedOwnersList = allData.filter(row => {
          const fn = (row.full_name || '').toLowerCase();
          const lid = (row.lead_id || '').toLowerCase();
          return fn.includes(qLower) || lid.includes(qLower);
        });
        setOwnerResults(matchedOwnersList);
        setIdResults([]);
      }
    } catch (err) {
      console.error('OmniSearch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterPillClick = (f) => {
    setFilterType(f);
    if (query.trim().length >= 1) {
      handleSearch(f, query.trim());
    }
  };

  // Open Inside-Building Explorer Drawer
  const openBuildingExplorer = async (building) => {
    setSelectedBuilding(building);
    setDrawerSearch('');
    setLoadingBuildingOwners(true);

    try {
      const headers = { 
        apikey: SUPABASE_API_KEY, 
        Authorization: `Bearer ${SUPABASE_API_KEY}`,
        Prefer: 'count=exact'
      };
      const cleanTerm = (building.rawName || building.name).replace(/'/g, "''");
      const endpoint = `${SUPABASE_BASE_URL}/owners_data?building_name=ilike.*${encodeURIComponent(cleanTerm)}*&select=owner_id,lead_id,full_name,building_name,master_area,unit_number,phone_normalized,email,property_category,bitrix_id,bitrix_status&limit=250`;
      const res = await axios.get(endpoint, { headers });
      
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map(r => ({
          id: r.owner_id || r.lead_id,
          lead_id: r.lead_id || `LEAD-${r.owner_id}`,
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
        }));
        setBuildingOwners(mapped);

        // Dynamically synchronize metrics to match exact live fetched records
        const unitsSet = new Set(mapped.map(m => m.unit).filter(u => u && u !== 'N/A'));
        const phonesCount = mapped.filter(m => m.phone && m.phone !== 'N/A').length;

        // Exact total in Supabase from Content-Range header
        const cr = res.headers ? (res.headers['content-range'] || (res.headers.get && res.headers.get('content-range'))) : null;
        let totalCount = mapped.length;
        if (cr && cr.includes('/')) {
          const parsed = parseInt(cr.split('/')[1], 10);
          if (!isNaN(parsed) && parsed > 0) totalCount = parsed;
        }

        setSelectedBuilding(prev => ({
          ...prev,
          unitsCount: unitsSet.size > 0 ? unitsSet.size : mapped.length,
          ownersCount: totalCount,
          fetchedCount: mapped.length,
          contactsCount: phonesCount
        }));
      } else {
        setBuildingOwners([]);
      }
    } catch (e) {
      console.error('Error fetching building owners:', e);
      setBuildingOwners([]);
    } finally {
      setLoadingBuildingOwners(false);
    }
  };

  // Open Inside-Area Explorer Drawer
  const openAreaExplorer = async (area) => {
    setSelectedArea(area);
    setAreaDrawerSearch('');
    // Instant pre-population from already aggregated search data
    if (area.sampleBuildings && area.sampleBuildings.length > 0) {
      setAreaBuildingsList(area.sampleBuildings.map(bName => ({
        rawName: bName,
        name: bName,
        unitsCount: Math.max(1, Math.round(area.totalUnits / area.sampleBuildings.length)),
        ownersCount: Math.max(1, Math.round(area.totalOwners / area.sampleBuildings.length))
      })));
    } else {
      setAreaBuildingsList([]);
    }
    setLoadingAreaDetails(true);

    try {
      const headers = { 
        apikey: SUPABASE_API_KEY, 
        Authorization: `Bearer ${SUPABASE_API_KEY}` 
      };
      const cleanArea = (area.rawName || area.name).replace(/'/g, "''");
      const endpoint = `${SUPABASE_BASE_URL}/owners_data?master_area=ilike.*${encodeURIComponent(cleanArea)}*&select=owner_id,lead_id,full_name,building_name,master_area,unit_number,phone_normalized,property_category,bitrix_id&limit=250`;
      const res = await axios.get(endpoint, { headers });
      
      if (res.data && res.data.length > 0) {
        // Aggregate buildings in this area
        const bMap = {};
        const ownersList = [];
        res.data.forEach(r => {
          const rawBn = (r.building_name || '').trim();
          if (rawBn && rawBn.length > 1) {
            const disp = formatBuildingName(rawBn);
            const k = disp.toLowerCase();
            if (!bMap[k]) {
              bMap[k] = {
                rawName: rawBn,
                name: disp,
                unitsCount: 0,
                ownersCount: 0,
                sampleOwners: []
              };
            }
            bMap[k].ownersCount++;
            if (r.unit_number) bMap[k].unitsCount++;
          }
          if (ownersList.length < 50) {
            ownersList.push({
              id: r.owner_id || r.lead_id,
              lead_id: r.lead_id || `LEAD-${r.owner_id}`,
              name: r.full_name || 'Owner',
              unit: r.unit_number || 'N/A',
              building: r.building_name ? formatBuildingName(r.building_name) : 'N/A',
              phone: r.phone_normalized || 'N/A',
              property_category: r.property_category || 'Residential',
              bitrix_id: r.bitrix_id
            });
          }
        });
        setAreaBuildingsList(Object.values(bMap).sort((a, b) => b.ownersCount - a.ownersCount));
        setAreaTopOwners(ownersList);
      }
    } catch (e) {
      console.error('Error fetching area details:', e);
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

  const filteredDrawerOwners = useMemo(() => {
    if (!drawerSearch.trim()) return buildingOwners;
    const q = drawerSearch.toLowerCase();
    return buildingOwners.filter(o => 
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.unit && String(o.unit).toLowerCase().includes(q)) ||
      (o.phone && String(o.phone).includes(q))
    );
  }, [buildingOwners, drawerSearch]);

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
        globalAgentName="Melanie Simsiman"
      />
    );
  }

  const getSearchPlaceholder = () => {
    switch (filterType) {
      case 'Buildings':
        return 'Search building name or tower (e.g. Burj Khalifa, Marina Gate)...';
      case 'Area':
        return 'Search community or area (e.g. Downtown Dubai, Dubai Marina, Business Bay)...';
      case 'Owners':
        return 'Search owner or investor name (e.g. Alla Kuznetsova, Al Maktoum)...';
      case 'Phone Numbers':
        return 'Search phone number digits (e.g. 971501234567)...';
      case 'Lead ID':
        return 'Type exact Lead ID (e.g. LEAD-0399904 or 0399904)...';
      case 'Bitrix ID':
        return 'Type CRM Bitrix ID (e.g. 12480)...';
      case 'Supabase ID':
        return 'Type Supabase Row ID (e.g. 408192)...';
      default:
        return 'Search owner name, building, area, phone, or Lead ID...';
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
      <div className="flex flex-col items-center justify-center mt-2 mb-5 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1" style={{ fontFamily: "Georgia, serif" }}>
          SEARCH DATABASE
        </h1>
        <p className="text-white/50 text-xs sm:text-sm text-center">
          Search across 3.04 million property owners, buildings, areas, and verified IDs in Dubai.
        </p>
      </div>

      {/* Center Search Container */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0">
        
        {/* Big Search Bar */}
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-5 sm:h-6 text-[#3b82f6]" />
          <input
            ref={inputRef}
            type="text"
            placeholder={getSearchPlaceholder()}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-[#03152d]/90 border-2 border-white/10 focus:border-[#3b82f6] rounded-2xl pl-14 sm:pl-16 pr-14 sm:pr-16 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/20 transition-all shadow-2xl backdrop-blur-xl"
          />
          <button 
            onClick={() => handleSearch()} 
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#3b82f6] hover:bg-[#2563eb] text-white p-2 sm:p-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 cursor-pointer"
            title="Search"
          >
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 8 Filter Pills */}
        <div className="flex items-center gap-2 mb-5 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 text-white/50 text-xs font-bold uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filters:</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {SEARCH_FILTER_PILLS.map(f => (
              <button 
                key={f}
                onClick={() => handleFilterPillClick(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
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
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-8 pr-1 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-white/50">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-400 mb-2" />
              <p className="text-sm">Searching database records...</p>
            </div>
          )}

          {!loading && query && totalResultsCount === 0 && (
            <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.02]">
              <Search className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No matching results found</h3>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                No records matched "{query}" under the <span className="text-blue-400 font-semibold">{filterType}</span> filter. Try switching to "All" or refining your search term.
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* A. ID LOOKUP RESULTS (Lead ID, Bitrix ID, Supabase ID)             */}
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
                  key={item.owner_id || idx}
                  className="bg-[#03152d]/80 border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl p-4 transition-all shadow-lg flex items-center justify-between gap-4 group"
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
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                          {item.lead_id || `ID: ${item.owner_id}`}
                        </span>
                        {item.bitrix_id && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
                            Bitrix: #{item.bitrix_id}
                          </span>
                        )}
                        {item.property_category && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            item.property_category === 'Commercial'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {item.property_category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                        {item.unit_number && <span>Unit: <strong className="text-white/80">{item.unit_number}</strong></span>}
                        {item.building_name && <span>Building: <strong className="text-white/80">{item.building_name}</strong></span>}
                        {item.master_area && <span>Area: <strong className="text-white/80">{item.master_area}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.phone_normalized && item.phone_normalized !== 'N/A' && (
                      <button
                        onClick={(e) => copyPhone(item.phone_normalized, e)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all"
                      >
                        {copiedPhone === item.phone_normalized ? <Check className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                        <span>{copiedPhone === item.phone_normalized ? 'Copied' : item.phone_normalized}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedOwner({
                        id: item.owner_id || item.lead_id,
                        lead_id: item.lead_id,
                        name: item.full_name,
                        unit_number: item.unit_number,
                        building: item.building_name,
                        area: item.master_area,
                        phone: item.phone_normalized,
                        email: item.email,
                        property_category: item.property_category,
                        bitrix_id: item.bitrix_id
                      })}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1 transition-all"
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
                    className="text-blue-400 hover:text-blue-300 normal-case font-semibold text-[11px] flex items-center gap-1"
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
                    className="bg-[#03152d]/80 hover:bg-[#062044] border border-amber-500/20 hover:border-amber-400/50 rounded-xl p-4 transition-all shadow-lg cursor-pointer group flex flex-col justify-between"
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
                          <div className="text-[9.5px] text-white/40 uppercase">Units in DB</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-emerald-300">{area.phoneCoverage}%</div>
                          <div className="text-[9.5px] text-white/40 uppercase">Phone Rate</div>
                        </div>
                      </div>

                      {area.sampleBuildings && area.sampleBuildings.length > 0 && (
                        <div className="text-[11px] text-white/50 truncate">
                          Towers: <span className="text-white/70">{area.sampleBuildings.join(', ')}</span>
                        </div>
                      )}
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
                    className="text-blue-400 hover:text-blue-300 normal-case font-semibold text-[11px] flex items-center gap-1"
                  >
                    <span>View all buildings</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {buildingResults.map((b, idx) => (
                <div 
                  key={b.rawName || idx}
                  onClick={() => openBuildingExplorer(b)}
                  className="bg-[#03152d]/80 hover:bg-[#062044] border border-white/10 hover:border-blue-500/50 rounded-xl p-4 transition-all shadow-lg flex items-center justify-between gap-4 cursor-pointer group"
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
                          <strong className="text-white">{b.unitsCount}</strong> Units in DB
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
                      openBuildingExplorer(b);
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
          {/* D. MATCHED OWNERS SECTION                                         */}
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
                    className="text-blue-400 hover:text-blue-300 normal-case font-semibold text-[11px] flex items-center gap-1"
                  >
                    <span>View all owners</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {ownerResults.map((item, idx) => (
                <div 
                  key={item.owner_id || idx}
                  className="bg-[#03152d]/80 hover:bg-[#062044] border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all shadow-lg flex items-center justify-between gap-4 group"
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
                        <span className="text-[10px] bg-white/10 text-white/70 font-mono px-2 py-0.5 rounded border border-white/10">
                          {item.lead_id || `ID: ${item.owner_id}`}
                        </span>
                        {item.property_category && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            item.property_category === 'Commercial'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {item.property_category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                        {item.unit_number && <span>Unit: <strong className="text-white/80">{item.unit_number}</strong></span>}
                        {item.building_name && <span>Building: <strong className="text-white/80">{item.building_name}</strong></span>}
                        {item.master_area && <span>Area: <strong className="text-white/80">{item.master_area}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.phone_normalized && item.phone_normalized !== 'N/A' && (
                      <button
                        onClick={(e) => copyPhone(item.phone_normalized, e)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all"
                      >
                        {copiedPhone === item.phone_normalized ? <Check className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                        <span>{copiedPhone === item.phone_normalized ? 'Copied' : item.phone_normalized}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedOwner({
                        id: item.owner_id || item.lead_id,
                        lead_id: item.lead_id,
                        name: item.full_name,
                        unit_number: item.unit_number,
                        building: item.building_name,
                        area: item.master_area,
                        phone: item.phone_normalized,
                        email: item.email,
                        property_category: item.property_category,
                        bitrix_id: item.bitrix_id
                      })}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1 transition-all"
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
      {/* INSIDE-BUILDING EXPLORER DRAWER                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedBuilding && (
        <div className="absolute inset-y-0 right-0 w-full md:w-[620px] bg-[#020b18]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-40 flex flex-col animate-slide-left">
          <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10.5px] uppercase font-mono font-bold tracking-wider text-blue-400">
                  {selectedBuilding.area}
                </span>
                <h3 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
                  {selectedBuilding.name}
                </h3>
                <p className="text-xs text-white/50">
                  {selectedBuilding.propertyType} • Verified owners registry
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedBuilding(null)}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-3 gap-3 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="bg-[#03152d] border border-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase font-mono">Verified Units</div>
              <div className="text-lg font-extrabold text-white">{selectedBuilding.unitsCount}</div>
            </div>
            <div className="bg-[#03152d] border border-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase font-mono">Total in DB</div>
              <div className="text-lg font-extrabold text-white">{selectedBuilding.ownersCount.toLocaleString()}</div>
            </div>
            <div className="bg-[#03152d] border border-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-white/40 uppercase font-mono">With Phone</div>
              <div className="text-lg font-extrabold text-emerald-400">
                {selectedBuilding.contactsCount} / {selectedBuilding.fetchedCount || selectedBuilding.ownersCount}
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Filter by owner name, unit #, or phone..."
                value={drawerSearch}
                onChange={(e) => setDrawerSearch(e.target.value)}
                className="w-full bg-[#03152d] border border-white/10 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5 min-h-0">
            {loadingBuildingOwners ? (
              <div className="py-16 text-center text-white/40 flex flex-col items-center">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mb-2" />
                <p className="text-xs">Loading building units &amp; owners...</p>
              </div>
            ) : filteredDrawerOwners.length > 0 ? (
              filteredDrawerOwners.map((owner, i) => (
                <div 
                  key={owner.id || i}
                  className="bg-[#03152d]/80 border border-white/5 hover:border-blue-500/40 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                      Unit {owner.unit}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{owner.name}</div>
                      <div className="text-[11px] text-white/40 flex items-center gap-1.5">
                        <span>{owner.lead_id}</span>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Verified Owner
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {owner.phone && owner.phone !== 'N/A' ? (
                      <button
                        onClick={(e) => copyPhone(owner.phone, e)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all"
                      >
                        {copiedPhone === owner.phone ? <Check className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        <span className="font-mono">{copiedPhone === owner.phone ? 'Copied' : owner.phone}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-white/30 italic px-2">Unlisted</span>
                    )}

                    <button
                      onClick={() => setSelectedOwner({
                        id: owner.id,
                        lead_id: owner.lead_id,
                        name: owner.name,
                        unit_number: owner.unit,
                        building: owner.building,
                        area: owner.area,
                        phone: owner.phone,
                        email: owner.email,
                        property_category: owner.property_category,
                        bitrix_id: owner.bitrix_id
                      })}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span>Owner 360</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-white/40">
                No matching owners in this building.
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10 bg-[#010814] flex items-center justify-between text-xs text-white/40 shrink-0">
            <span>
              Showing {filteredDrawerOwners.length} verified owner records {selectedBuilding.ownersCount > filteredDrawerOwners.length ? `(out of ${selectedBuilding.ownersCount.toLocaleString()} total in database)` : ''}
            </span>
            <button 
              onClick={() => setSelectedBuilding(null)}
              className="text-white/60 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
                <h3 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "Georgia, serif" }}>
                  {selectedArea.name}
                </h3>
                <p className="text-xs text-white/50">
                  {selectedArea.totalBuildings} Registered Towers &amp; Communities
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedArea(null)}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
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
                <p className="text-xs">Loading towers &amp; owners in {selectedArea.name}...</p>
              </div>
            ) : filteredAreaBuildings.length > 0 ? (
              filteredAreaBuildings.map((b, i) => (
                <div 
                  key={b.rawName || i}
                  onClick={() => openBuildingExplorer({
                    rawName: b.rawName,
                    name: b.name,
                    area: selectedArea.name,
                    propertyType: 'Residential',
                    unitsCount: b.unitsCount || b.ownersCount,
                    ownersCount: b.ownersCount,
                    contactsCount: Math.round(b.ownersCount * 0.5)
                  })}
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
                      </div>
                    </div>
                  </div>

                  <button className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#183153] hover:bg-amber-600 text-white flex items-center gap-1 transition-all">
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
              className="text-white/60 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
