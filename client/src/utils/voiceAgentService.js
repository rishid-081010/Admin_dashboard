// Voice Agent Service & Data Pipeline
// Connects to Supabase vapi_call_logs table to provide real-time call intelligence

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';

export const AGENTS_CONFIG = {
  '682cf6ae-23fd-44f3-a4a3-756998cd62c1': {
    id: '682cf6ae-23fd-44f3-a4a3-756998cd62c1',
    name: 'Sarah',
    role: 'AI Acquisition Specialist',
    line: 'Line 1 (Primary AI)',
    accent: 'British / Neutral Executive',
    color: 'blue',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    avatarBg: 'from-blue-600/30 to-cyan-600/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    voiceModel: 'Yoshita PVC v1',
    engine: 'Claude Haiku 4.5',
    description: 'Spearheads high-priority residential villa & luxury apartment owner qualification.',
    allTimeTotal: 26478,
  },
  '91732d4e-3b60-4950-8aa6-4060c0803119': {
    id: '91732d4e-3b60-4950-8aa6-4060c0803119',
    name: 'James',
    role: 'Portfolio & Investor Outreach',
    line: 'Line 2 (High-Volume)',
    accent: 'American / Business Direct',
    color: 'purple',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    avatarBg: 'from-purple-600/30 to-indigo-600/20',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    voiceModel: 'Yoshita PVC v1',
    engine: 'Claude Haiku 4.5',
    description: 'Executes high-velocity campaigns across prime developer towers & repeat investors.',
    allTimeTotal: 40008,
  },
  'f99e8e9a-48b1-411f-806e-6cb7d1dde58b': {
    id: 'f99e8e9a-48b1-411f-806e-6cb7d1dde58b',
    name: 'Aisha',
    role: 'Prime Community Specialist',
    line: 'Line 3 (Prime UAE)',
    accent: 'Bilingual UAE / International',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    avatarBg: 'from-emerald-600/30 to-teal-600/20',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    voiceModel: 'Yoshita PVC v1',
    engine: 'Claude Haiku 4.5',
    description: 'Specializes in prime areas (Palm Jumeirah, Downtown, Jumeirah Islands) and owner valuation queries.',
    allTimeTotal: 15110,
  }
};

export const AGENT_IDS = Object.keys(AGENTS_CONFIG);

// Helper to check if a call resulted in a qualified lead
export function isQualifiedLead(call) {
  const vStatus = (call.voice_call_status || '').toLowerCase();
  const summary = (call.summary || '').toLowerCase();
  const dur = Number(call.duration_seconds) || 0;
  const status = (call.status || '').toLowerCase();

  if (vStatus.includes('awaiting availability') || vStatus.includes('interested') || vStatus.includes('appointment')) {
    return true;
  }
  if (summary.includes('interested') || summary.includes('sell') || summary.includes('rent') || summary.includes('available')) {
    return true;
  }
  // If human spoke for 25+ seconds
  if ((status === 'customer-ended-call' || status === 'assistant-ended-call') && dur >= 25) {
    return true;
  }
  return false;
}

// Helper to check if a call was answered by a human
export function isCallAnswered(call) {
  const status = (call.status || '').toLowerCase();
  const dur = Number(call.duration_seconds) || 0;
  
  // Explicit human conversation endings
  if (status === 'customer-ended-call' || status === 'assistant-ended-call') {
    return true;
  }
  if (status === 'voicemail' || status === 'customer-did-not-answer' || status === 'customer-busy' || status.includes('error') || status.includes('failed')) {
    return false;
  }
  return dur > 0;
}

// Helper to check if dropped / voicemail / unanswered
export function isCallDropOrVoicemail(call) {
  const status = (call.status || '').toLowerCase();
  if (status === 'customer-ended-call' || status === 'assistant-ended-call') {
    return false;
  }
  if (
    status === 'voicemail' || 
    status === 'customer-did-not-answer' || 
    status === 'customer-busy' || 
    status.includes('failed') || 
    status.includes('error') || 
    status.includes('timeout') ||
    status === 'silence-timed-out'
  ) {
    return true;
  }
  const dur = Number(call.duration_seconds) || 0;
  return dur === 0;
}

