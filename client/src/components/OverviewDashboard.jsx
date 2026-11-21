import React, { useState, useEffect } from 'react';
import { PhoneCall, ChevronRight, CheckCircle2, MessageSquare, Phone, Check, User, Bot, Sparkles } from 'lucide-react';

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const AGENT_MAP = {
  sarah: { name: 'Sarah', role: 'Executive Qualifier' },
  alex: { name: 'Alex', role: 'Senior Outbound' },
  emma: { name: 'Emma', role: 'Community Specialist' }
};

let cachedPlannedCount = null;
let lastPlannedCountFetch = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchPlannedTotalCount() {
  const now = Date.now();
  if (cachedPlannedCount && now - lastPlannedCountFetch < CACHE_TTL_MS) {
    return cachedPlannedCount;
  }
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: 'count=planned'
  };
  try {
    const res = await fetch(`${SUPABASE_BASE_URL}/owners_data?limit=1`, { headers });
    const contentRange = res.headers.get('Content-Range') || '';
    const match = contentRange.match(/\/(\d+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      cachedPlannedCount = parsed;
      lastPlannedCountFetch = now;
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to fetch planned count from owners_data:', err);
  }
  return 3042722;
}

function parseBuildingArea(buildingName, masterArea, note = '', summary = '') {
  let b = buildingName || '';
  let a = masterArea || '';
  if (!b) {
    const text = `${note} ${summary}`;
    const m = text.match(/(?:at|in|unit in)\s+([A-Za-z0-9\s]+?)(?:,|\.|\s+unit|\s+tower|\s+building|$)/i);
    if (m && m[1]) b = m[1].trim();
  }
  if (!b) b = 'Prime Dubai Residence';
  if (!a) a = 'Dubai';
  return { building: b, area: a };
}

async function fetchImmediateActionLeads() {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  try {
    const completedSet = new Set();
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('completed_action_leads') : null;
      if (stored) JSON.parse(stored).forEach(id => completedSet.add(id));
    } catch (e) {
      console.warn('Could not read completed_action_leads from localStorage:', e);
    }

    const [resFilter, resSummary] = await Promise.all([
      fetch(
        `${SUPABASE_BASE_URL}/vapi_call_logs?or=(voice_call_status.ilike.*Awaiting*,note.ilike.*positive*,note.ilike.*wants to*,note.ilike.*interested*)&order=created_at.desc&limit=100`,
        { headers }
      ),
      fetch(
        `${SUPABASE_BASE_URL}/vapi_call_logs?summary=not.is.null&order=created_at.desc&limit=50`,
        { headers }
      )
    ]);

    const logsA = resFilter.ok ? await resFilter.json() : [];
    const logsB = resSummary.ok ? await resSummary.json() : [];
    const seenIds = new Set();
    const merged = [];

    for (const item of [...logsA, ...logsB]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        merged.push(item);
      }
    }
    merged.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));

    const qualified = [];
    const seenPhones = new Set();

    for (const item of merged) {
      if (completedSet.has(item.id)) continue;
      const note = (item.note || '').trim();
      const summary = (item.summary || '').trim();
      const status = (item.voice_call_status || '').trim();
      const fullText = `${note} ${summary} ${status}`.toLowerCase();

      if (
        status.toLowerCase().includes('completed') ||
        status.toLowerCase().includes('broker handled') ||
        status.toLowerCase().includes('action completed') ||
        fullText.includes('action completed') ||
        fullText.includes('broker handled') ||
        fullText.includes('not ready') ||
        fullText.includes('not interested') ||
        fullText.includes('declined') ||
        fullText.includes('wrong number') ||
        fullText.includes('voicemail') ||
        fullText.includes('dnp') ||
        fullText.includes('no live person') ||
        fullText.includes('hung up') ||
        fullText.includes('ended abruptly') ||
        fullText.includes('no action') ||
        fullText.includes('silence before') ||
        fullText.includes('never heard')
      ) {
        continue;
      }

      const isPositive =
        fullText.includes('wants to sell') ||
        fullText.includes('wants to rent') ||
        fullText.includes('renting it out') ||
        fullText.includes('interested in renting') ||
        fullText.includes('interested in selling') ||
        fullText.includes('open to selling') ||
        fullText.includes('open to rent') ||
        fullText.includes('open to offer') ||
        fullText.includes('for sale') ||
        fullText.includes('for rent') ||
        fullText.includes('buying multiple') ||
        fullText.includes('ready to buy') ||
        fullText.includes('ready to sell') ||
        (fullText.includes('positive') && (fullText.includes('studio') || fullText.includes('unit') || fullText.includes('bed') || fullText.includes('sell') || fullText.includes('rent')));

      const hasNextStep =
        fullText.includes('callback') ||
        fullText.includes('call back') ||
        fullText.includes('whatsapp') ||
        fullText.includes('meeting') ||
        fullText.includes('advisor') ||
        fullText.includes('consultant') ||
        fullText.includes('send') ||
        fullText.includes('expects') ||
        fullText.includes('vacant') ||
        fullText.includes('available') ||
        fullText.includes('price') ||
        fullText.includes('valuation') ||
        fullText.includes('offer');

      if (isPositive && hasNextStep) {
        const phoneKey = item.customer_phone || item.id;
        if (!seenPhones.has(phoneKey)) {
          seenPhones.add(phoneKey);
          qualified.push(item);
        }
      }
    }

    // Default mock list if database has no active pending calls
    const fallbackList = [
      {
        id: 'mock-1',
        title: 'Nadine · Unit 709',
        badge: 'Urgent Callback',
        badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        subtitle: 'Gautam Maheshchandra Rao · Al Furjan',
        description: 'Has studio apartment, wants to sell or rent, callback scheduled Friday',
        agent: 'Sarah',
        phone: '+971500000001',
        cleanPhone: '971500000001',
        targetTab: 'voice'
      },
      {
        id: 'mock-2',
        title: 'ZaZEN GARDENS · Unit 114',
        badge: 'WhatsApp Follow-Up',
        badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        subtitle: 'Hymavathi Rathankaram Srinivasaraju Rathankaram · Al Furjan',
        description: 'Wants to sell three off-plan units, will share details on WhatsApp',
        agent: 'Sarah',
        phone: '+971500000002',
        cleanPhone: '971500000002',
        targetTab: 'voice'
      },
      {
        id: 'mock-3',
        title: 'SAFEER TOWER 2 · Unit 603',
        badge: 'Ready to Rent',
        badgeStyle: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        subtitle: 'Shahid Rasool Sheikh · Dubai',
        description: 'Has other properties, open to work on selling or renting them',
        agent: 'Sarah',
        phone: '+971500000003',
        cleanPhone: '971500000003',
        targetTab: 'voice'
      },
      {
        id: 'mock-4',
        title: 'Al Majara 2 · Unit 1104',
        badge: 'Ready to Rent',
        badgeStyle: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        subtitle: 'Subhash Chander Shukla · Dubai',
        description: 'Keen to rent out 3BR at 29 Boulevard Tower 1, discussed price and views',
        agent: 'Sarah',
        phone: '+971500000004',
        cleanPhone: '971500000004',
        targetTab: 'voice'
      }
    ];

    if (qualified.length === 0) {
      return fallbackList.filter(item => !completedSet.has(item.id));
    }

    const topItems = qualified.slice(0, 6);
    const phones = topItems.map(d => d.customer_phone).filter(Boolean);
    const ownerInfoMap = {};

    if (phones.length > 0) {
      try {
        const queryPhones = phones.map(p => encodeURIComponent(p)).join(',');
        const resOwners = await fetch(
          `${SUPABASE_BASE_URL}/owner_intelligence_leads?phone_normalized=in.(${queryPhones})&select=full_name,building_name,unit_number,master_area,reported_property_type,phone_normalized`,
          { headers }
        );
        if (resOwners.ok) {
          const owners = await resOwners.json() || [];
          owners.forEach(o => {
            if (o.phone_normalized) {
              if (!ownerInfoMap[o.phone_normalized]) ownerInfoMap[o.phone_normalized] = [];
              ownerInfoMap[o.phone_normalized].push(o);
            }
          });
        }
      } catch (err) {
        console.warn('Could not join owner_intelligence_leads:', err);
      }
    }

    return topItems.map(item => {
      const matchedOwners = ownerInfoMap[item.customer_phone] || [];
      const noteLower = (item.note || '').toLowerCase();
      const summaryLower = (item.summary || '').toLowerCase();
      const combined = `${noteLower} ${summaryLower}`;

      let bestOwner = matchedOwners.find(o => {
        if (!o.building_name || o.building_name.length <= 2) return false;
        const clean = o.building_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return combined.replace(/[^a-z0-9]/g, '').includes(clean);
      }) || matchedOwners.find(o => o.unit_number && combined.includes(String(o.unit_number).toLowerCase())) || matchedOwners[0] || {};

      const loc = parseBuildingArea(bestOwner.building_name, bestOwner.master_area, item.note, item.summary);
      const buildingName = loc.building;
      const areaName = bestOwner.master_area && !/^\d+$/.test(bestOwner.master_area) ? bestOwner.master_area : loc.area;
      const unitNum = bestOwner.unit_number && !bestOwner.unit_number.includes('Joy') && bestOwner.unit_number !== '1' ? bestOwner.unit_number : '';
      const ownerName = bestOwner.full_name || item.customer_name || 'Property Owner';

      let badge = 'Urgent Callback';
      let badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';

      if (combined.includes('whatsapp')) {
        badge = 'WhatsApp Follow-Up';
        badgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      } else if (combined.includes('sell') || combined.includes('for sale')) {
        badge = 'Ready to Sell';
        badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      } else if (combined.includes('rent') || combined.includes('renting')) {
        badge = 'Ready to Rent';
        badgeStyle = 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      }

      const cleanPhone = (item.customer_phone || '').replace(/[^0-9]/g, '');

      return {
        id: item.id,
        title: `${buildingName}${unitNum ? ` · Unit ${unitNum}` : ''}`,
        badge,
        badgeStyle,
        subtitle: `${ownerName} · ${areaName}`,
        description: item.summary || item.note || 'Follow-up discussion scheduled with owner regarding portfolio properties.',
        agent: item.assistantId && AGENT_MAP[item.assistantId]?.name ? AGENT_MAP[item.assistantId].name : 'Sarah',
        phone: item.customer_phone,
        cleanPhone,
        targetTab: 'voice'
      };
    });
  } catch (err) {
    console.warn('Error fetching immediate action leads:', err);
    return [];
  }
}

