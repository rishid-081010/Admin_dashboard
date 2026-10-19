import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Building2, User, Users, UserCheck, FileText, Sparkles, 
  Phone, Mail, MapPin, CheckCircle2, AlertCircle, 
  Copy, ExternalLink, ShieldCheck, ChevronDown, Send, MessageSquare, 
  HelpCircle, Bot, Share2, Layers, Tag
} from 'lucide-react';
import axios from 'axios';

export default function Owner360Detail({ owner, onBack, onPushToBitrix, isPushed, globalAgentName }) {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [relatedProperties, setRelatedProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

// Helper to sanitize unit numbers and strip DOB dates
function sanitizeUnitNumber(rawUnit) {
  if (!rawUnit || rawUnit === 'N/A' || rawUnit === 'null' || rawUnit === '-') return null;
  const str = String(rawUnit).trim();
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    return null;
  }
  const cleaned = str.replace(/[-_,\s]+$/, '');
  return cleaned || null;
}

  // Fetch all related properties for this owner across Dubai from Supabase
  useEffect(() => {
    const fetchRelated = async () => {
      if (!owner) return;
      setLoadingProps(true);
      try {
        const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
        
        let filter = null;
        if (owner.match_criteria === 'EMIRATES_ID' && owner.emirates_id) {
          filter = `emirates_id=eq.${encodeURIComponent(owner.emirates_id)}`;
        } else if (owner.match_criteria === 'MOBILE_AND_NAME' && owner.phone_normalized && (owner.raw_full_name || owner.name)) {
          const matchName = owner.raw_full_name || owner.name;
          filter = `phone_normalized=eq.${encodeURIComponent(owner.phone_normalized)}&full_name=eq.${encodeURIComponent(matchName)}`;
        } else if (owner.sample_owner_id) {
          filter = `owner_id=eq.${encodeURIComponent(owner.sample_owner_id)}`;
        } else if (owner.id && owner.id !== 'UnknownID' && !owner.id.startsWith('MOB-') && !owner.id.startsWith('EID-')) {
          filter = `owner_id=eq.${encodeURIComponent(owner.id)}`;
        } else if (owner.phone && owner.phone !== 'N/A' && !owner.phone.startsWith('+9714') && !owner.phone.startsWith('04')) {
          filter = `phone_normalized=eq.${encodeURIComponent(String(owner.phone).trim())}`;
        }

        if (filter) {
          setCurrentFilter(filter);
          const url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?${filter}&select=*&limit=50&offset=0`;
          const res = await axios.get(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
          if (Array.isArray(res.data) && res.data.length > 0) {
            setRelatedProperties(res.data);
            const totalUnits = Number(owner.total_units || owner.units) || res.data.length;
            setHasMore(res.data.length === 50 && (totalUnits > 50 || res.data.length < totalUnits));
          } else {
            setRelatedProperties([]);
            setHasMore(false);
          }
        }
      } catch (e) {
        console.error('Failed to load related properties:', e);
      } finally {
        setLoadingProps(false);
      }
    };
    fetchRelated();
  }, [owner]);

  const handleLoadMore = async () => {
    if (!currentFilter || loadingMore) return;
    setLoadingMore(true);
    try {
      const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
      const offset = relatedProperties.length;
      const url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?${currentFilter}&select=*&limit=50&offset=${offset}`;
      const res = await axios.get(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const nextList = [...relatedProperties, ...res.data];
        setRelatedProperties(nextList);
        const totalUnits = Number(owner.total_units || owner.units) || 0;
        setHasMore(res.data.length === 50 && (totalUnits === 0 || nextList.length < totalUnits));
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more properties:', e);
    } finally {
      setLoadingMore(false);
    }
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

  const totalUnits = Number(owner.total_units || owner.units);
  const propertiesCount = (totalUnits && totalUnits > 0) ? totalUnits : (relatedProperties.length > 0 ? relatedProperties.length : 1);
  const isAvailablePhone = owner.phone && owner.phone !== 'N/A' && owner.phone !== 'null';
  const assignedAgent = globalAgentName || 'Mayank';

  const primaryPropertyName = (() => {
    const bldg = (owner.building && owner.building !== 'N/A' && owner.building !== 'null') 
      ? owner.building 
      : (relatedProperties[0]?.building_name || relatedProperties[0]?.building || 'Primary Asset');
    const rawUnit = owner.unit_number || relatedProperties[0]?.unit_number;
    const unit = sanitizeUnitNumber(rawUnit);
    return unit ? `${bldg} · Unit ${unit}` : bldg;
  })();

  const phoneNumber = isAvailablePhone ? owner.phone : 'Unlisted Phone';

  const sourceFileName = owner.vendor_source_file 
    || relatedProperties[0]?.vendor_source_file 
    || owner.source_file 
    || owner.rawRecord?.vendor_source_file 
    || 'MASTER DUBAI REGISTER.xlsx';

  // Format purchase price or portfolio
  const formatPrice = (val) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return `AED ${num.toLocaleString()}`;
  };

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
            Live Sync
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
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Verified Owner
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
            <span className="text-slate-500">Verified Ownership Records</span>
          </p>
        </div>
      </div>

      {/* ─── 4 Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
        
        {/* Card 1: Property Owned */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Property Owned</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div 
              className="text-xl font-bold text-white tracking-tight truncate"
              title={primaryPropertyName}
            >
              {primaryPropertyName}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{propertiesCount} registered unit{propertiesCount > 1 ? 's' : ''}</span>
              <span className="text-blue-400/80">{owner.area || 'Dubai'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Phone Number */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Phone Number</span>
            <Phone className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span 
                className={`text-xl font-bold font-mono tracking-tight truncate ${isAvailablePhone ? 'text-emerald-400' : 'text-amber-400'}`}
                title={phoneNumber}
              >
                {phoneNumber}
              </span>
              {isAvailablePhone && (
                <button
                  onClick={() => copyToClipboard(owner.phone, 'phone_card')}
                  className="p-1 rounded-md hover:bg-[#102035] text-slate-400 hover:text-white transition-all ml-1 shrink-0"
                  title="Copy Phone"
                >
                  {copiedField === 'phone_card' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {isAvailablePhone ? 'Mobile number verified' : 'No mobile on record'}
            </div>
          </div>
        </div>

        {/* Card 3: Assigned Broker */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Assigned Broker</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight truncate" title={assignedAgent}>
              {assignedAgent}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Primary broker assigned
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
              <span className="text-emerald-400/80 font-mono text-[10px]">Verified</span>
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
            className={`pb-3 text-sm font-semibold transition-all relative ${
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
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Registered Properties</h2>
                  {propertiesCount > 1 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Showing {relatedProperties.length} of {propertiesCount} registered {propertiesCount > 1 ? 'units' : 'unit'}
                    </p>
                  )}
                </div>
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMore ? 'Loading Next 50...' : 'Load Next 50 Units'}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#233549] text-slate-400 uppercase font-mono tracking-wider">
                    <tr>
                      <th className="pb-3 font-semibold">PROPERTY</th>
                      <th className="pb-3 font-semibold">OWNER NAME</th>
                      <th className="pb-3 font-semibold">PROPERTY DETAILS</th>
                      <th className="pb-3 font-semibold">OWNERSHIP TYPE</th>
                      <th className="pb-3 font-semibold text-right">VERIFICATION STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b2b3d]/60">
                    {(relatedProperties.length > 0 ? relatedProperties : [owner]).map((prop, idx) => (
                      <tr key={idx} className="hover:bg-[#102035] transition-colors">
                        
                        {/* Property */}
                        <td className="py-4 pr-3">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">
                                {prop.building_name || prop.building || 'Primary Asset'}
                              </div>
                              <div className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-white/40" />
                                {prop.master_area || prop.area || 'Dubai'}
                              </div>
                              {sanitizeUnitNumber(prop.unit_number) && (
                                <div className="text-[10px] font-mono text-blue-400/90 mt-1 bg-blue-500/10 px-1.5 py-0.5 rounded inline-block">
                                  Unit: {sanitizeUnitNumber(prop.unit_number)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Owner / Party */}
                        <td className="py-4 pr-3">
                          <div className="font-medium text-white">{prop.full_name || owner.name}</div>
                          <div className="text-[11px] text-white/40">Buyer / Primary Owner</div>
                        </td>

                        {/* Details */}
                        <td className="py-4 pr-3 text-white/70">
                          <div>{prop.reported_property_type || prop.property_type || 'Apartment / Flat'}</div>
                          {prop.verified_size_sqft && (
                            <div className="text-[11px] text-white/40">{Math.round(prop.verified_size_sqft)} sq.ft</div>
                          )}
                          {prop.verified_purchase_price && (
                            <div className="text-[11px] text-emerald-400 font-medium">{formatPrice(prop.verified_purchase_price)}</div>
                          )}
                        </td>

                        {/* Relationship */}
                        <td className="py-4 pr-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            Property Owner
                          </span>
                        </td>

                        {/* Data Quality */}
                        <td className="py-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-blue-500/10 text-blue-300 border-blue-500/20">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasMore && (
                <div className="mt-4 pt-4 border-t border-[#1b2b3d] flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Loaded <strong className="text-white">{relatedProperties.length}</strong> of{' '}
                    <strong className="text-white">{propertiesCount}</strong> units
                  </div>
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {loadingMore ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Loading Next 50 Units...</span>
                      </>
                    ) : (
                      <span>Load Next 50 Units</span>
                    )}
                  </button>
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
                  <span className="text-base font-bold font-mono text-white">{owner.phone || 'N/A'}</span>
                  <button 
                    onClick={() => copyToClipboard(owner.phone, 'phone')}
                    className="p-1.5 hover:bg-[#102035] rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedField === 'phone' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <a 
                    href={`tel:${owner.phone}`} 
                    className="flex-1 py-2 text-center rounded-lg bg-emerald-500/15 text-emerald-300 font-semibold text-xs hover:bg-emerald-500/25 transition-colors border border-emerald-500/30"
                  >
                    Direct Call
                  </a>
                  <a 
                    href={`https://wa.me/${String(owner.phone).replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 py-2 text-center rounded-lg bg-green-600/20 text-green-300 font-semibold text-xs hover:bg-green-600/30 transition-colors border border-green-500/30"
                  >
                    WhatsApp Chat
                  </a>
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
                  <button 
                    onClick={() => copyToClipboard(owner.email, 'email')}
                    className="p-1.5 hover:bg-[#102035] rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedField === 'email' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-3">
                  <a 
                    href={`mailto:${owner.email}`} 
                    className="block py-2 text-center rounded-lg bg-blue-500/15 text-blue-300 font-semibold text-xs hover:bg-blue-500/25 transition-colors border border-blue-500/30"
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
                      (owner.total_portfolio_valuation || owner.verified_purchase_price || 0) >= 2000000
                        ? 'text-emerald-400' 
                        : (owner.total_portfolio_valuation || owner.verified_purchase_price || 0) > 0
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}>
                      {(owner.total_portfolio_valuation || owner.verified_purchase_price || 0) >= 2000000
                        ? 'Eligible (AED 2M+ Equity)' 
                        : (owner.total_portfolio_valuation || owner.verified_purchase_price || 0) > 0
                        ? `AED ${((owner.total_portfolio_valuation || owner.verified_purchase_price) / 1000000).toFixed(1)}M / AED 2.0M Threshold`
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
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Profile Summary
              </span>
            </div>

            {/* Smart Summary Box */}
            <div className="p-4 rounded-xl bg-[#06111e] border border-[#1b2b3d] text-xs text-slate-300 leading-relaxed mb-6 space-y-2">
              <p>
                <strong className="text-white">{owner.name}</strong> is currently linked to{' '}
                <strong className="text-white">{propertiesCount} {propertiesCount > 1 ? 'properties' : 'property'}</strong> across{' '}
                <strong className="text-white">{owner.area || 'Dubai'}</strong>.
              </p>
              <p>
                Estimated portfolio tier is <strong className="text-emerald-400">{owner.portfolioValue || 'Standard'}</strong>. Contact availability is verified through source records with phone <strong className="text-white">{owner.phone || 'N/A'}</strong>.
              </p>
              <p className="text-slate-400 text-[11px] pt-1 border-t border-[#1b2b3d]">
                CRM status: {owner.bitrix_id ? `Active lead in Bitrix24 (${owner.bitrix_id})` : 'Unassigned to live Bitrix CRM pipeline'}.
              </p>
            </div>

            {/* Quick Specs List */}
            <div className="space-y-3 text-xs mb-6 border-b border-white/[0.08] pb-6">
              <div className="flex justify-between items-center">
                <span className="text-white/40">Portfolio Tier</span>
                <span className="font-bold text-emerald-400">{owner.portfolioValue || 'Standard'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Master Community</span>
                <span className="font-semibold text-white">{owner.area || 'Dubai'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Core Building</span>
                <span className="font-semibold text-white">{owner.building || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Direct Phone</span>
                <span className="font-mono text-white/90">{owner.phone || 'N/A'}</span>
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
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
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
                className="w-full py-3 rounded-xl font-bold text-xs bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Create Follow-Up Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: Ask About Owner ───────────────────────────────────── */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b132b] border border-white/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg text-white">Profile Summary: {owner.name}</h3>
              </div>
              <button onClick={() => setShowAskModal(false)} className="text-white/40 hover:text-white p-1 text-lg">✕</button>
            </div>

            <div className="space-y-3 text-xs text-white/80 mb-6 bg-white/[0.03] p-4 rounded-xl border border-white/10 leading-relaxed">
              <p>
                <strong>Investor Profile:</strong> Likely high-net-worth individual or institutional buyer holding properties in <strong>{owner.area || 'Dubai'}</strong>.
              </p>
              <p>
                <strong>Outreach Strategy:</strong> Recommended to approach via WhatsApp first referencing their unit in <strong>{owner.building || 'their development'}</strong> with recent comparative sales analysis.
              </p>
              <p>
                <strong>Golden Visa Potential:</strong> If portfolio value exceeds AED 2.0M, offer Golden Visa advisory assistance to establish immediate rapport.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAskModal(false)} 
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => { setShowAskModal(false); setShowFollowupModal(true); }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
              >
                Draft Outreach Message
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
              <button onClick={() => setShowFollowupModal(false)} className="text-white/40 hover:text-white p-1 text-lg">✕</button>
            </div>

            <div className="space-y-4 text-xs mb-6">
              <div>
                <label className="text-white/50 block mb-1.5 font-medium">WhatsApp Message Draft</label>
                <textarea
                  readOnly
                  rows={5}
                  value={`Hi ${owner.name}, this is ${assignedAgent} from A Squared Real Estate. I'm reaching out regarding your property in ${owner.building || owner.area || 'Dubai'}. We've noticed strong buyer interest in the building this quarter and have qualified investors looking for units. Would you be open to a quick valuation update this week?`}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-white font-sans text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowFollowupModal(false)} 
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              {(() => {
                const rawDigits = String(owner.phone || '').replace(/\D/g, '');
                const isValidMobile = rawDigits.length >= 8 && !String(owner.phone || '').startsWith('+9714') && !String(owner.phone || '').startsWith('04');
                return isValidMobile ? (
                  <a
                    href={`https://wa.me/${rawDigits}?text=${encodeURIComponent(`Hi ${owner.name}, this is ${assignedAgent} from A Squared Real Estate. I'm reaching out regarding your property in ${owner.building || owner.area || 'Dubai'}. We've noticed strong buyer interest in the building this quarter. Would you be open to a quick valuation update this week?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-green-600/30"
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
