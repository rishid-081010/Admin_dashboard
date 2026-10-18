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
    allTimeTotal: 27967,
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
    allTimeTotal: 41476,
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
    allTimeTotal: 16530,
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

let lastSyncTimestamp = 0;
export async function triggerBackgroundVapiSync(dateStr) {
  const now = Date.now();
  if (now - lastSyncTimestamp < 60000) return;
  lastSyncTimestamp = now;

  try {
    const todayDubai = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
    const target = dateStr || todayDubai;
    const endpoints = [
      `/dashboard/api_sync_vapi.php?date=${encodeURIComponent(target)}`,
      `/api_sync_vapi.php?date=${encodeURIComponent(target)}`,
      `https://admin.asquared.ae/dashboard/api_sync_vapi.php?date=${encodeURIComponent(target)}`
    ];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            console.log('[Auto-Sync] Reconciled VAPI calls:', json.synced_to_supabase, 'for date', target);
            break;
          }
        }
      } catch (e) {}
    }
  } catch (err) {}
}

// Fetch overview metrics from Supabase
export async function fetchVoiceOverview(filterParams) {
  const { start, end, label } = getDateRange(filterParams);

  // Auto-reconcile live calls for today in background if viewing Daily mode
  const currentDubaiDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  if (filterParams?.timeFilter === 'Daily' && (!filterParams?.selectedDate || filterParams?.selectedDate === currentDubaiDate)) {
    triggerBackgroundVapiSync(currentDubaiDate);
  }

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

  let calls = await response.json();
  const contentRange = response.headers.get('Content-Range') || '';
  const match = contentRange.match(/\/(\d+)/);
  const totalCallsCount = match ? parseInt(match[1], 10) : calls.length;

  // If there are more calls than the first page (PostgREST limit is 1000), fetch next page
  if (totalCallsCount > calls.length && calls.length >= 1000) {
    try {
      const page2Url = `${url}&offset=${calls.length}`;
      const res2 = await fetch(page2Url, { headers });
      if (res2.ok) {
        const batch2 = await res2.json();
        if (Array.isArray(batch2)) calls = calls.concat(batch2);
      }
    } catch (e) {
      console.warn('Could not fetch subsequent page of call logs:', e);
    }
  }

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

// Fetch Live Immediate Activities from Supabase vapi_call_logs joined with owner_intelligence_leads
// Helper to extract known tower names if database record doesn't have it or has a placeholder
function extractBuildingContext(dbBuilding, dbArea, note, summary) {
  const combined = `${note || ''} ${summary || ''}`.toLowerCase();
  
  if (combined.includes('act 1 act 2') || combined.includes('act one act two')) {
    return { building: 'Act One Act Two Tower 1', area: 'Burj Khalifa' };
  }
  if (combined.includes('peninsula 1')) {
    return { building: 'Peninsula 1', area: 'Business Bay' };
  }
  if (combined.includes('paramount tower')) {
    return { building: 'Paramount Tower Hotel & Residences', area: 'Business Bay' };
  }
  if (combined.includes('azizi shista') || combined.includes('azizi shaista')) {
    return { building: 'Azizi Shaista Residence', area: 'Al Furjan' };
  }
  if (combined.includes('cordoba palace')) {
    return { building: 'Cordoba Palace', area: 'Cordoba Palace' };
  }
  if (combined.includes('29 blvd')) {
    return { building: '29 Boulevard Tower 1', area: 'Burj Khalifa' };
  }
  if (combined.includes('upper crest')) {
    return { building: 'Upper Crest', area: 'Downtown Dubai' };
  }
  if (combined.includes('elite business bay')) {
    return { building: 'Elite Business Bay Residence', area: 'Business Bay' };
  }
  if (combined.includes('jules residence')) {
    return { building: 'Jules Residence', area: 'Arjan' };
  }
  if (combined.includes('moss tower') || combined.includes('mas tower')) {
    return { building: 'MAS Tower', area: 'Dubai' };
  }
  if (combined.includes('sol bay')) {
    return { building: 'Sol Bay', area: 'Business Bay' };
  }
  if (combined.includes('star\'s tower') || combined.includes('starz tower')) {
    return { building: 'Starz Tower 2', area: 'Al Furjan' };
  }

  const b = dbBuilding && dbBuilding.length > 2 && !/^\d+$/.test(dbBuilding) ? dbBuilding : 'Dubai Prime Property';
  const a = dbArea && dbArea.length > 2 && !/^\d+$/.test(dbArea) ? dbArea : 'Dubai';
  return { building: b, area: a };
}

// Fetch Live Actionable Hot Leads from Supabase vapi_call_logs joined with owner_intelligence_leads
// Strictly filters for leads who are interested, ready to buy or sell/rent, and require human broker intervention
// Guarantees only hot leads where NO action has been performed yet
export async function fetchImmediateActivities() {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  try {
    // Load locally marked completed leads
    const localCompletedSet = new Set();
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('completed_action_leads') : null;
      if (raw) {
        const arr = JSON.parse(raw);
        arr.forEach(id => localCompletedSet.add(id));
      }
    } catch (e) {
      console.warn('Could not read completed_action_leads from localStorage:', e);
    }

    // 1. Fetch calls with awaiting availability status OR high-intent keywords OR rich summaries
    const [statusRes, summaryRes] = await Promise.all([
      fetch(`${SUPABASE_BASE_URL}/vapi_call_logs?or=(voice_call_status.ilike.*Awaiting*,note.ilike.*positive*,note.ilike.*wants to*,note.ilike.*interested*)&order=created_at.desc&limit=100`, { headers }),
      fetch(`${SUPABASE_BASE_URL}/vapi_call_logs?summary=not.is.null&order=created_at.desc&limit=50`, { headers })
    ]);

    const statusCalls = statusRes.ok ? await statusRes.json() : [];
    const summaryCalls = summaryRes.ok ? await summaryRes.json() : [];

    const seenIds = new Set();
    const rawList = [];
    for (const c of [...statusCalls, ...summaryCalls]) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        rawList.push(c);
      }
    }

    rawList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 2. Strict Qualification: only leads interested/ready to buy/sell/rent + requiring human intervention
    const qualifiedCalls = [];
    const seenPhones = new Set();

    for (const c of rawList) {
      // Exclude if already marked as completed locally
      if (localCompletedSet.has(c.id)) {
        continue;
      }

      const note = (c.note || '').trim();
      const summary = (c.summary || '').trim();
      const vStatus = (c.voice_call_status || '').trim();
      const combined = `${note} ${summary} ${vStatus}`.toLowerCase();

      // Exclude if completed in database / already actioned by broker
      if (
        vStatus.toLowerCase().includes('completed') ||
        vStatus.toLowerCase().includes('broker handled') ||
        vStatus.toLowerCase().includes('action completed') ||
        combined.includes('action completed') ||
        combined.includes('broker handled')
      ) {
        continue;
      }

      // Automated Removal Algorithm:
      // Exclude if a subsequent answered call to this owner already exists (i.e. already followed up)
      const hasSubsequentCall = rawList.some(other =>
        other.id !== c.id &&
        other.customer_phone &&
        other.customer_phone === c.customer_phone &&
        new Date(other.created_at) > new Date(c.created_at) &&
        (Number(other.duration_seconds) || 0) >= 10
      );
      if (hasSubsequentCall) {
        continue;
      }

      // Exclude all cold, unreached, or negative outcomes
      if (
        combined.includes('not ready') ||
        combined.includes('not interested') ||
        combined.includes('declined') ||
        combined.includes('wrong number') ||
        combined.includes('voicemail') ||
        combined.includes('dnp') ||
        combined.includes('no live person') ||
        combined.includes('hung up') ||
        combined.includes('ended abruptly') ||
        combined.includes('no action') ||
        combined.includes('silence before') ||
        combined.includes('never heard') ||
        combined.includes('not a') ||
        vStatus.includes('no action') ||
        vStatus.includes('did_not_answer')
      ) {
        continue;
      }

      // Must have high transaction intent (ready to buy, sell, or rent)
      const hasIntent = (
        combined.includes('wants to sell') ||
        combined.includes('wants to rent') ||
        combined.includes('renting it out') ||
        combined.includes('interested in renting') ||
        combined.includes('interested in selling') ||
        combined.includes('open to selling') ||
        combined.includes('open to rent') ||
        combined.includes('open to offer') ||
        combined.includes('for sale') ||
        combined.includes('for rent') ||
        combined.includes('buying multiple') ||
        combined.includes('ready to buy') ||
        combined.includes('ready to sell') ||
        (combined.includes('positive') && (combined.includes('studio') || combined.includes('unit') || combined.includes('bed') || combined.includes('sell') || combined.includes('rent')))
      );

      // Must require direct human broker intervention
      const needsIntervention = (
        combined.includes('callback') ||
        combined.includes('call back') ||
        combined.includes('whatsapp') ||
        combined.includes('meeting') ||
        combined.includes('advisor') ||
        combined.includes('consultant') ||
        combined.includes('send') ||
        combined.includes('expects') ||
        combined.includes('vacant') ||
        combined.includes('available') ||
        combined.includes('price') ||
        combined.includes('valuation') ||
        combined.includes('offer')
      );

      if (hasIntent && needsIntervention) {
        // Deduplicate so the same phone never appears twice (keeps the latest call)
        const phoneKey = c.customer_phone || c.id;
        if (!seenPhones.has(phoneKey)) {
          seenPhones.add(phoneKey);
          qualifiedCalls.push(c);
        }
      }
    }

    if (qualifiedCalls.length === 0) return [];

    // Limit to top 6 most actionable hot leads where no action has been performed yet
    const topCalls = qualifiedCalls.slice(0, 6);

    // 3. Fetch owner intelligence details for matching customer phone numbers
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
              if (!ownersMap[o.phone_normalized]) {
                ownersMap[o.phone_normalized] = [];
              }
              ownersMap[o.phone_normalized].push(o);
            }
          });
        }
      } catch (err) {
        console.warn('Could not join owner_intelligence_leads:', err);
      }
    }

    // 4. Format into actionable hot lead cards where no action has been performed yet
    return topCalls.map((c) => {
      const ownerList = ownersMap[c.customer_phone] || [];
      const callText = `${c.note || ''} ${c.summary || ''}`.toLowerCase();

      // Intelligently select the specific property mentioned in the conversation
      let owner = ownerList.find(o => {
        if (!o.building_name || o.building_name.length <= 2) return false;
        const bClean = o.building_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cClean = callText.replace(/[^a-z0-9]/g, '');
        return cClean.includes(bClean);
      }) || ownerList.find(o => o.unit_number && callText.includes(String(o.unit_number).toLowerCase()))
         || ownerList[0] || {};

      const agentConfig = AGENTS_CONFIG[c.assistantId];
      const agentName = agentConfig ? `${agentConfig.name} (${agentConfig.line.split(' ')[0]})` : 'Sarah (Line 1)';
      const durSec = Number(c.duration_seconds) || 0;
      const durStr = durSec > 0 ? formatDuration(durSec) : 'Connected';

      const ctx = extractBuildingContext(owner.building_name, owner.master_area, c.note, c.summary);
      const buildingName = ctx.building;
      const masterArea = owner.master_area && !/^\d+$/.test(owner.master_area) ? owner.master_area : ctx.area;
      const unitNumber = owner.unit_number && !owner.unit_number.includes('Joy') && owner.unit_number !== '1' ? owner.unit_number : '';
      const ownerName = owner.full_name || c.customer_name || 'Property Owner';

      // Title & Subtitle
      const title = `${buildingName}${unitNumber ? ` · Unit ${unitNumber}` : ''}`;
      const subtitle = `${ownerName} · ${masterArea}`;

      // Detect human intervention required
      const noteLower = (c.note || '').toLowerCase();
      const summaryLower = (c.summary || '').toLowerCase();
      const combined = `${noteLower} ${summaryLower}`;

      let badge = 'Action Required';
      let badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      let actionType = 'Follow-up';

      if (combined.includes('whatsapp')) {
        badge = 'WhatsApp Follow-Up';
        badgeStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
        actionType = 'WhatsApp';
      } else if (combined.includes('callback') || combined.includes('call back') || combined.includes('hour')) {
        badge = 'Urgent Callback';
        badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
        actionType = 'Callback';
      } else if (noteLower.includes('wants to sell') || noteLower.includes('for 2m') || noteLower.includes('for 3m') || noteLower.includes('for 7m') || noteLower.includes('cash') || noteLower.includes('open to offer')) {
        badge = 'Ready to Sell';
        badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
        actionType = 'Sale Mandate';
      } else if (noteLower.includes('rent') || noteLower.includes('renting')) {
        badge = 'Ready to Rent';
        badgeStyle = 'bg-teal-500/15 text-teal-300 border-teal-500/30';
        actionType = 'Rent Mandate';
      } else if (combined.includes('meeting')) {
        badge = 'Meeting Requested';
        badgeStyle = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
        actionType = 'Meeting';
      } else if (combined.includes('sell')) {
        badge = 'Ready to Sell';
        badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
        actionType = 'Sale Mandate';
      }

      // Generate concise human-readable description
      let description = '';
      if (c.note && c.note.startsWith('positive - ')) {
        description = c.note.replace('positive - ', '').trim();
      } else if (c.note && !c.note.toLowerCase().includes('neutral')) {
        description = c.note.trim();
      } else if (c.summary) {
        description = c.summary.trim();
      } else {
        description = `Owner interested in transacting. Requires senior broker follow-up.`;
      }

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
            time = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          }
        }
      }

      const cleanPhone = (c.customer_phone || '').replace(/[^0-9]/g, '');

      return {
        id: c.id,
        title,
        subtitle,
        ownerName,
        building: buildingName,
        unit: unitNumber,
        area: masterArea,
        badge,
        badgeStyle,
        actionType,
        actionStatus: 'Pending Action',
        statusLabel: 'No action performed yet',
        description,
        time,
        agent: `${agentName} · ${durStr}`,
        targetTab: 'voice',
        actionLabel: 'Open Voice 360',
        recordingUrl: c.recording_url,
        phone: c.customer_phone,
        cleanPhone
      };
    });
  } catch (err) {
    console.error('Error in fetchImmediateActivities:', err);
    return [];
  }
}

