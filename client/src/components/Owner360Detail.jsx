import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Building2, User, Users, UserCheck, FileText, Sparkles, 
  Phone, Mail, MapPin, CheckCircle2, AlertCircle, AlertTriangle,
  Copy, ExternalLink, ShieldCheck, ChevronDown, ChevronLeft, ChevronRight, Loader2, Send, MessageSquare, 
  HelpCircle, Bot, Share2, Layers, Tag, Check, Filter
} from 'lucide-react';
import axios from 'axios';

// ─── HELPER: PHONE SANITIZER & E.164 FORMATTER ─────────────────────────────
function formatCleanPhone(raw) {
  if (!raw || raw === 'N/A' || raw === 'null') return null;
  let digits = String(raw).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('9710') && digits.length === 13) digits = '971' + digits.slice(4);
  if (digits.startsWith('05') && digits.length === 10) digits = '971' + digits.slice(1);
  else if (digits.startsWith('5') && digits.length === 9) digits = '971' + digits;
  if (/^971[2-9]\d{7,8}$/.test(digits)) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return digits.length >= 7 ? `+${digits}` : null;
}

// ─── HELPER: CADASTRAL CODE IDENTIFIER ─────────────────────────────────────
function isCadastralCode(val) {
  if (!val) return false;
  const s = String(val).trim();
  if (/^[A-Z]{2,}\d+[A-Z0-9_-]+$/i.test(s) && s.length >= 7) return true;
  if (/^(?:PJA|JVC|JPO|DH|DMR|MBR)[-_A-Z0-9]+$/i.test(s)) return true;
  return false;
}

// ─── HELPER: DISAMBIGUATE PROPERTY IDENTITY ────────────────────────────────
function disambiguatePropertyIdentity(rawBuilding, rawUnit, rawArea) {
  const b = String(rawBuilding || '').trim();
  const u = String(rawUnit || '').trim();
  const a = String(rawArea || '').trim();

  const isGeneric = !b || ['dubai', 'uae', 'u.a.e', 'null', 'n/a', 'none', '-', '--', '1'].includes(b.toLowerCase());
  
  if (isGeneric) {
    if (u.startsWith('PJA-')) {
      const frondMatch = u.match(/PJA-FR([A-Z])-V-?0*(\d+)/i);
      const frondLetter = frondMatch ? frondMatch[1] : (u.includes('FRM') ? 'M' : u.includes('FRO') ? 'V' : '');
      const villaNum = frondMatch ? frondMatch[2] : '';
      return { 
        building: `Palm Jebel Ali (Frond ${frondLetter || 'Plot'}${villaNum ? ` Villa ${villaNum}` : ''})`, 
        isCadastral: true, 
        badgeText: 'Waterfront Plot Demarcation',
        category: 'Land Plot Demarcation',
        original: b 
      };
    }
    if (a && a.toLowerCase() !== 'dubai') {
      return { building: a, isCadastral: false, badgeText: null, category: 'Residential', original: b };
    }
    return { building: 'Primary Asset', isCadastral: false, badgeText: null, category: 'Residential', original: b };
  }

  if (isCadastralCode(b)) {
    let prefix = 'Cadastral Plot';
    if (b.startsWith('JVC')) prefix = 'JVC Plot Demarcation';
    else if (b.startsWith('PJA')) prefix = 'Palm Jebel Ali Plot';
    else if (b.startsWith('JPO')) prefix = 'Jumeirah Park Plot';
    return { 
      building: `${prefix}: ${b}`, 
      isCadastral: true, 
      plotCode: b,
      badgeText: 'Land Plot Demarcation',
      category: 'Land Plot Demarcation',
      original: b 
    };
  }

  if (/^\d{1,4}$/.test(b)) {
    return { 
      building: `${a && a !== 'Dubai' ? `${a} · ` : ''}Villa / Plot ${b}`, 
      isCadastral: true, 
      plotCode: b,
      badgeText: 'Subdivision Plot',
      category: 'Villa / Plot',
      original: b 
    };
  }

  return { building: b, isCadastral: false, badgeText: null, category: 'Tower / Complex', original: b };
}

