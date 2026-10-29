// Voice Agent Service & Data Pipeline
// Connects to Supabase vapi_call_logs table to provide real-time call intelligence
import { createClient } from '@supabase/supabase-js';

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_PROJECT_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co';
// Secure publishable key adhering to RLS policies (replaces exposed service_role key)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

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
  },
  '2816c620-9705-450e-9683-5652dc1194a6': {
    id: '2816c620-9705-450e-9683-5652dc1194a6',
    name: 'Maya',
    role: 'AI Acquisition Specialist (High-Performance)',
    line: 'Line 4 (High-Performance)',
    accent: 'Neutral / International',
    color: 'amber',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    avatarBg: 'from-amber-600/30 to-orange-600/20',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    voiceModel: 'ElevenLabs Flash v2',
    engine: 'Claude Haiku 4.5',
    description: 'High-performance acquisition dialer running parallel owner qualification campaigns.',
  }
};

export const AGENT_IDS = Object.keys(AGENTS_CONFIG);

// Helper to check if a call resulted in a qualified lead
// Uses CRM voice_call_status ('awaiting availability') as primary signal,
// supplemented by positive/negative note analysis for accurate qualification.
export function isQualifiedLead(call) {
  const vStatus = (call.voice_call_status || '').toLowerCase();
  const note = (call.note || '').toLowerCase();
  const summary = (call.summary || '').toLowerCase();
  const status = (call.status || '').toLowerCase();

  // Explicit negative CRM statuses — never qualified
  if (
    vStatus.includes('no action') ||
    vStatus.includes('did_not_answer') ||
    vStatus.includes('no answer') ||
    vStatus.includes('busy')
  ) {
    return false;
  }

  // Unanswered / failed calls — only qualified if CRM explicitly tagged awaiting
  if (
    status === 'voicemail' ||
    status === 'customer-did-not-answer' ||
    status === 'customer-busy' ||
    status === 'silence-timed-out' ||
    status.includes('error') ||
    status.includes('failed')
  ) {
    if (!vStatus.includes('awaiting availability')) return false;
  }

  // Negative indications in note or summary disqualify
  const combined = (note + ' ' + summary).toLowerCase();
  if (
    note.startsWith('negative -') ||
    combined.includes('not open') ||
    combined.includes('not interested') ||
    combined.includes('no interest') ||
    combined.includes('not willing') ||
    combined.includes("don't want") ||
    combined.includes('do not want') ||
    combined.includes('wrong number') ||
    combined.includes('do not call') ||
    combined.includes('declined') ||
    combined.includes('refused') ||
    combined.includes('hung up')
  ) {
    return false;
  }

  // Primary qualification signal: CRM workflow tag
  if (vStatus.includes('awaiting availability')) {
    return true;
  }

  // Secondary qualification: positive note/summary indicators
  if (
    note.startsWith('positive -') ||
    combined.includes('wants to sell') ||
    combined.includes('wants to rent') ||
    combined.includes('willing to sell') ||
    combined.includes('open to sell') ||
    combined.includes('open to rent') ||
    combined.includes('callback requested') ||
    combined.includes('agreed to callback') ||
    combined.includes('book an appointment') ||
    combined.includes('price expectations')
  ) {
    return true;
  }

  return false;
}