let _cachedTotalLeads = null;
let _lastFetchedLeadsTime = 0;
const LEADS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Fetch total live non-duplicate leads / verified owners count from Supabase using fast planned count
export async function fetchTotalLeadsCount() {
  const now = Date.now();
  if (_cachedTotalLeads && (now - _lastFetchedLeadsTime < LEADS_CACHE_TTL)) {
    return _cachedTotalLeads;
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'count=planned'
  };

  try {
    const res = await fetch(`${SUPABASE_BASE_URL}/owners_data?limit=1`, { headers });
    const contentRange = res.headers.get('Content-Range') || '';
    const match = contentRange.match(/\/(\d+)/);
    if (match && match[1]) {
      const count = parseInt(match[1], 10);
      _cachedTotalLeads = count;
      _lastFetchedLeadsTime = now;
      return count;
    }
  } catch (err) {
    console.warn('Failed to fetch planned count from owners_data:', err);
  }

  return 3042722;
}

// Mark a lead as completed manually by broker and persist across sessions and database
export async function markLeadAsCompleted(callId, phone) {
  if (!callId) return false;

  // 1. Immediately persist to localStorage for instant local retention across page reloads
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('completed_action_leads');
      let completed = raw ? JSON.parse(raw) : [];
      if (!completed.includes(callId)) {
        completed.push(callId);
        localStorage.setItem('completed_action_leads', JSON.stringify(completed));
      }
    }
  } catch (err) {
    console.warn('LocalStorage write failed:', err);
  }

  // 2. Persist to Supabase database so it updates globally across all devices & users
  try {
    const res = await fetch(`${SUPABASE_BASE_URL}/vapi_call_logs?id=eq.${callId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        voice_call_status: 'Action Completed - Broker Handled',
        updated_at: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Supabase update failed:', err);
    return false;
  }
}
