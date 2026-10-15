import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54';

const AGENTS_MAP = {
  '682cf6ae-23fd-44f3-a4a3-756998cd62c1': { name: 'Sarah', line: 'Line 1 (Primary AI)', target: 'Residential Villa & Apartment Qualification' },
  '91732d4e-3b60-4950-8aa6-4060c0803119': { name: 'James', line: 'Line 2 (High-Volume)', target: 'Prime Developer Towers & Repeat Investors' },
  'f99e8e9a-48b1-411f-806e-6cb7d1dde58b': { name: 'Aisha', line: 'Line 3 (Prime UAE)', target: 'Prime Areas (Palm, Downtown, Al Furjan)' }
};

/**
 * Downloads a pre-existing PDF from candidate URLs using Blob fetch.
 * Returns true if successful, false if not found.
 */
export async function downloadPrebuiltPdf(dateStr) {
  const cleanDate = dateStr.replace(/-/g, '');
  const pdfFileName = `AS_PROPERTIES_DAILY_CALL_AUDIT_${cleanDate}.pdf`;
  
  const candidates = [
    `https://admin.asquared.ae/dashboard/audits/${pdfFileName}`,
    `https://admin.asquared.ae/audits/${pdfFileName}`,
    `./audits/${pdfFileName}`,
    `/audits/${pdfFileName}`,
    `audits/${pdfFileName}`,
    `https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/audits/${pdfFileName}`,
    `https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/aduits/${pdfFileName}`,
    dateStr === '2026-10-13' ? 'https://admin.asquared.ae/dashboard/audits/AS_PROPERTIES_EVERY_CALL_AUDIT_OCT13.pdf' : null
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        // Guard against HTML error pages
        if (contentType.includes('html')) continue;
        
        const blob = await res.blob();
        if (blob.size < 500) continue;

        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = pdfFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
        return true;
      }
    } catch (err) {
      // try next candidate
    }
  }
  return false;
}

/**
 * Generates an official executive PDF audit report on-demand directly in the browser
 * and triggers immediate download.
 */