// Helper to check if a call was answered by a human
export function isCallAnswered(call) {
  const status = (call.status || '').toLowerCase();
  const dur = Number(call.duration_seconds) || 0;
  
  // Only count as answered if human actually spoke (customer-ended or assistant-ended with duration)
  if (status === 'customer-ended-call' || status === 'assistant-ended-call') {
    return dur > 0;
  }
  return false;
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

// Build ISO Date Range from filter parameters with accurate Dubai GST (+04:00) alignment
export function getDateRange({ timeFilter, selectedDate, selectedYear, selectedMonth, selectedWeek, customStartDate, customEndDate }) {
  if (timeFilter === 'All Time') {
    return { start: null, end: null, label: 'All Time (Complete Historical Database)' };
  }

  if (timeFilter === 'Custom') {
    const startStr = customStartDate || selectedDate;
    const endStr = customEndDate || selectedDate || startStr;
    const start = startStr ? `${startStr}T00:00:00+04:00` : null;
    let end = null;
    if (endStr) {
      const d = new Date(endStr + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      end = d.toISOString().split('T')[0] + 'T00:00:00+04:00';
    }
    const fmt = (s) => {
      try {
        const parts = s.split('-');
        const dateObj = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
      } catch {
        return s;
      }
    };
    return {
      start,
      end,
      label: startStr && endStr ? `Custom Range · ${fmt(startStr)} – ${fmt(endStr)}` : 'Custom Range'
    };
  }

  if (timeFilter === 'Daily') {
    const todayDubai = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
    const dStr = selectedDate || todayDubai; // dynamically default to present day's live activity
    const start = `${dStr}T00:00:00+04:00`;
    // Next day in Dubai GST
    const d = new Date(dStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    const end = d.toISOString().split('T')[0] + 'T00:00:00+04:00';
    return { 
      start, 
      end, 
      label: new Date(dStr + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) 
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

    const start = `${year}-${mStr}-${String(startDay).padStart(2, '0')}T00:00:00+04:00`;
    const endDateObj = new Date(Date.UTC(year, month - 1, endDay + 1));
    const end = endDateObj.toISOString().split('T')[0] + 'T00:00:00+04:00';
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
    const start = `${year}-${mStr}-01T00:00:00+04:00`;
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+04:00`;
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

// Fetch exact overview metrics from Supabase via high-performance RPCs (zero synthetic extrapolation)
export async function fetchVoiceOverview(filterParams) {
  const { start, end, label } = getDateRange(filterParams);

  // Auto-reconcile live calls for today in background if viewing Daily mode
  const currentDubaiDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  if (filterParams?.timeFilter === 'Daily' && (!filterParams?.selectedDate || filterParams?.selectedDate === currentDubaiDate)) {
    triggerBackgroundVapiSync(currentDubaiDate);
  }

  const rpcHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Execute server-side aggregate RPCs in parallel
    const [metricsRes, agentsRes, hourlyRes, recentCallsRes] = await Promise.all([
      fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/get_voice_metrics_v2`, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify({
          p_start_time: start || null,
          p_end_time: end || null,
          p_assistant_id: null
        })
      }),
      fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/get_voice_agent_summary_v2`, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify({
          p_start_time: start || null,
          p_end_time: end || null
        })
      }),
      fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/get_voice_hourly_breakdown_v2`, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify({
          p_start_time: start || null,
          p_end_time: end || null,
          p_assistant_id: null
        })
      }),
      // Fetch recent 50 calls for live stream table
      (() => {
        let q = `${SUPABASE_BASE_URL}/vapi_call_logs?select=id,status,duration_seconds,cost_usd,voice_call_status,assistantId,created_at,summary,note,customer_phone,customer_name,recording_url`;
        if (start) q += `&created_at=gte.${encodeURIComponent(start)}`;
        if (end) q += `&created_at=lt.${encodeURIComponent(end)}`;
        q += `&order=created_at.desc.nullslast&limit=50`;
        return fetch(q, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
      })()
    ]);

    const metrics = metricsRes.ok ? await metricsRes.json() : {};
    const rawSummaries = agentsRes.ok ? await agentsRes.json() : [];
    const hourlyBreakdown = hourlyRes.ok ? await hourlyRes.json() : [];
    const sampleCalls = recentCallsRes.ok ? await recentCallsRes.json() : [];

    const agentSummaryMap = {};
    (rawSummaries || []).forEach(s => {
      if (s.assistant_id) agentSummaryMap[s.assistant_id] = s;
    });

    // Format all configured agents data with live exact counts
    const agentsList = AGENT_IDS.map(id => {
      const conf = AGENTS_CONFIG[id];
      const st = agentSummaryMap[id] || {
        total_calls: 0,
        answered_calls: 0,
        dropped_calls: 0,
        qualified_leads: 0,
        total_cost: 0,
        total_duration_seconds: 0,
        avg_duration_seconds: 0,
        is_active_24h: false,
        last_call_at: null
      };

      const agentCalls = Number(st.total_calls) || 0;
      const agentQualified = Number(st.qualified_leads) || 0;
      const cvr = agentCalls > 0 ? ((agentQualified / agentCalls) * 100).toFixed(1) + '%' : '0.0%';
      const agentCost = Number(st.total_cost) || 0;
      const costPerLead = agentQualified > 0 ? `$${(agentCost / agentQualified).toFixed(2)}` : (agentCalls > 0 ? `$${(agentCost / agentCalls).toFixed(2)}` : '$0.00');

      return {
        ...conf,
        calls: agentCalls.toLocaleString(),
        rawCalls: agentCalls,
        drops: (Number(st.dropped_calls) || 0).toLocaleString(),
        qualified: agentQualified,
        cvr,
        cost: costPerLead,
        totalCost: `$${agentCost.toFixed(2)}`,
        avgDuration: formatDuration(st.avg_duration_seconds),
        status: st.is_active_24h ? 'Active' : 'Idle',
        isActive24h: Boolean(st.is_active_24h),
        lastCallAt: st.last_call_at
      };
    });

    const totalCalls = Number(metrics.total_calls) || 0;
    const answeredCalls = Number(metrics.answered_calls) || 0;
    const drops = Number(metrics.dropped_calls) || 0;
    const qualifiedLeads = Number(metrics.qualified_leads) || 0;
    const totalCost = Number(metrics.total_cost) || 0;
    const avgDuration = Number(metrics.avg_duration_seconds) || 0;

    return {
      label,
      totalCalls: totalCalls.toLocaleString(),
      rawTotalCalls: totalCalls,
      answeredCalls: answeredCalls.toLocaleString(),
      rawAnsweredCalls: answeredCalls,
      drops: drops.toLocaleString(),
      rawDrops: drops,
      qualifiedLeads: qualifiedLeads.toLocaleString(),
      rawQualifiedLeads: qualifiedLeads,
      avgDuration: formatDuration(avgDuration),
      rawAvgDuration: avgDuration,
      answerRate: `${metrics.answer_rate || 0}%`,
      dropRate: `${metrics.drop_rate || 0}%`,
      qualificationRate: `${metrics.qualification_rate || 0}%`,
      totalCost: formatCurrency(totalCost),
      agents: agentsList,
      hourlyBreakdown,
      sampleCalls
    };
  } catch (err) {
    console.error('Error fetching voice overview via RPC:', err);
    throw err;
  }
}