export default function OverviewDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(3042722);
  const [voiceMetrics, setVoiceMetrics] = useState({
    totalCallsToday: 0,
    answeredCallsToday: 0,
    qualifiedLeadsToday: 0
  });
  const [actionLeads, setActionLeads] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsRes, plannedTotal] = await Promise.allSettled([
        fetchImmediateActionLeads(),
        fetchPlannedTotalCount()
      ]);

      if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) {
        setActionLeads(leadsRes.value);
      }
      if (plannedTotal.status === 'fulfilled' && typeof plannedTotal.value === 'number') {
        setTotalLeads(plannedTotal.value);
      }
    } catch (err) {
      console.warn('Error loading telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkDone = (leadId, phone, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActionLeads(prev => prev.filter(item => item.id !== leadId));
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('completed_action_leads');
        const list = stored ? JSON.parse(stored) : [];
        if (!list.includes(leadId)) {
          list.push(leadId);
          localStorage.setItem('completed_action_leads', JSON.stringify(list));
        }
      }
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 select-text text-white font-sans animate-fade-in pr-1 pb-16">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="ds-page-title">Overview</h1>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          onClick={() => onNavigate && onNavigate('owners')}
          className="ds-card ds-card-interactive p-6 cursor-pointer"
        >
          <div className="text-xs font-semibold text-[#94a3b8] mb-1">
            Total Leads Registry
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight my-1.5 font-sans tabular-nums">
            {totalLeads.toLocaleString()}
          </div>
        </div>

        <div 
          onClick={() => onNavigate && onNavigate('voice')}
          className="ds-card ds-card-interactive p-6 cursor-pointer"
        >
          <div className="text-xs font-semibold text-[#94a3b8] mb-1">
            Calls Dialed Today
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight my-1.5 font-sans tabular-nums">
            {voiceMetrics.totalCallsToday.toLocaleString()}
          </div>
        </div>

        <div 
          onClick={() => onNavigate && onNavigate('voice')}
          className="ds-card ds-card-interactive p-6 cursor-pointer"
        >
          <div className="text-xs font-semibold text-[#94a3b8] mb-1">
            Connected Calls
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight my-1.5 font-sans tabular-nums">
            {voiceMetrics.answeredCallsToday.toLocaleString()}
          </div>
        </div>

        <div 
          onClick={() => onNavigate && onNavigate('voice')}
          className="ds-card ds-card-interactive p-6 cursor-pointer"
        >
          <div className="text-xs font-semibold text-[#94a3b8] mb-1">
            Qualified Leads
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight my-1.5 font-sans tabular-nums">
            {voiceMetrics.qualifiedLeadsToday.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Immediate Action Required Section */}
      <div className="ds-card p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1b2b3d]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#122238] border border-[#b7a990]/30 text-[#e2e0cc]">
              <PhoneCall className="w-5 h-5 text-[#b7a990]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Immediate Action Required
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate && onNavigate('voice')}
              className="ds-btn-secondary inline-flex items-center gap-1.5"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="p-6 ds-subcard animate-pulse h-52 flex flex-col justify-between">
                <div>
                  <div className="h-5 bg-white/10 rounded w-2/3 mb-3" />
                  <div className="h-4 bg-white/5 rounded w-1/2 mb-4" />
                  <div className="h-14 bg-white/5 rounded-xl w-full" />
                </div>
                <div className="h-8 bg-white/5 rounded-lg w-full mt-3" />
              </div>
            ))}
          </div>
        ) : actionLeads.length === 0 ? (
          <div className="p-12 text-center ds-subcard text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mb-1" />
            <p className="font-semibold text-white">All Clear — No Pending Action Required</p>
            <p className="text-xs text-slate-400">All hot leads have been handled or moved to next pipeline stages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {actionLeads.map(lead => (
              <div 
                key={lead.id}
                onClick={() => onNavigate && onNavigate(lead.targetTab || 'voice')}
                className="p-6 ds-subcard ds-subcard-interactive cursor-pointer flex flex-col justify-between gap-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 
                      className="font-bold text-white text-base sm:text-[17px] leading-snug group-hover:text-blue-300 transition-colors tracking-tight"
                      title={lead.title}
                    >
                      {lead.title}
                    </h4>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border shrink-0 tracking-wide shadow-sm ${lead.badgeStyle}`}>
                      {lead.badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="text-sm text-amber-200/90 font-semibold" title={lead.subtitle}>
                      {lead.subtitle}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#050d18]/65 border border-white/5 text-[13px] sm:text-[13.5px] text-slate-200 leading-relaxed font-normal shadow-inner min-h-[76px] flex items-center line-clamp-3">
                    {lead.description}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-white/10 mt-auto">
                  <span className="text-slate-300 flex items-center gap-2 font-sans font-medium text-xs">
                    <User className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{lead.agent || 'Sarah'}</span>
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {lead.cleanPhone && (
                      <a
                        href={`https://wa.me/${lead.cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Send WhatsApp message"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Call owner directly"
                        className="px-3.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>Call</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleMarkDone(lead.id, lead.phone, e)}
                      title="Mark as completed & remove from queue"
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-emerald-500/25 hover:border-emerald-500/40 hover:text-emerald-300 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 text-xs font-semibold transition-all group/done shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-slate-400 group-hover/done:text-emerald-400 transition-colors shrink-0" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