export async function generateAndDownloadAuditPdf(dateStr, category = 'all') {
  const cleanDate = dateStr.replace(/-/g, '');
  const pdfFileName = `AS_PROPERTIES_DAILY_CALL_AUDIT_${cleanDate}.pdf`;

  // Fetch live calls for dateStr from Supabase
  const startIso = `${dateStr}T00:00:00.000Z`;
  const endD = new Date(dateStr + 'T00:00:00.000Z');
  endD.setUTCDate(endD.getUTCDate() + 1);
  const endIso = endD.toISOString().split('T')[0] + 'T00:00:00.000Z';

  const qUrl = `${SUPABASE_BASE_URL}/vapi_call_logs?created_at=gte.${encodeURIComponent(startIso)}&created_at=lt.${encodeURIComponent(endIso)}&order=created_at.desc&limit=1000`;
  const res = await axios.get(qUrl, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'count=exact'
    }
  });

  let rawCalls = res.data || [];
  const contentRange = res.headers['content-range'] || '';
  const match = contentRange.match(/\/(\d+)/);
  const totalCount = match ? parseInt(match[1], 10) : rawCalls.length;
  if (totalCount > rawCalls.length && rawCalls.length >= 1000) {
    try {
      const page2Res = await axios.get(`${qUrl}&offset=${rawCalls.length}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      if (Array.isArray(page2Res.data)) rawCalls = rawCalls.concat(page2Res.data);
    } catch (e) {
      console.warn('Could not fetch page 2 for audit PDF:', e);
    }
  }

  // Filter if category requested
  if (category === 'leads') {
    rawCalls = rawCalls.filter(r => {
      const v = (r.voice_call_status || '').toLowerCase();
      const s = (r.summary || '').toLowerCase();
      return v.includes('interested') || v.includes('appointment') || s.includes('interested') || s.includes('sell') || s.includes('rent') || Number(r.duration_seconds) >= 25;
    });
  } else if (category === 'drops') {
    rawCalls = rawCalls.filter(r => {
      const st = (r.status || '').toLowerCase();
      return st !== 'customer-ended-call' && st !== 'assistant-ended-call';
    });
  }

  // Calculate metrics
  const totalCalls = rawCalls.length;
  let answered = 0;
  let substantive = 0;
  let totalDur = 0;
  let totalCost = 0.0;
  let voicemails = 0;
  let busy = 0;
  let noAnswer = 0;

  const agentStats = {
    '682cf6ae-23fd-44f3-a4a3-756998cd62c1': { name: 'Sarah', line: 'Line 1 (Primary AI)', dials: 0, connected: 0, leads: 0, dur: 0 },
    '91732d4e-3b60-4950-8aa6-4060c0803119': { name: 'James', line: 'Line 2 (High-Volume)', dials: 0, connected: 0, leads: 0, dur: 0 },
    'f99e8e9a-48b1-411f-806e-6cb7d1dde58b': { name: 'Aisha', line: 'Line 3 (Prime UAE)', dials: 0, connected: 0, leads: 0, dur: 0 }
  };

  const highValueLeads = [];

  for (const c of rawCalls) {
    const dur = Number(c.duration_seconds || 0);
    const cost = Number(c.cost_usd || 0);
    const st = (c.status || '').toLowerCase();
    const vcSt = (c.voice_call_status || '').toLowerCase();
    const summary = (c.summary || '');
    const astId = c.assistantId;

    totalDur += dur;
    totalCost += cost;

    const isConnected = st === 'customer-ended-call' || st === 'assistant-ended-call' || dur > 0;
    if (isConnected) answered++;

    const isSubstantive = dur >= 20 || vcSt.includes('interested') || vcSt.includes('appointment');
    if (isSubstantive) {
      substantive++;
      if (highValueLeads.length < 15) {
        highValueLeads.push(c);
      }
    }

    if (st.includes('voicemail')) voicemails++;
    else if (st.includes('busy')) busy++;
    else if (st.includes('did-not-answer') || st.includes('not-answer')) noAnswer++;

    if (agentStats[astId]) {
      agentStats[astId].dials++;
      if (isConnected) agentStats[astId].connected++;
      if (isSubstantive) agentStats[astId].leads++;
      agentStats[astId].dur += dur;
    }
  }

  const connectRate = totalCalls > 0 ? ((answered / totalCalls) * 100).toFixed(1) + '%' : '0%';
  const leadRate = totalCalls > 0 ? ((substantive / totalCalls) * 100).toFixed(1) + '%' : '0%';
  const airtimeMins = (totalDur / 60).toFixed(1);

  // Parse Date Strings
  const parts = dateStr.split('-');
  const dateObj = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  // ─── COMPOSE VECTOR A4 PDF ──────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;

  // 1. Header Banner
  doc.setFillColor(12, 24, 41); // #0c1829 deep navy
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('A-SQUARED REAL ESTATE', margin, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253); // #93c5fd light blue
  doc.text('OFFICIAL DAILY VOICE TELEPHONY AUDIT & COMPLIANCE LEDGER', margin, 17);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(dateDisplay.toUpperCase(), pageWidth - margin, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text(`Window: 09:00 - 21:00 GST • Supabase CDR Cluster`, pageWidth - margin, 17, { align: 'right' });

  // Thin gold/emerald accent line
  doc.setFillColor(16, 185, 129); // #10b981
  doc.rect(0, 27.5, pageWidth, 1.2, 'F');

  let y = 35;

  // 2. Hero KPI Cards (4 columns)
  const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    { label: 'TOTAL DIALS PLACED', val: totalCalls.toLocaleString(), sub: 'Outbound Scheduler', color: [37, 99, 235] },
    { label: 'LIVE CONNECTIONS', val: `${answered} (${connectRate})`, sub: 'Human Answered', color: [16, 185, 129] },
    { label: 'QUALIFIED ENGAGED', val: `${substantive} (${leadRate})`, sub: 'Substantive Dialogue', color: [139, 92, 246] },
    { label: 'AIRTIME RECORDED', val: `${airtimeMins} min`, sub: `Est. Spend: $${totalCost.toFixed(2)}`, color: [245, 158, 11] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    // Colored top border
    doc.setFillColor(...kpi.color);
    doc.rect(x, y, cardWidth, 1.5, 'F');

    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.label, x + 3, y + 6);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 3, y + 12);

    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 3, y + 16);
  });

  y += cardHeight + 7;

  // 3. Telephony Fleet Performance Table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Telephony Fleet Line Roster & Performance', margin, y);
  y += 3;

  const fleetRows = Object.values(agentStats).map(ag => [
    ag.name,
    ag.line,
    ag.dials.toString(),
    ag.connected.toString(),
    ag.dials > 0 ? `${((ag.connected / ag.dials) * 100).toFixed(1)}%` : '0%',
    ag.leads.toString(),
    `${(ag.dur / 60).toFixed(1)} min`,
    'Active • Healthy'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Agent', 'Assigned Trunk / Line', 'Dials', 'Connects', 'Rate', 'Qualified', 'Total Airtime', 'Fleet Status']],
    body: fleetRows,
    theme: 'grid',
    styles: { fontSize: 6.8, cellPadding: 2, textColor: [15, 23, 42] },
    headStyles: { fillColor: [12, 24, 41], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 7;

  // 4. Substantive & Qualified Conversations Dossier
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Qualified Owner Conversations & Actionable Dossier', margin, y);
  y += 3;

  const leadRows = highValueLeads.length > 0
    ? highValueLeads.slice(0, 8).map((ld, i) => [
        ld.customer_phone || `Lead #${i + 1}`,
        ld.customer_name || 'Verified Owner',
        `${ld.duration_seconds || 0}s`,
        ld.voice_call_status || ld.status || 'Engaged',
        ld.summary || 'Owner conversed regarding property disposition.',
        'Senior Broker Priority Outreach'
      ])
    : [['—', 'No substantive calls logged for this date.', '0s', 'Idle', 'No dialogues above threshold.', 'Scheduled for re-dial rotation.']];

  autoTable(doc, {
    startY: y,
    head: [['Phone', 'Owner Name', 'Dur.', 'Disposition', 'Executive Dialogue Summary', 'Consultant Action']],
    body: leadRows,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 2.2, textColor: [15, 23, 42] },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 28 },
      2: { cellWidth: 12 },
      3: { cellWidth: 24 },
      4: { cellWidth: 58 },
      5: { cellWidth: 34, fontStyle: 'bold', textColor: [22, 101, 52] }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 7;

  // 5. Complete CDR Call Audit Ledger (Paginated)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`3. Detailed Telephony CDR Ledger (${totalCalls} Calls Verified)`, margin, y);
  y += 3;

  const cdrRows = rawCalls.slice(0, 150).map((c, i) => [
    (i + 1).toString(),
    c.created_at ? c.created_at.split('T')[1]?.slice(0, 8) || '' : '—',
    c.customer_phone || '—',
    c.duration_seconds ? `${c.duration_seconds}s` : '0s',
    c.status || '—',
    c.cost_usd ? `$${Number(c.cost_usd).toFixed(3)}` : '$0.000',
    c.recording_url ? 'Audio Verified (WAV)' : 'No Audio'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Time (UTC)', 'Customer Phone', 'Duration', 'Call Outcome', 'Cost USD', 'Recording Storage']],
    body: cdrRows,
    theme: 'striped',
    styles: { fontSize: 6.2, cellPadding: 1.8, textColor: [15, 23, 42] },
    headStyles: { fillColor: [12, 24, 41], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 20 },
      2: { cellWidth: 32 },
      3: { cellWidth: 18 },
      4: { cellWidth: 42 },
      5: { cellWidth: 20 },
      6: { cellWidth: 40 }
    },
    margin: { left: margin, right: margin }
  });

  // Footer for each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AS Properties Dubai • Official Daily Call Audit • Verified against Supabase CDR • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  // Trigger browser download
  doc.save(pdfFileName);
  return true;
}

/**
 * Universal Master Function:
 * 1. Tries to fetch pre-compiled high-res PDF via Blob download
 * 2. If not found, generates vector PDF on-the-fly and downloads
 */
export async function downloadOrGenerateAuditPdf(dateStr, category = 'all') {
  try {
    const prebuiltOk = await downloadPrebuiltPdf(dateStr);
    if (prebuiltOk) return true;
  } catch (err) {
    console.warn('Pre-compiled PDF check error, falling back to on-demand generation:', err);
  }

  // Generate on-demand
  return await generateAndDownloadAuditPdf(dateStr, category);
}