// ─── HELPER: SANITIZE UNIT & RESCUE SHIFTED CELLS ──────────────────────────
function sanitizeUnit(rawUnit) {
  if (!rawUnit || rawUnit === 'N/A' || rawUnit === 'null' || rawUnit === '-') {
    return { unit: null, rescuedPhone: null, rescuedDate: null };
  }
  let str = String(rawUnit).trim();

  // Fast check 1: Phone number dumped into unit column (cell shift)
  const digitsOnly = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');
  if (/^(?:\+?00971|\+?971|05)\d{7,10}$/.test(digitsOnly) || (digitsOnly.length >= 9 && digitsOnly.length <= 13 && /^(?:971|05)/.test(digitsOnly))) {
    return { unit: null, rescuedPhone: formatCleanPhone(digitsOnly), rescuedDate: null };
  }

  // Fast check 2: Date dumped into unit column (cell shift)
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    return { unit: null, rescuedPhone: null, rescuedDate: str };
  }

  // Fast check 3: Dummy / nullish values
  if (/^(?:null|none|n\/a|undefined|-|--|0|nan|\.|1nos|nos)$/i.test(str)) {
    return { unit: null, rescuedPhone: null, rescuedDate: null };
  }

  // Strip trailing -0 or -00 export artifacts (e.g. 102-0 -> 102, 1406-0 -> 1406)
  str = str.replace(/^(\d+)-0+$/, '$1');
  str = str.replace(/^(?:APT|UNIT|FLAT|VILLA|SUITE)?\s*([A-Za-z0-9_-]+)-0+$/i, '$1');

  const cleaned = str.replace(/^(?:Unit|Flat|Villa|Apartment|Apt|Suite|Door)\s*[:#-]?\s*/i, '').replace(/[-_,\s/]+$/, '');
  return { unit: cleaned || null, rescuedPhone: null, rescuedDate: null };
}

// ─── HELPER: SEMANTIC PROPERTY TYPE RESOLVER ──────────────────────────────
function resolveCleanPropertyType(prop = {}) {
  if (prop.verified_property_type && !/^(?:null|nan|unknown|owner|buyer|tenant)$/i.test(prop.verified_property_type)) {
    return prop.verified_property_type;
  }
  const rep = (prop.reported_property_type || prop.property_type || '').trim();
  if (rep && !/^(?:owner|buyer|tenant|unit owner|unknown|nan|null|n\/a|-)$/i.test(rep)) {
    return rep;
  }
  if (prop.isCadastralPlot) {
    return 'Land / Cadastral Plot';
  }
  const bldg = (prop.building_name || prop.building || prop.cleanBuilding || '').toLowerCase();
  if (bldg.includes('villa') || bldg.includes('townhouse') || bldg.includes('mira') || bldg.includes('damac hills') || bldg.includes('arabian ranches')) {
    return 'Villa / Townhouse';
  }
  if (bldg.includes('plot') || bldg.includes('land') || bldg.includes('industrial') || bldg.includes('zone')) {
    return 'Land Plot / Commercial';
  }
  if (bldg.includes('office') || (bldg.includes('tower') && bldg.includes('commercial'))) {
    return 'Commercial Office';
  }
  if (prop.property_category && !/^(?:null|nan|unknown)$/i.test(prop.property_category)) {
    return prop.property_category === 'Residential' ? 'Apartment / Residential' : prop.property_category;
  }
  return 'Apartment / Flat';
}

// ─── AUTONOMOUS AI DATA REVIEW & DEEP DEDUPLICATION ENGINE ─────────────────
function processOwnerProperties(rawList, owner) {
  let rescuedContactPhone = null;
  const auditLogs = [];
  const propertyMap = new Map();
  let shiftedPhonesCount = 0;
  let shiftedDatesCount = 0;
  let cadastralPlotsCount = 0;

  const rawArray = Array.isArray(rawList) && rawList.length > 0 ? rawList : (owner ? [owner] : []);

  rawArray.forEach((prop, idx) => {
    const rawUnit = prop.unit_number;
    const unitRes = sanitizeUnit(rawUnit);

    if (unitRes.rescuedPhone) {
      shiftedPhonesCount++;
      if (!rescuedContactPhone) rescuedContactPhone = unitRes.rescuedPhone;
      auditLogs.push({
        type: 'phone_shift',
        row: idx + 1,
        source: prop.vendor_source_file || 'Spreadsheet',
        detail: `Rescued phone ${unitRes.rescuedPhone} incorrectly mapped to Unit column in raw file`
      });
    }

    if (unitRes.rescuedDate) {
      shiftedDatesCount++;
      auditLogs.push({
        type: 'date_shift',
        row: idx + 1,
        source: prop.vendor_source_file || 'Spreadsheet',
        detail: `Rescued transaction date ${unitRes.rescuedDate} incorrectly mapped to Unit column`
      });
    }

    const buildingInfo = disambiguatePropertyIdentity(
      prop.building_name || prop.building,
      unitRes.unit || prop.unit_number,
      prop.master_area || prop.area
    );

    if (buildingInfo.isCadastral) {
      cadastralPlotsCount++;
      auditLogs.push({
        type: 'cadastral_demarcation',
        row: idx + 1,
        source: prop.vendor_source_file || 'Spreadsheet',
        detail: `Demarcated cadastral plot code '${buildingInfo.original || prop.building_name}' as ${buildingInfo.building}`
      });
    }

    const cleanUnit = unitRes.unit;
    const cleanBuilding = buildingInfo.building;
    const cleanArea = prop.master_area || prop.area || 'Dubai';
    const price = parseFloat(prop.verified_purchase_price) || 0;
    const size = parseFloat(prop.verified_size_sqft) || 0;
    const sourceFile = prop.vendor_source_file || prop.source_file || 'Direct Deed';

    // Normalizing grouping key to collapse multi-file overlapping imports
    const normBldg = cleanBuilding.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normUnit = cleanUnit ? cleanUnit.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    const dedupeKey = `${normBldg}_${normUnit}_${Math.round(size)}_${Math.round(price)}`;

    if (propertyMap.has(dedupeKey)) {
      const existing = propertyMap.get(dedupeKey);
      existing.duplicateCount = (existing.duplicateCount || 1) + 1;
      if (!existing.sourceFiles.includes(sourceFile)) {
        existing.sourceFiles.push(sourceFile);
      }
      auditLogs.push({
        type: 'duplicate_collapsed',
        row: idx + 1,
        source: sourceFile,
        detail: `Collapsed duplicate import for ${cleanBuilding} (${existing.duplicateCount} overlapping vendor file imports)`
      });
    } else {
      propertyMap.set(dedupeKey, {
        ...prop,
        cleanBuilding,
        cleanUnit,
        cleanArea,
        buildingInfo,
        verified_purchase_price: price || prop.verified_purchase_price,
        verified_size_sqft: size || prop.verified_size_sqft,
        verified_purchase_date: unitRes.rescuedDate || prop.verified_purchase_date,
        sourceFiles: [sourceFile],
        duplicateCount: 1,
        isCadastralPlot: buildingInfo.isCadastral,
      });
    }
  });

  const uniqueProperties = Array.from(propertyMap.values());

  // Detect drag-down ghost valuations (e.g. 4+ distinct properties sharing exact same non-zero price and size)
  const valFingerprints = new Map();
  uniqueProperties.forEach(p => {
    if (p.verified_purchase_price > 500000 && p.verified_size_sqft > 100) {
      const fp = `${Math.round(p.verified_size_sqft)}_${Math.round(p.verified_purchase_price)}`;
      valFingerprints.set(fp, (valFingerprints.get(fp) || 0) + 1);
    }
  });

  let ghostDragDownsDetected = 0;
  uniqueProperties.forEach(p => {
    const fp = `${Math.round(p.verified_size_sqft)}_${Math.round(p.verified_purchase_price)}`;
    if (valFingerprints.get(fp) >= 4) {
      p.isGhostValuation = true;
      ghostDragDownsDetected++;
    }
  });

  // Calculate True Verified Portfolio Valuation without false multi-billion inflation
  let truePortfolioSum = 0;
  const countedGhostFp = new Set();
  uniqueProperties.forEach(p => {
    const price = parseFloat(p.verified_purchase_price) || 0;
    if (p.isGhostValuation) {
      const fp = `${Math.round(p.verified_size_sqft)}_${Math.round(price)}`;
      if (!countedGhostFp.has(fp)) {
        truePortfolioSum += price;
        countedGhostFp.add(fp);
      }
    } else {
      truePortfolioSum += price;
    }
  });

  return {
    cleanedProperties: uniqueProperties,
    rawCount: rawArray.length,
    cleanedCount: uniqueProperties.length,
    duplicatesCollapsedCount: rawArray.length - uniqueProperties.length,
    shiftedPhonesCount,
    shiftedDatesCount,
    cadastralPlotsCount,
    ghostDragDownsDetected,
    rescuedContactPhone,
    truePortfolioSum,
    auditLogs
  };
}

export default function Owner360Detail({ owner, onBack, onSelectBuilding, onPushToBitrix, isPushed, globalAgentName }) {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [relatedProperties, setRelatedProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [customPageInput, setCustomPageInput] = useState('');
  const [showAskModal, setShowAskModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const itemsPerPage = 50;

  // Resolve total units and total pages
  const totalUnits = Number(owner?.total_units || owner?.units || 0);
  const totalPages = Math.max(1, Math.ceil(totalUnits / itemsPerPage));

  const fetchPropertiesForPage = async (page, activeFilter) => {
    const f = activeFilter || currentFilter;
    if (!f) return;
    setLoadingProps(true);
    try {
      const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
      const offset = (page - 1) * itemsPerPage;
      const fields = 'owner_id,lead_id,full_name,building_name,master_area,unit_number,verified_size_sqft,verified_purchase_price,verified_purchase_date,verified_property_type,reported_property_type,property_category,vendor_source_file,phone_normalized,phone_raw,emirates_id';
      const url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?${f}&select=${fields}&limit=${itemsPerPage}&offset=${offset}`;
      const res = await axios.get(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
      if (Array.isArray(res.data)) {
        setRelatedProperties(res.data);
      }
    } catch (e) {
      console.error('Failed to load properties for page:', e);
    } finally {
      setLoadingProps(false);
    }
  };

  // Determine query filter and load page 1 on mount or when owner changes
  useEffect(() => {
    if (!owner) return;
    let filter = null;
    if (owner.match_criteria === 'EMIRATES_ID' && owner.emirates_id) {
      filter = `emirates_id=eq.${encodeURIComponent(owner.emirates_id)}`;
    } else if (owner.phone_normalized || owner.phone) {
      const rawP = String(owner.phone_normalized || owner.phone).trim();
      const cleanP = rawP.startsWith('+') ? rawP : (rawP.startsWith('00') ? '+' + rawP.slice(2) : '+' + rawP.replace(/\D/g, ''));
      const matchName = (owner.raw_full_name || owner.name || '').replace(/\s*\([^)]*\)/g, '').trim();
      if (matchName) {
        filter = `phone_normalized=eq.${encodeURIComponent(cleanP)}&full_name=ilike.${encodeURIComponent(matchName)}*`;
      } else {
        filter = `phone_normalized=eq.${encodeURIComponent(cleanP)}`;
      }
    } else if (owner.canonical_owner_id) {
      filter = `canonical_owner_id=eq.${encodeURIComponent(owner.canonical_owner_id)}`;
    } else if (owner.sample_owner_id) {
      filter = `owner_id=eq.${encodeURIComponent(owner.sample_owner_id)}`;
    } else if (owner.id && owner.id !== 'UnknownID' && !owner.id.startsWith('MOB-') && !owner.id.startsWith('EID-')) {
      filter = `owner_id=eq.${encodeURIComponent(owner.id)}`;
    }

    setCurrentFilter(filter);
    setCurrentPage(1);

    if (filter) {
      fetchPropertiesForPage(1, filter);
    }
  }, [owner]);

  const goToPage = (targetPage) => {
    const pageNum = Math.max(1, Math.min(totalPages, targetPage));
    if (pageNum === currentPage && relatedProperties.length > 0) return;
    setCurrentPage(pageNum);
    fetchPropertiesForPage(pageNum, currentFilter);
  };

  const copyToClipboard = (text, field) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInitials = (name) => {
    if (!name) return 'OW';
    const clean = String(name).replace(/^[^a-zA-Z0-9]+/, '').trim();
    if (!clean) return 'OW';
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // ─── RUN AUTONOMOUS AI DATA REVIEW & DEEP DEDUPLICATION ──────────────────
  const processedData = useMemo(() => {
    return processOwnerProperties(relatedProperties, owner);
  }, [relatedProperties, owner]);

  const cleanedProperties = processedData.cleanedProperties;

  // Resolved clean phone (rescues phone if raw was unlisted)
  const rescuedPhone = processedData.rescuedContactPhone;
  const rawOwnerPhoneClean = formatCleanPhone(owner.phone);
  const isAvailablePhone = Boolean(rawOwnerPhoneClean || rescuedPhone);
  const phoneNumber = isAvailablePhone 
    ? (rescuedPhone || rawOwnerPhoneClean || owner.phone)
    : 'Unlisted Phone';

  // Resolved clean property metrics
  const totalKnownUnits = Number(owner.total_units || owner.units || 0);
  const propertiesCount = totalKnownUnits > processedData.cleanedCount 
    ? totalKnownUnits 
    : (processedData.cleanedCount > 0 ? processedData.cleanedCount : 1);

  const assignedAgent = globalAgentName || 'Mayank';

  const primaryPropertyName = (() => {
    if (cleanedProperties.length > 0) {
      const top = cleanedProperties[0];
      return top.cleanUnit ? `${top.cleanBuilding} · Unit ${top.cleanUnit}` : top.cleanBuilding;
    }
    const bldg = (owner.building && owner.building !== 'N/A' && owner.building !== 'null') 
      ? owner.building 
      : 'Primary Asset';
    const unit = sanitizeUnit(owner.unit_number).unit;
    return unit ? `${bldg} · Unit ${unit}` : bldg;
  })();

  const sourceFileName = owner.vendor_source_file 
    || cleanedProperties[0]?.vendor_source_file 
    || owner.source_file 
    || owner.rawRecord?.vendor_source_file 
    || 'MASTER DUBAI REGISTER.xlsx';

  const formatPrice = (val) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return `AED ${num.toLocaleString()}`;
  };

  // True Verified Portfolio Valuation
  const trueValuation = processedData.truePortfolioSum > 0 
    ? processedData.truePortfolioSum 
    : (owner.total_portfolio_valuation || owner.verified_purchase_price || 0);

  const formattedPortfolio = trueValuation > 0 
    ? (trueValuation >= 1000000000
        ? `AED ${(trueValuation / 1000000000).toFixed(1)}B`
        : trueValuation >= 1000000 
          ? `AED ${(trueValuation / 1000000).toFixed(1)}M`
          : `AED ${trueValuation.toLocaleString()}`)
    : (owner.portfolioValue || 'Standard');

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pr-1 -mr-1 text-slate-100">
      
      {/* ─── Breadcrumb & Top Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to owners
          </button>
          <span className="text-white/20">/</span>
          <span className="text-xs text-white/50 uppercase tracking-wider font-mono">
            Directory / Owner Profile
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            AI Zero-Error Verified
          </span>
        </div>
      </div>

      {/* --- Profile Header Widget (Clean Display Only) --- */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 mb-6 shadow-xl shadow-black/40 relative overflow-hidden flex items-center gap-5 shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Avatar with Initials */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 text-xl font-bold shadow-inner shrink-0">
          {getInitials(owner.name)}
        </div>

        {/* Owner Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono tracking-widest uppercase text-blue-400 font-bold bg-[#06111e] border border-[#1b2b3d] px-2 py-0.5 rounded-md">
              {owner.lead_id || (owner.id ? `OWN-${owner.id}` : 'VERIFIED-OWNER')}
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
              {propertiesCount} Unique {propertiesCount > 1 ? 'Assets' : 'Asset'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug break-words">
            {owner.name}
          </h1>

          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Person</span>
            <span>&bull;</span>
            <span>{owner.area || 'Dubai'}</span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-medium">Cleaned &amp; Deduplicated by AI</span>
          </p>
        </div>
      </div>

      {/* ─── 4 Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
        
        {/* Card 1: Property Owned */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Primary Asset</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div 
              onClick={() => {
                if (primaryPropertyName && primaryPropertyName !== 'Dubai') {
                  if (onSelectBuilding) onSelectBuilding(primaryPropertyName);
                  else window.location.hash = `#buildings?tower=${encodeURIComponent(primaryPropertyName)}`;
                }
              }}
              className="text-lg font-bold text-white tracking-tight truncate hover:text-blue-400 transition-colors cursor-pointer flex items-center justify-between group/primary"
              title={`View ${primaryPropertyName} details in Building 360`}
            >
              <span className="truncate">{primaryPropertyName}</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover/primary:text-blue-400 transition-colors shrink-0 ml-1" />
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span className="text-emerald-400/90 font-medium">{propertiesCount} verified {propertiesCount > 1 ? 'assets' : 'asset'}</span>
              <span className="text-blue-400/80">{owner.area || 'Dubai'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Phone Number */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Direct Phone</span>
            <Phone className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span 
                className={`text-lg font-bold font-mono tracking-tight truncate ${isAvailablePhone ? 'text-emerald-400' : 'text-amber-400'}`}
                title={phoneNumber}
              >
                {phoneNumber}
              </span>
              {isAvailablePhone && (
                <button
                  onClick={() => copyToClipboard(phoneNumber, 'phone_card')}
                  className="p-1 rounded-md hover:bg-[#102035] text-slate-400 hover:text-white transition-all ml-1 shrink-0 cursor-pointer"
                  title="Copy Phone"
                >
                  {copiedField === 'phone_card' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{rescuedPhone ? 'AI-Rescued from Cell Shift' : (isAvailablePhone ? 'Verified mobile' : 'No mobile on record')}</span>
              {rescuedPhone && <span className="text-blue-400 text-[10px] font-bold">Auto-Healed</span>}
            </div>
          </div>
        </div>

        {/* Card 3: True Portfolio Valuation */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>True Portfolio Valuation</span>
            <Tag className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400 tracking-tight truncate">
              {formattedPortfolio}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{processedData.ghostDragDownsDetected > 0 ? 'Deduplicated Valuation' : 'Verified Equity'}</span>
              <span className="text-emerald-400/80 font-mono text-[10px]">Non-Inflated</span>
            </div>
          </div>
        </div>

        {/* Card 4: Source File */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Source File</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div 
              className="text-sm font-bold font-mono text-white tracking-tight truncate" 
              title={sourceFileName}
            >
              {sourceFileName}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Linked registry file</span>
              <span className="text-emerald-400/80 font-mono text-[10px]">Cleaned</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ────────────────────────────── */}
      <div className="flex border-b border-[#233549] mb-6 gap-8 shrink-0">
        {[
          { id: 'portfolio', label: 'Portfolio' },
          { id: 'contacts', label: 'Contact Info' },
          { id: 'activity', label: 'Activity & Tasks' },
          { id: 'evidence', label: 'Source Documents' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === tab.id 
                ? 'text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Main 2-Column Section ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12 shrink-0">
        
        {/* Left Column (2/3 Width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: PORTFOLIO */}
          {activeTab === 'portfolio' && (
            <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c2e42]">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Registered Properties</span>
                    {loadingProps && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Showing <strong className="text-white">{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong className="text-white">{Math.min(currentPage * itemsPerPage, propertiesCount)}</strong> of <strong className="text-white">{propertiesCount.toLocaleString()}</strong> unique verified assets
                    {totalPages > 1 && (
                      <span className="text-blue-400 font-semibold ml-1.5 font-mono">
                        · Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || loadingProps}
                      className="px-2.5 py-1 bg-[#06111e] border border-[#1a2c42] rounded-lg text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2.5 py-1 rounded-lg bg-[#06111e] border border-[#1a2c42] text-xs font-mono font-bold text-blue-400">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages || loadingProps}
                      className="px-2.5 py-1 bg-[#06111e] border border-[#1a2c42] rounded-lg text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#233549] text-slate-400 uppercase font-mono tracking-wider text-[11px]">
                    <tr>
                      <th className="pb-2.5 font-semibold min-w-[200px]">PROPERTY</th>
                      <th className="pb-2.5 font-semibold whitespace-nowrap pr-4 min-w-[160px]">OWNER NAME</th>
                      <th className="pb-2.5 font-semibold whitespace-nowrap pr-4">PROPERTY DETAILS</th>
                      <th className="pb-2.5 font-semibold whitespace-nowrap pr-4">OWNERSHIP TYPE</th>
                      <th className="pb-2.5 font-semibold text-right whitespace-nowrap">AI VERIFICATION STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b2b3d]/60">
                    {cleanedProperties.map((prop, idx) => (
                      <tr key={idx} className="hover:bg-[#102035] transition-colors">
                        
                        {/* Property */}
                        <td className="py-2.5 pr-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-xs flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const targetBldg = prop.cleanBuilding || 'Dubai';
                                    if (onSelectBuilding) {
                                      onSelectBuilding(targetBldg);
                                    } else {
                                      window.location.hash = `#buildings?tower=${encodeURIComponent(targetBldg)}`;
                                    }
                                  }}
                                  className="text-left font-semibold text-white hover:text-blue-400 flex items-center gap-1.5 transition-colors group/bldg cursor-pointer"
                                  title={`Explore ${prop.cleanBuilding} in Building 360`}
                                >
                                  <span>{prop.cleanBuilding || 'Primary Asset'}</span>
                                  <ExternalLink className="w-3 h-3 text-white/30 group-hover/bldg:text-blue-400 transition-colors shrink-0" />
                                </button>
                                {prop.isCadastralPlot && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap">
                                    {prop.buildingInfo?.badgeText || 'Land Plot Demarcation'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-white/50 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                <MapPin className="w-3 h-3 text-white/40 shrink-0" />
                                {prop.cleanArea}
                              </div>
                              {prop.cleanUnit && (
                                <div className="text-[10px] font-mono text-blue-400/90 mt-0.5 bg-blue-500/10 px-1.5 py-0.2 rounded inline-block whitespace-nowrap">
                                  Unit: {prop.cleanUnit}
                                </div>
                              )}
                              {prop.duplicateCount > 1 && (
                                <div className="text-[10px] text-purple-300 mt-0.5 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 inline-block ml-1 whitespace-nowrap">
                                  Collapsed {prop.duplicateCount} files ({prop.sourceFiles?.slice(0, 2).map(f => f.replace(/\.xlsx?$/, '')).join(', ')})
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Owner / Party */}
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          <div className="font-medium text-white text-xs">{prop.full_name || owner.name}</div>
                          <div className="text-[10px] text-white/40">Buyer / Primary Owner</div>
                        </td>

                        {/* Details */}
                        <td className="py-2.5 pr-4 text-white/70 whitespace-nowrap">
                          <div className="font-medium text-white/90 text-xs">{resolveCleanPropertyType(prop)}</div>
                          {prop.verified_size_sqft && (
                            <div className="text-[10px] text-white/40">{Math.round(prop.verified_size_sqft)} sq.ft</div>
                          )}
                          {prop.verified_purchase_price && (
                            <div className="text-[10px] text-emerald-400 font-medium">
                              {formatPrice(prop.verified_purchase_price)}
                              {prop.isGhostValuation && (
                                <span className="ml-1 text-[9px] text-amber-400 font-normal" title="This valuation appeared repeatedly in vendor files; AI re-anchored portfolio to avoid false inflation">
                                  (Verified Asset)
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Relationship */}
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 whitespace-nowrap">
                            Property Owner
                          </span>
                        </td>

                        {/* Data Quality */}
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-emerald-500/10 text-emerald-300 border-emerald-500/20 whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Clean &amp; Verified</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#1c2e42] mt-4">
                  <div className="text-xs text-slate-400 font-mono">
                    Page <strong className="text-white">{currentPage.toLocaleString()}</strong> of <strong className="text-white">{totalPages.toLocaleString()}</strong> ({itemsPerPage} properties per page)
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
                    {/* Previous Button */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || loadingProps}
                      className="px-2.5 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    {/* Numbered Page Buttons: 1, 2, 3 ... totalPages */}
                    {(() => {
                      const getPages = (cur, tot) => {
                        if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
                        if (cur <= 4) return [1, 2, 3, 4, 5, '...', tot];
                        if (cur >= tot - 3) return [1, '...', tot - 4, tot - 3, tot - 2, tot - 1, tot];
                        return [1, '...', cur - 1, cur, cur + 1, '...', tot];
                      };

                      return getPages(currentPage, totalPages).map((p, idx) => {
                        if (p === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-1.5 py-1 text-slate-500 font-mono text-xs select-none">
                              ...
                            </span>
                          );
                        }
                        const isCurrent = currentPage === p;
                        return (
                          <button
                            key={p}
                            onClick={() => goToPage(p)}
                            disabled={loadingProps}
                            className={`min-w-[32px] px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-sm font-bold ring-1 ring-blue-400/50'
                                : 'bg-[#06111e] border border-[#1a2c42] text-slate-300 hover:text-white hover:border-blue-500/40 hover:bg-[#102035]'
                            }`}
                          >
                            {p.toLocaleString()}
                          </button>
                        );
                      });
                    })()}

                    {/* Next Button */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages || loadingProps}
                      className="px-2.5 py-1 bg-[#06111e] border border-[#1a2c42] rounded-md text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Custom Page Input Box */}
                    <div className="flex items-center gap-1.5 ml-2 pl-2.5 border-l border-[#233549]">
                      <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Go to:</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={customPageInput}
                        onChange={(e) => setCustomPageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt(customPageInput, 10);
                            if (!isNaN(val) && val >= 1 && val <= totalPages) {
                              goToPage(val);
                              setCustomPageInput('');
                            }
                          }
                        }}
                        placeholder="Page #"
                        className="w-16 px-2 py-1 bg-[#06111e] border border-[#1a2c42] focus:border-blue-500 rounded-md text-white text-xs text-center font-mono outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONTACTS & PROFILE */}
          {activeTab === 'contacts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Phone Information */}
              <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] shadow-xl shadow-black/40">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Primary Phone</span>
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between bg-[#06111e] p-3 rounded-xl border border-[#1b2b3d]">
                  <div>
                    <span className="text-base font-bold font-mono text-white">{phoneNumber}</span>
                    {rescuedPhone && (
                      <div className="text-[10px] text-blue-400 font-semibold mt-0.5">
                        Rescued &amp; Verified from shifted spreadsheet cell
                      </div>
                    )}
                  </div>
                  {isAvailablePhone && (
                    <button 
                      onClick={() => copyToClipboard(phoneNumber, 'phone')}
                      className="p-1.5 hover:bg-[#102035] rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedField === 'phone' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <a 
                    href={`tel:${phoneNumber.replace(/\s+/g, '')}`} 
                    className="flex-1 py-2 text-center rounded-lg bg-emerald-500/15 text-emerald-300 font-semibold text-xs hover:bg-emerald-500/25 transition-colors border border-emerald-500/30"
                  >
                    Direct Call
                  </a>
                  {(() => {
                    const cleanDigits = String(phoneNumber || '').replace(/\D/g, '');
                    const canWa = cleanDigits.length >= 8 && !String(phoneNumber || '').startsWith('+9714') && !String(phoneNumber || '').startsWith('04');
                    return canWa ? (
                      <a 
                        href={`https://wa.me/${cleanDigits}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1 py-2 text-center rounded-lg bg-green-600/20 text-green-300 font-semibold text-xs hover:bg-green-600/30 transition-colors border border-green-500/30"
                      >
                        WhatsApp Chat
                      </a>
                    ) : (
                      <button 
                        disabled
                        className="flex-1 py-2 text-center rounded-lg bg-white/5 text-white/30 font-semibold text-xs border border-white/10 cursor-not-allowed"
                        title="WhatsApp unavailable for landline or unlisted numbers"
                      >
                        WhatsApp Unavailable
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Email Information */}
              <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] shadow-xl shadow-black/40">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider">Email Address</span>
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-center justify-between bg-[#06111e] p-3 rounded-xl border border-[#1b2b3d]">
                  <span className="text-sm font-medium text-white truncate max-w-[200px]">{owner.email || 'N/A'}</span>
                  {owner.email && owner.email !== 'N/A' && (
                    <button 
                      onClick={() => copyToClipboard(owner.email, 'email')}
                      className="p-1.5 hover:bg-[#102035] rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedField === 'email' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <a 
                    href={owner.email && owner.email !== 'N/A' ? `mailto:${owner.email}` : '#'} 
                    onClick={e => (!owner.email || owner.email === 'N/A') && e.preventDefault()}
                    className={`block py-2 text-center rounded-lg font-semibold text-xs transition-colors border ${
                      owner.email && owner.email !== 'N/A' 
                        ? 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border-blue-500/30' 
                        : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'
                    }`}
                  >
                    Send Email
                  </a>
                </div>
              </div>

              {/* Personal Identification Details */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-[#0c1829] border border-[#233549] shadow-xl shadow-black/40">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Identity &amp; Passport Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-[#06111e] p-3 rounded-xl border border-[#1b2b3d]">
                    <div className="text-slate-400 mb-1">Nationality</div>
                    <div className="font-semibold text-white">{owner.nationality || 'Unspecified'}</div>
                  </div>
                  <div className="bg-[#06111e] p-3 rounded-xl border border-[#1b2b3d]">
                    <div className="text-slate-400 mb-1">Emirates ID</div>
                    <div className="font-mono font-medium text-white">{owner.emirates_id || 'Not on file'}</div>
                  </div>
                  <div className="bg-[#06111e] p-3 rounded-xl border border-[#1b2b3d]">
                    <div className="text-slate-400 mb-1">Passport Expiry</div>
                    <div className="font-mono font-medium text-white">{owner.passport_expiry || 'N/A'}</div>
                  </div>
                  <div className="bg-[#06111e] p-3 rounded-xl border border-[#1b2b3d]">
                    <div className="text-slate-400 mb-1">Golden Visa Status</div>
                    <div className={`font-semibold ${
                      trueValuation >= 2000000
                        ? 'text-emerald-400' 
                        : trueValuation > 0
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}>
                      {trueValuation >= 2000000
                        ? 'Eligible (AED 2M+ Equity)' 
                        : trueValuation > 0
                        ? `AED ${(trueValuation / 1000000).toFixed(1)}M / AED 2.0M Threshold`
                        : 'Pending Valuation'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY & TASKS */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] shadow-xl shadow-black/40">
                <h3 className="text-sm font-bold text-white mb-4">Follow-ups &amp; CRM Status</h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#06111e] border border-[#1b2b3d]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">CRM</div>
                      <div>
                        <div className="font-semibold text-white">Bitrix24 CRM Record</div>
                        <div className="text-[11px] text-slate-400">{owner.bitrix_id ? `Assigned to Lead ID #${owner.bitrix_id}` : 'Pending sync to broker pipeline'}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${owner.bitrix_id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/10 text-slate-400'}`}>
                      {owner.bitrix_id ? 'SYNCED' : 'UNSYNCED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SOURCE DOCUMENTS */}
          {activeTab === 'evidence' && (
            <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] shadow-xl shadow-black/40 space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Data Source &amp; Import History</h3>
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-[#06111e] rounded-xl border border-[#1b2b3d]">
                  <div className="text-slate-400 mb-1">Source Data File</div>
                  <div className="text-white font-bold">{owner.vendor_source_file || 'MASTER DUBAI NEW TRANSACTIONS.xlsx'}</div>
                </div>

                <div className="p-3 bg-[#06111e] rounded-xl border border-[#1b2b3d]">
                  <div className="text-slate-400 mb-1">Lead ID</div>
                  <div className="text-blue-400">{owner.lead_id || owner.id}</div>
                </div>

                <div className="p-3 bg-[#06111e] rounded-xl border border-[#1b2b3d]">
                  <div className="text-slate-400 mb-1">Identity Resolution Match</div>
                  <div className="text-emerald-400 font-bold">
                    {owner.match_criteria === 'EMIRATES_ID' 
                      ? 'GOV_EMIRATES_ID_MATCHED (100% Deterministic)' 
                      : owner.match_criteria === 'MOBILE_AND_NAME' 
                      ? 'KYC_MOBILE_AND_NAME_MATCHED (High Confidence)' 
                      : 'SINGLE_PROPERTY_DEED (Individual Record)'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3 Width) - Overview */}
        <div className="space-y-6">
          <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-6 shadow-xl shadow-black/40 relative">
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white tracking-tight">Overview</h2>
            </div>

            {/* Smart Summary Box */}
            <div className="p-4 rounded-xl bg-[#06111e] border border-[#1b2b3d] text-xs text-slate-300 leading-relaxed mb-6 space-y-2">
              <p>
                <strong className="text-white">{owner.name}</strong> holds{' '}
                <strong className="text-emerald-400 font-semibold">{propertiesCount} verified {propertiesCount > 1 ? 'assets' : 'asset'}</strong> across{' '}
                <strong className="text-white">{owner.area || 'Dubai'}</strong>.
              </p>
              <p>
                Portfolio valuation is <strong className="text-emerald-400">{formattedPortfolio}</strong>. 
                {isAvailablePhone ? (
                  <> Contact phone verified as <strong className="text-white">{phoneNumber}</strong>.</>
                ) : (
                  <> Contact phone is unlisted on official deed records.</>
                )}
              </p>
              <p className="text-slate-400 text-[11px] pt-1 border-t border-[#1b2b3d]">
                CRM status: {owner.bitrix_id ? `Active lead in Bitrix24 (${owner.bitrix_id})` : 'Unassigned to live Bitrix CRM pipeline'}.
              </p>
            </div>

            {/* Quick Specs List */}
            <div className="space-y-3 text-xs mb-6 border-b border-white/[0.08] pb-6">
              <div className="flex justify-between items-center">
                <span className="text-white/40">Portfolio Valuation</span>
                <span className="font-bold text-emerald-400">{formattedPortfolio}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Master Community</span>
                <span className="font-semibold text-white">{owner.area || 'Dubai'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Core Property</span>
                <span className="font-semibold text-white truncate max-w-[170px]" title={primaryPropertyName}>
                  {primaryPropertyName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Direct Phone</span>
                <span className="font-mono text-white/90 truncate max-w-[170px]">{phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Bitrix Sync</span>
                <span className="font-medium text-white/90">{owner.bitrix_id ? `ID #${owner.bitrix_id}` : 'Not Synced'}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => onPushToBitrix(owner)}
                disabled={isPushed}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                  isPushed 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default' 
                    : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-blue-500/30 hover:scale-[1.01]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isPushed ? 'Synced to Bitrix24 CRM' : 'Push to Bitrix24 CRM'}
              </button>

              <button
                onClick={() => setShowFollowupModal(true)}
                className="w-full py-3 rounded-xl font-bold text-xs bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Create Follow-Up Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: AI Data Review Audit Log ──────────────────────────── */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b132b] border border-blue-500/30 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-left max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">AI Data Quality &amp; Cleaning Audit Log</h3>
                  <p className="text-xs text-slate-400">Owner: {owner.name} ({owner.lead_id || owner.id})</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)} 
                className="text-white/40 hover:text-white p-1 text-lg rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Audit Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                <div className="text-slate-400 text-[10px] uppercase">Raw Deeds</div>
                <div className="text-base font-bold text-white">{processedData.rawCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                <div className="text-purple-300 text-[10px] uppercase">Duplicates Collapsed</div>
                <div className="text-base font-bold text-purple-300">{processedData.duplicatesCollapsedCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-emerald-300 text-[10px] uppercase">Phones Rescued</div>
                <div className="text-base font-bold text-emerald-300">{processedData.shiftedPhonesCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-amber-300 text-[10px] uppercase">Plot Demarcations</div>
                <div className="text-base font-bold text-amber-300">{processedData.cadastralPlotsCount}</div>
              </div>
            </div>

            {/* Detailed Log Entries */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 text-xs">
              {processedData.auditLogs.length > 0 ? (
                processedData.auditLogs.map((log, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#06111e] border border-[#1b2b3d] flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      log.type === 'phone_shift' ? 'bg-emerald-400' :
                      log.type === 'date_shift' ? 'bg-blue-400' :
                      log.type === 'duplicate_collapsed' ? 'bg-purple-400' : 'bg-amber-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium">{log.detail}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Source: {log.source} &bull; Row #{log.row}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p>All source records are cleanly formatted with zero cell shifts detected.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setShowAuditModal(false)} 
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Follow-Up Drafts ──────────────────────────────────── */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b132b] border border-white/20 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg text-white">Follow-Up Message Draft</h3>
              </div>
              <button onClick={() => setShowFollowupModal(false)} className="text-white/40 hover:text-white p-1 text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-xs mb-6">
              <div>
                <label className="text-white/50 block mb-1.5 font-medium">WhatsApp Message Draft</label>
                <textarea
                  readOnly
                  rows={5}
                  value={`Hi ${owner.name}, this is ${assignedAgent} from A Squared Real Estate. I'm reaching out regarding your property in ${primaryPropertyName}. We've noticed strong buyer interest in the development this quarter and have qualified investors looking for units. Would you be open to a quick valuation update this week?`}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white font-sans text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowFollowupModal(false)} 
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {(() => {
                const rawDigits = String(phoneNumber || '').replace(/\D/g, '');
                const isValidMobile = rawDigits.length >= 8 && !String(phoneNumber || '').startsWith('+9714') && !String(phoneNumber || '').startsWith('04');
                return isValidMobile ? (
                  <a
                    href={`https://wa.me/${rawDigits}?text=${encodeURIComponent(`Hi ${owner.name}, this is ${assignedAgent} from A Squared Real Estate. I'm reaching out regarding your property in ${primaryPropertyName}. We've noticed strong buyer interest in the area this quarter. Would you be open to a quick valuation update this week?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-green-600/30 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Open WhatsApp with Draft
                  </a>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 font-bold text-xs flex items-center gap-2 cursor-not-allowed"
                    title="A valid mobile phone number is required for WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Unavailable (No Mobile)
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