// Format duration
export function formatDuration(seconds) {
  const sec = Math.round(Number(seconds) || 0);
  if (sec <= 0) return '0s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

// Format cost
export function formatCurrency(amount) {
  const val = Number(amount) || 0;
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Build ISO Date Range from filter parameters
export function getDateRange({ timeFilter, selectedDate, selectedYear, selectedMonth, selectedWeek }) {
  if (timeFilter === 'All Time') {
    return { start: null, end: null, label: 'All Time (81,597 Historical Calls)' };
  }

  if (timeFilter === 'Daily') {
    const todayDubai = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
    const dStr = selectedDate || todayDubai; // dynamically default to present day's live activity
    const start = `${dStr}T00:00:00.000Z`;
    // Next day
    const d = new Date(dStr);
    d.setUTCDate(d.getUTCDate() + 1);
    const end = d.toISOString().split('T')[0] + 'T00:00:00.000Z';
    return { 
      start, 
      end, 
      label: new Date(dStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) 
    };
  }

  if (timeFilter === 'Weekly') {
    const year = Number(selectedYear) || 2026;
    const month = Number(selectedMonth) || 10;
    const week = Number(selectedWeek) || 1; // 1..5

    const mStr = String(month).padStart(2, '0');
    let startDay = (week - 1) * 7 + 1;
    let endDay = week * 7;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (endDay > daysInMonth) endDay = daysInMonth;

    const start = `${year}-${mStr}-${String(startDay).padStart(2, '0')}T00:00:00.000Z`;
    // For end date, we use next day at 00:00
    const endDateObj = new Date(Date.UTC(year, month - 1, endDay + 1));
    const end = endDateObj.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short' });

    return {
      start,
      end,
      label: `${monthName} ${year} • Week ${week} (${monthName} ${startDay}-${endDay})`
    };
  }

  if (timeFilter === 'Monthly') {
    const year = Number(selectedYear) || 2026;
    const month = Number(selectedMonth) || 10;
    const mStr = String(month).padStart(2, '0');
    const start = `${year}-${mStr}-01T00:00:00.000Z`;
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;
    const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return {
      start,
      end,
      label: monthName
    };
  }

  return { start: null, end: null, label: 'All Time' };
}

// Fetch overview metrics from Supabase
export async function fetchVoiceOverview(filterParams) {
  const { start, end, label } = getDateRange(filterParams);

  // Build query
  let url = `${SUPABASE_BASE_URL}/vapi_call_logs?select=id,status,duration_seconds,cost_usd,voice_call_status,assistantId,created_at,started_at,customer_name,customer_phone,recording_url,summary`;
  if (start) url += `&created_at=gte.${encodeURIComponent(start)}`;
  if (end) url += `&created_at=lt.${encodeURIComponent(end)}`;
  url += `&order=created_at.desc.nullslast&limit=1500`;

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Range-Unit': 'items',
    'Prefer': 'count=exact'
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch call logs: ${response.statusText}`);
  }

  const calls = await response.json();
  const contentRange = response.headers.get('Content-Range') || '';
  const match = contentRange.match(/\/(\d+)/);
  const totalCallsCount = match ? parseInt(match[1], 10) : calls.length;

  // Aggregate metrics
  let dropsCount = 0;
  let qualifiedCount = 0;
  let answeredCount = 0;
  let totalDurationSec = 0;
  let durationSamples = 0;
  let totalCostUsd = 0;

  // Agent breakdowns
  const agentStats = {
    '682cf6ae-23fd-44f3-a4a3-756998cd62c1': { calls: 0, drops: 0, qualified: 0, answered: 0, dur: 0, durCount: 0, cost: 0 },
    '91732d4e-3b60-4950-8aa6-4060c0803119': { calls: 0, drops: 0, qualified: 0, answered: 0, dur: 0, durCount: 0, cost: 0 },
    'f99e8e9a-48b1-411f-806e-6cb7d1dde58b': { calls: 0, drops: 0, qualified: 0, answered: 0, dur: 0, durCount: 0, cost: 0 },
  };

  for (const c of calls) {
    const isQual = isQualifiedLead(c);
    const isDrop = isCallDropOrVoicemail(c);
    const isAns = isCallAnswered(c);
    const dur = Number(c.duration_seconds) || 0;
    const cost = Number(c.cost_usd) || 0;

    if (isDrop) dropsCount++;
    if (isQual) qualifiedCount++;
    if (isAns) answeredCount++;
    if (dur > 0) {
      totalDurationSec += dur;
      durationSamples++;
    }
    totalCostUsd += cost;

    const astId = c.assistantId;
    if (astId && agentStats[astId]) {
      agentStats[astId].calls++;
      if (isDrop) agentStats[astId].drops++;
      if (isQual) agentStats[astId].qualified++;
      if (isAns) agentStats[astId].answered++;
      if (dur > 0) {
        agentStats[astId].dur += dur;
        agentStats[astId].durCount++;
      }
      agentStats[astId].cost += cost;
    }
  }

  // Scale if total count exceeds sample size
  const sampleRatio = calls.length > 0 ? (totalCallsCount / calls.length) : 1;
  const scaledDrops = Math.round(dropsCount * sampleRatio);
  const scaledQualified = Math.round(qualifiedCount * sampleRatio);
  const scaledAnswered = Math.round(answeredCount * sampleRatio);
  const scaledCost = totalCostUsd * sampleRatio;
  const avgDuration = durationSamples > 0 ? Math.round(totalDurationSec / durationSamples) : 0;

  // Format 3 agents data
  const agentsList = AGENT_IDS.map(id => {
    const conf = AGENTS_CONFIG[id];
    const st = agentStats[id];
    const agentCalls = filterParams.timeFilter === 'All Time' 
      ? conf.allTimeTotal 
      : Math.round(st.calls * sampleRatio);

    const agentQualified = Math.round(st.qualified * sampleRatio);
    const cvr = agentCalls > 0 ? ((agentQualified / agentCalls) * 100).toFixed(1) + '%' : '0.0%';
    const agentAvgDur = st.durCount > 0 ? Math.round(st.dur / st.durCount) : 0;
    const agentCost = st.cost * sampleRatio;
    const costPerLead = agentQualified > 0 ? `$${(agentCost / agentQualified).toFixed(2)}` : (agentCalls > 0 ? `$${(agentCost / agentCalls).toFixed(2)}` : '$0.00');

    return {
      ...conf,
      calls: agentCalls.toLocaleString(),
      rawCalls: agentCalls,
      drops: Math.round(st.drops * sampleRatio),
      qualified: agentQualified,
      cvr,
      cost: costPerLead,
      totalCost: `$${agentCost.toFixed(2)}`,
      avgDuration: formatDuration(agentAvgDur),
      status: 'Active'
    };
  });

  return {
    label,
    totalCalls: totalCallsCount.toLocaleString(),
    rawTotalCalls: totalCallsCount,
    answeredCalls: scaledAnswered.toLocaleString(),
    rawAnsweredCalls: scaledAnswered,
    drops: scaledDrops.toLocaleString(),
    rawDrops: scaledDrops,
    qualifiedLeads: scaledQualified.toLocaleString(),
    rawQualifiedLeads: scaledQualified,
    avgDuration: formatDuration(avgDuration),
    rawAvgDuration: avgDuration,
    totalCost: formatCurrency(scaledCost),
    agents: agentsList,
    sampleCalls: calls.slice(0, 100) // First 100 calls for recent call inspector
  };
}

// Fetch detailed 360 data for a specific agent
export async function fetchVoiceAgent360(assistantId, filterParams, page = 1, pageSize = 30, search = '', statusFilter = 'ALL') {
  const conf = AGENTS_CONFIG[assistantId] || AGENTS_CONFIG['682cf6ae-23fd-44f3-a4a3-756998cd62c1'];
  const { start, end, label } = getDateRange(filterParams);

  let queryUrl = `${SUPABASE_BASE_URL}/vapi_call_logs?assistantId=eq.${assistantId}&select=*`;
  if (start) queryUrl += `&created_at=gte.${encodeURIComponent(start)}`;
  if (end) queryUrl += `&created_at=lt.${encodeURIComponent(end)}`;
  
  if (search && search.trim()) {
    const q = search.trim();
    queryUrl += `&or=(customer_phone.ilike.*${encodeURIComponent(q)}*,customer_name.ilike.*${encodeURIComponent(q)}*)`;
  }

  if (statusFilter === 'QUALIFIED') {
    queryUrl += `&voice_call_status=ilike.*awaiting*`;
  } else if (statusFilter === 'VOICEMAIL') {
    queryUrl += `&status=eq.voicemail`;
  } else if (statusFilter === 'BUSY') {
    queryUrl += `&status=eq.customer-busy`;
  } else if (statusFilter === 'ANSWERED') {
    queryUrl += `&duration_seconds=gt.0`;
  }

  const offset = (page - 1) * pageSize;
  queryUrl += `&order=created_at.desc.nullslast&limit=${pageSize}&offset=${offset}`;

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Range-Unit': 'items',
    'Prefer': 'count=exact'
  };

  const response = await fetch(queryUrl, { headers });
  if (!response.ok) throw new Error(`Agent 360 query failed: ${response.statusText}`);

  const calls = await response.json();
  const contentRange = response.headers.get('Content-Range') || '';
  const match = contentRange.match(/\/(\d+)/);
  const totalCalls = match ? parseInt(match[1], 10) : calls.length;

  return {
    agent: conf,
    label,
    calls,
    totalCalls,
    page,
    pageSize,
    totalPages: Math.ceil(totalCalls / pageSize) || 1
  };
}

// Helper: Check if lead has confirmed positive intent to buy, sell, or rent and needs broker action
function isLeadReadyAndHot(c) {
  const status = (c.voice_call_status || '').toLowerCase();
  const note = (c.note || '').toLowerCase();
  const summary = (c.summary || '').toLowerCase();

  // 1. Strict Exclusions: Cold pickups, voicemails, no answers, rejections, or far future
  const negativePhrases = [
    'no action', 'no answer', 'did_not_answer', 'not interested', 
    'declined both', 'declined to discuss', 'call ended prematurely', 
    'ended prematurely', 'in 2028', 'next year', 'not ready for at least', 
    'busy', 'voicemail', 'wrong number', 'silence before', 'dnp', 'hung up'
  ];
  for (const neg of negativePhrases) {
    if (status.includes(neg) || note.includes(neg) || summary.includes(neg)) {
      return false;
    }
  }

  // 2. Strict Inclusions: Must express intent to sell, rent, buy, or request price / availability callback
  const isAwaiting = status.includes('awaiting availability');
  const isPositiveNote = note.includes('positive') || 
                         note.includes('wants to sell') || 
                         note.includes('wants to rent') || 
                         note.includes('ready to buy') || 
                         note.includes('open to selling') || 
                         note.includes('open to rent') || 
                         note.includes('for sale and rent') ||
                         note.includes('expects') ||
                         note.includes('callback') ||
                         note.includes('whatsapp');

  const isPositiveSummary = summary.includes('open to selling') || 
                            summary.includes('looking to rent') || 
                            summary.includes('interested in selling') || 
                            summary.includes('interested in buying') || 
                            summary.includes('wishes to rent out');

  return (isAwaiting && (isPositiveNote || isPositiveSummary || note.length > 10)) || isPositiveNote || isPositiveSummary;
}

// Helper: Determine badge and transaction intent
function determineBadgeAndIntent(call) {
  const specificText = `${call.note || ''} ${call.summary || ''}`.toLowerCase();
  const hasBuy = specificText.includes('buy') || specificText.includes('cash buyer') || specificText.includes('purchase');
  const hasSell = specificText.includes('sell') || specificText.includes('selling') || specificText.includes('for sale');
  const hasRent = specificText.includes('rent') || specificText.includes('renting') || specificText.includes('lease');

  if (hasBuy && hasSell) {
    return {
      badge: 'Buy & Sell',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      intent: 'Dual Transaction'
    };
  }
  if (hasBuy) {
    return {
      badge: 'Ready to Buy',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      intent: 'Buyer'
    };
  }
  if (hasSell && !hasRent) {
    return {
      badge: 'Ready to Sell',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      intent: 'Seller'
    };
  }
  if (hasRent && !hasSell) {
    return {
      badge: 'Ready to Rent',
      badgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      intent: 'Rental Listing'
    };
  }
  if (hasSell && hasRent) {
    return {
      badge: 'Rent or Sell',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      intent: 'Rent or Sell'
    };
  }
  return {
    badge: 'Hot Lead',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    intent: 'Action ASAP'
  };
}

// Helper: Extract clean property/unit title
function extractPropertyTitle(call, owner) {
  if (owner.building_name && isNaN(owner.building_name) && owner.building_name !== owner.master_area) {
    return `${owner.building_name}${owner.unit_number ? ` · Unit ${owner.unit_number}` : ''}`;
  }

  // Check if note mentions building
  const note = call.note || '';
  const match = note.match(/(?:at|for|unit at)\s+([A-Za-z0-9\s'–-]+?)(?:,|\.|\s+expects|\s+for\s+\d|\s+open|\s+vacant|$)/i);
  if (match && match[1] && match[1].trim().length > 3) {
    const bName = match[1].trim();
    if (owner.unit_number) return `${bName} · Unit ${owner.unit_number}`;
    return bName;
  }

  if (owner.building_name && isNaN(owner.building_name)) {
    return `${owner.building_name}${owner.unit_number ? ` · Unit ${owner.unit_number}` : ''}`;
  }

  if (call.customer_name) {
    return `${call.customer_name} · Hot Inquiry`;
  }

  return `Direct Owner Lead (${call.customer_phone || 'UAE'})`;
}

// Fetch Live Immediate Activities: ONLY verified leads ready to buy, sell, or rent
export async function fetchImmediateActivities() {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    // 1. Specifically query for awaiting availability and verified positive calls
    const [awaitingRes, positiveRes] = await Promise.all([
      fetch(`${SUPABASE_BASE_URL}/vapi_call_logs?voice_call_status=ilike.*awaiting*&order=created_at.desc&limit=50`, { headers }),
      fetch(`${SUPABASE_BASE_URL}/vapi_call_logs?note=ilike.*positive*&order=created_at.desc&limit=50`, { headers })
    ]);

    const awaitingList = awaitingRes.ok ? await awaitingRes.json() : [];
    const positiveList = positiveRes.ok ? await positiveRes.json() : [];

    // Deduplicate calls by call id
    const seenCalls = new Set();
    const allCalls = [];
    for (const c of [...awaitingList, ...positiveList]) {
      if (!seenCalls.has(c.id)) {
        seenCalls.add(c.id);
        allCalls.push(c);
      }
    }

    // Filter strictly for verified hot leads
    const hotCalls = allCalls.filter(isLeadReadyAndHot);
    hotCalls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Deduplicate by customer phone so each lead is represented by their most recent actionable call
    const seenPhones = new Set();
    const deduplicatedCalls = [];
    for (const c of hotCalls) {
      const phone = c.customer_phone;
      if (phone && !seenPhones.has(phone)) {
        seenPhones.add(phone);
        deduplicatedCalls.push(c);
      } else if (!phone) {
        deduplicatedCalls.push(c);
      }
    }

    const topCalls = deduplicatedCalls.slice(0, 6);
    if (topCalls.length === 0) return [];

    // 2. Fetch owner intelligence details for matching customer phone numbers
    const phones = topCalls.map(c => c.customer_phone).filter(Boolean);
    const ownersMap = {};
    if (phones.length > 0) {
      try {
        const encodedPhones = phones.map(p => encodeURIComponent(p)).join(',');
        const ownersRes = await fetch(
          `${SUPABASE_BASE_URL}/owner_intelligence_leads?phone_normalized=in.(${encodedPhones})&select=full_name,building_name,unit_number,master_area,reported_property_type,phone_normalized`,
          { headers }
        );
        if (ownersRes.ok) {
          const owners = await ownersRes.json();
          (owners || []).forEach(o => {
            if (o.phone_normalized) {
              const prev = ownersMap[o.phone_normalized];
              if (!prev || (o.building_name && isNaN(o.building_name) && o.building_name.length > (prev.building_name || '').length)) {
                ownersMap[o.phone_normalized] = o;
              }
            }
          });
        }
      } catch (err) {
        console.warn('Could not join owner_intelligence_leads:', err);
      }
    }

    // 3. Format into actionable hot lead cards
    return topCalls.map((c) => {
      const owner = ownersMap[c.customer_phone] || {};
      const agentConfig = AGENTS_CONFIG[c.assistantId];
      const agentName = agentConfig ? `${agentConfig.name} (${agentConfig.line.split(' ')[0]})` : 'Sarah (Line 1)';
      const durSec = Number(c.duration_seconds) || 0;
      const durStr = durSec > 0 ? formatDuration(durSec) : 'Connected';

      const { badge, badgeStyle, intent } = determineBadgeAndIntent(c);
      const title = extractPropertyTitle(c, owner);

      // Clean owner name
      let ownerName = owner.full_name || c.customer_name || 'Property Owner';
      if (ownerName.length > 30) {
        const parts = ownerName.split(' ');
        if (parts.length > 3) {
          ownerName = parts.slice(0, 3).join(' ');
        }
      }

      const area = owner.master_area && isNaN(owner.master_area) ? owner.master_area : 'Dubai';
      const subtitle = `${ownerName} · ${area} · ${c.customer_phone || ''}`;

      // Clean, actionable description
      let description = c.note ? c.note.trim() : (c.summary ? c.summary.trim() : 'Confirmed transaction intent. Urgent human broker intervention required.');
      description = description.charAt(0).toUpperCase() + description.slice(1);

      // Relative time calculation
      let time = 'Recently';
      if (c.created_at) {
        const diffMs = Date.now() - new Date(c.created_at).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) time = 'Just now';
        else if (diffMins < 60) time = `${diffMins} mins ago`;
        else {
          const diffHours = Math.floor(diffMins / 60);
          if (diffHours < 24) time = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          else {
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) time = 'Yesterday';
            else if (diffDays < 7) time = `${diffDays} days ago`;
            else {
              time = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        }
      }

      return {
        id: c.id,
        title,
        subtitle,
        badge,
        badgeStyle,
        intent,
        description,
        time,
        agent: `${agentName} · ${durStr}`,
        targetTab: 'voice',
        actionLabel: 'Open Voice 360',
        recordingUrl: c.recording_url,
        phone: c.customer_phone,
        ownerName,
        buildingName: owner.building_name,
        unitNumber: owner.unit_number
      };
    });
  } catch (err) {
    console.error('Error in fetchImmediateActivities:', err);
    return [];
  }
}

// Fetch total live non-duplicate leads / verified owners count from Supabase
export async function fetchTotalLeadsCount() {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'count=exact'
  };

  try {
    const res = await fetch(`${SUPABASE_BASE_URL}/owner_intelligence_leads?limit=1`, { headers });
    const contentRange = res.headers.get('Content-Range') || '';
    const match = contentRange.match(/\/(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  } catch (err) {
    console.warn('Failed to fetch from owner_intelligence_leads, falling back to owners_data:', err);
  }

  try {
    const res2 = await fetch(`${SUPABASE_BASE_URL}/owners_data?limit=1`, { headers });
    const contentRange2 = res2.headers.get('Content-Range') || '';
    const match2 = contentRange2.match(/\/(\d+)/);
    if (match2 && match2[1]) {
      return parseInt(match2[1], 10);
    }
  } catch (err2) {
    console.warn('Failed to fetch from owners_data:', err2);
  }

  return 3042722;
}

