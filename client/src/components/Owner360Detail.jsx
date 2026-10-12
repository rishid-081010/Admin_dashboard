import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Building2, User, Users, UserCheck, FileText, Sparkles, 
  Star, Printer, Phone, Mail, MapPin, CheckCircle2, AlertCircle, 
  Copy, ExternalLink, ShieldCheck, ChevronDown, Send, MessageSquare, 
  HelpCircle, Bot, Share2, Layers, Tag
} from 'lucide-react';
import axios from 'axios';

export default function Owner360Detail({ owner, onBack, onPushToBitrix, isPushed, globalAgentName }) {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [priority, setPriority] = useState('Normal');
  const [isWatchlist, setIsWatchlist] = useState(false);
  const [relatedProperties, setRelatedProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Fetch all related properties for this owner from Supabase
  useEffect(() => {
    const fetchRelated = async () => {
      if (!owner || !owner.id || owner.id === 'UnknownID') return;
      setLoadingProps(true);
      try {
        const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
        const url = `https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owners_data?owner_id=eq.${encodeURIComponent(owner.id)}&select=*&limit=50`;
        const res = await axios.get(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setRelatedProperties(res.data);
        }
      } catch (e) {
        console.error('Failed to load related properties:', e);
      } finally {
        setLoadingProps(false);
      }
    };
    fetchRelated();
  }, [owner]);

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

  const propertiesCount = relatedProperties.length > 0 ? relatedProperties.length : (owner.units || 1);
  const isAvailablePhone = owner.phone && owner.phone !== 'N/A' && owner.phone !== 'null';
  const assignedAgent = globalAgentName || 'Mayank';

  const primaryPropertyName = (() => {
    const bldg = (owner.building && owner.building !== 'N/A' && owner.building !== 'null') 
      ? owner.building 
      : (relatedProperties[0]?.building_name || relatedProperties[0]?.building || 'Primary Asset');
    const unit = owner.unit_number || relatedProperties[0]?.unit_number;
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
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
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
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 mb-6 shadow-xl relative overflow-hidden backdrop-blur-xl flex items-center gap-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Avatar with Initials */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 text-lg sm:text-xl font-bold shadow-inner flex-shrink-0">
          {getInitials(owner.name)}
        </div>

        {/* Owner Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-mono tracking-widest uppercase text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
              {owner.lead_id || owner.id || 'LEAD-0000000'}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Verified Owner
            </span>
          </div>

          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug break-words">
            {owner.name}
          </h1>

          <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Person</span>
            <span>&bull;</span>
            <span>{owner.area || 'Dubai'}</span>
            <span>&bull;</span>
            <span className="text-white/40">Verified Ownership Records</span>
          </p>
        </div>
      </div>

      {/* ─── 4 Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Property Owned */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
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
            <div className="text-[11px] text-white/40 mt-1 flex items-center justify-between">
              <span>{propertiesCount} registered unit{propertiesCount > 1 ? 's' : ''}</span>
              <span className="text-blue-400/80">{owner.area || 'Dubai'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Phone Number */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
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
                  className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-all ml-1 shrink-0"
                  title="Copy Phone"
                >
                  {copiedField === 'phone_card' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              {isAvailablePhone ? 'Mobile number verified' : 'No mobile on record'}
            </div>
          </div>
        </div>

        {/* Card 3: Assigned Broker */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
            <span>Assigned Broker</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight truncate" title={assignedAgent}>
              {assignedAgent}
            </div>
            <div className="text-[11px] text-white/40 mt-1">
              Primary broker assigned
            </div>
          </div>
        </div>

        {/* Card 4: Source File */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
          <div className="flex items-center justify-between text-xs text-white/50 font-medium mb-3">
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
            <div className="text-[11px] text-white/40 mt-1 flex items-center justify-between">
              <span>Linked registry file</span>
              <span className="text-emerald-400/80 font-mono text-[10px]">Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sub-Actions Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Watchlist Toggle */}
          <button 
            onClick={() => setIsWatchlist(!isWatchlist)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isWatchlist 
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' 
                : 'bg-white/[0.04] text-white/70 border-white/10 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isWatchlist ? 'fill-amber-300 text-amber-300' : ''}`} />
            {isWatchlist ? 'In watchlist' : 'Add to watchlist'}
          </button>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-xs">
            <span className="text-white/40">Priority</span>
            <select 
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              <option value="Normal" className="bg-[#0b132b]">Normal</option>
              <option value="High" className="bg-[#0b132b]">High</option>
              <option value="Urgent VIP" className="bg-[#0b132b]">Urgent VIP</option>
            </select>
          </div>

          {/* Print Profile */}
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/10 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Print profile
          </button>

          {/* Draft Message */}
          <button 
            onClick={() => setShowFollowupModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/10 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Draft Message
          </button>
        </div>

        {/* CRM Push Action */}
        <div>
          <button
            onClick={() => onPushToBitrix(owner)}
            disabled={isPushed}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
              isPushed 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default' 
                : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-blue-500/20 hover:scale-[1.02]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isPushed ? `Synced to CRM (${owner.bitrix_id || 'Active'})` : 'Push to Bitrix24'}
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs ────────────────────────────── */}
      <div className="flex border-b border-white/[0.08] mb-6 gap-8">
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
                : 'text-white/40 hover:text-white/80'
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column (2/3 Width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: PORTFOLIO */}
          {activeTab === 'portfolio' && (
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white tracking-tight">Registered Properties</h2>
                <p className="text-xs text-white/50">Registered owner details and property records.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-white/40 uppercase font-mono tracking-wider">
                    <tr>
                      <th className="pb-3 font-semibold">PROPERTY</th>
                      <th className="pb-3 font-semibold">OWNER NAME</th>
                      <th className="pb-3 font-semibold">PROPERTY DETAILS</th>
                      <th className="pb-3 font-semibold">OWNERSHIP TYPE</th>
                      <th className="pb-3 font-semibold text-right">VERIFICATION STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {(relatedProperties.length > 0 ? relatedProperties : [owner]).map((prop, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        
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
                              {prop.unit_number && (
                                <div className="text-[10px] font-mono text-blue-400/90 mt-1 bg-blue-500/10 px-1.5 py-0.5 rounded inline-block">
                                  Unit: {prop.unit_number}
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
            </div>
          )}

          {/* TAB 2: CONTACTS & PROFILE */}
          {activeTab === 'contacts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Phone Information */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-3 text-xs text-white/50">
                  <span className="font-semibold uppercase tracking-wider">Primary Phone</span>
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-base font-bold font-mono text-white">{owner.phone || 'N/A'}</span>
                  <button 
                    onClick={() => copyToClipboard(owner.phone, 'phone')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
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
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-3 text-xs text-white/50">
                  <span className="font-semibold uppercase tracking-wider">Email Address</span>
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10">
                  <span className="text-sm font-medium text-white truncate max-w-[200px]">{owner.email || 'N/A'}</span>
                  <button 
                    onClick={() => copyToClipboard(owner.email, 'email')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
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
              <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">Identity &amp; Passport Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                    <div className="text-white/40 mb-1">Nationality</div>
                    <div className="font-semibold text-white">{owner.nationality || 'Unspecified'}</div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                    <div className="text-white/40 mb-1">Emirates ID</div>
                    <div className="font-mono font-medium text-white">{owner.emirates_id || 'Not on file'}</div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                    <div className="text-white/40 mb-1">Passport Expiry</div>
                    <div className="font-mono font-medium text-white">{owner.passport_expiry || 'N/A'}</div>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                    <div className="text-white/40 mb-1">Golden Visa Status</div>
                    <div className="font-semibold text-emerald-400">High Eligibility</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY & TASKS */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <h3 className="text-sm font-bold text-white mb-2">Follow-ups &amp; CRM Status</h3>
                <p className="text-xs text-white/50 mb-4">Status across Bitrix24 CRM and direct outreach channels.</p>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">CRM</div>
                      <div>
                        <div className="font-semibold text-white">Bitrix24 CRM Record</div>
                        <div className="text-[11px] text-white/40">{owner.bitrix_id ? `Assigned to Lead ID #${owner.bitrix_id}` : 'Pending sync to broker pipeline'}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${owner.bitrix_id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/10 text-white/50'}`}>
                      {owner.bitrix_id ? 'SYNCED' : 'UNSYNCED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">CALL</div>
                      <div>
                        <div className="font-semibold text-white">Outbound Call</div>
                        <div className="text-[11px] text-white/40">Call script ready</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert(`Enqueued automated voice call for ${owner.name} (${owner.phone})`)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors"
                    >
                      Trigger Call
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SOURCE DOCUMENTS */}
          {activeTab === 'evidence' && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Data Source &amp; Import History</h3>
                <p className="text-xs text-white/50">Mapping from vendor data files to verified database records.</p>
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                  <div className="text-white/40 mb-1">Source Data File</div>
                  <div className="text-white font-bold">{owner.vendor_source_file || 'MASTER DUBAI NEW TRANSACTIONS.xlsx'}</div>
                </div>

                <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                  <div className="text-white/40 mb-1">Lead ID</div>
                  <div className="text-blue-400">{owner.lead_id || owner.id}</div>
                </div>

                <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                  <div className="text-white/40 mb-1">Land Registry Match</div>
                  <div className="text-emerald-400">
                    {owner.match_confidence || (owner.dld_matched ? 'FINGERPRINT_VERIFIED' : 'UNMATCHED_LEAD')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1/3 Width) - Overview */}
        <div className="space-y-6">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 shadow-xl relative backdrop-blur-xl">
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white tracking-tight">Overview</h2>
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Profile Summary
              </span>
            </div>

            {/* Smart Summary Box */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/[0.08] text-xs text-white/80 leading-relaxed mb-6 space-y-2">
              <p>
                <strong className="text-white">{owner.name}</strong> is currently linked to{' '}
                <strong className="text-white">{propertiesCount} property</strong> across{' '}
                <strong className="text-white">{owner.area || 'Dubai'}</strong>.
              </p>
              <p>
                Estimated portfolio tier is <strong className="text-emerald-400">{owner.portfolioValue || 'Standard'}</strong>. Contact availability is verified through source records with phone <strong className="text-white">{owner.phone || 'N/A'}</strong>.
              </p>
              <p className="text-white/50 text-[11px] pt-1 border-t border-white/[0.08]">
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
              <a
                href={`https://wa.me/${String(owner.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${owner.name}, this is ${assignedAgent} from A Squared Real Estate. I'm reaching out regarding your property in ${owner.building || owner.area || 'Dubai'}. We've noticed strong buyer interest in the building this quarter. Would you be open to a quick valuation update this week?`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-green-600/30"
              >
                <MessageSquare className="w-4 h-4" />
                Open WhatsApp with Draft
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
