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
    allTimeTotal: 25870,
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
    allTimeTotal: 39588,
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
    allTimeTotal: 14535,
  }
};

export const AGENT_IDS = Object.keys(AGENTS_CONFIG);

// Helper to check if a call resulted in a qualified lead
export function isQualifiedLead(call) {
  const vStatus = (call.voice_call_status || '').toLowerCase();
  const summary = (call.summary || '').toLowerCase();
  if (vStatus.includes('awaiting availability') || vStatus.includes('interested') || vStatus.includes('appointment')) {
    return true;
  }
  if (summary.includes('interested') || summary.includes('sell') || summary.includes('rent') || summary.includes('available')) {
    return true;
  }
  return false;
}

// Helper to check if a call was answered
export function isCallAnswered(call) {
  const dur = Number(call.duration_seconds) || 0;
  const status = (call.status || '').toLowerCase();
  if (status === 'voicemail' || status === 'customer-did-not-answer' || status === 'customer-busy' || status.includes('error')) {
    return false;
  }
  return dur > 0;
}

// Helper to check if dropped / voicemail / unanswered
export function isCallDropOrVoicemail(call) {
  const dur = Number(call.duration_seconds) || 0;
  const status = (call.status || '').toLowerCase();
  if (status === 'voicemail' || status === 'customer-did-not-answer' || status === 'customer-busy' || status.includes('failed') || status.includes('error')) {
    return true;
  }
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
    return { start: null, end: null, label: 'All Time (79,993 Historical Calls)' };
  }

  if (timeFilter === 'Daily') {
    const dStr = selectedDate || '2026-10-10'; // default to latest activity
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