// Fetch detailed 360 data for a specific agent with full-scope hero KPIs
export async function fetchVoiceAgent360(assistantId, filterParams, page = 1, pageSize = 30, search = '', statusFilter = 'ALL') {
  const conf = AGENTS_CONFIG[assistantId] || AGENTS_CONFIG['682cf6ae-23fd-44f3-a4a3-756998cd62c1'];
  const { start, end, label } = getDateRange(filterParams);

  const rpcHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  // 1. Fetch exact aggregate metrics for this assistant across the full filtered scope & all-time
  const [scopeMetricsRes, allTimeMetricsRes] = await Promise.all([
    fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/get_voice_metrics_v2`, {
      method: 'POST',
      headers: rpcHeaders,
      body: JSON.stringify({
        p_start_time: start || null,
        p_end_time: end || null,
        p_assistant_id: assistantId
      })
    }),
    fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/get_voice_metrics_v2`, {
      method: 'POST',
      headers: rpcHeaders,
      body: JSON.stringify({
        p_start_time: null,
        p_end_time: null,
        p_assistant_id: assistantId
      })
    })
  ]);

  const scopeMetrics = scopeMetricsRes.ok ? await scopeMetricsRes.json() : {};
  const allTimeMetrics = allTimeMetricsRes.ok ? await allTimeMetricsRes.json() : {};

  // 2. Fetch paginated call logs for this assistant
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
  const totalFilteredCalls = match ? parseInt(match[1], 10) : Number(scopeMetrics.total_calls || calls.length);

  return {
    agent: {
      ...conf,
      allTimeTotal: Number(allTimeMetrics.total_calls) || 0
    },
    label,
    calls,
    totalCalls: totalFilteredCalls,
    metrics: scopeMetrics,
    page,
    pageSize,
    totalPages: Math.ceil(totalFilteredCalls / pageSize) || 1
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

  // 2. Persist to Supabase database via secure RPC
  try {
    const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/mark_lead_completed`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_call_id: callId })
    });
    return res.ok;
  } catch (err) {
    console.warn('Supabase mark_lead_completed failed:', err);
    return false;
  }
}

let _realtimeClient = null;

function getRealtimeClient() {
  if (!_realtimeClient) {
    _realtimeClient = createClient(SUPABASE_PROJECT_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return _realtimeClient;
}

/**
 * Subscribe to live telephony call events via Supabase Realtime WebSocket.
 * Throttles burst events with a 350ms buffer and notifies listeners.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToVoiceTelemetry(onEvents) {
  try {
    const client = getRealtimeClient();
    let buffer = [];
    let timer = null;

    const flush = () => {
      if (buffer.length > 0 && typeof onEvents === 'function') {
        const batch = [...buffer];
        buffer = [];
        onEvents(batch);
      }
    };

    const channelName = 'voice_telemetry_' + Math.random().toString(36).slice(2, 9);
    const channel = client
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vapi_call_logs' }, (payload) => {
        buffer.push(payload);
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            flush();
          }, 350);
        }
      })
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Realtime Telemetry] Connection status:', status, err.message);
        }
      });

    return () => {
      if (timer) clearTimeout(timer);
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Realtime Telemetry] Failed to initiate subscription:', err);
    return () => {};
  }
}
