import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Check, FileSpreadsheet, Loader2 } from 'lucide-react';
import { downloadOrGenerateAuditPdf } from '../utils/clientAuditPdfGenerator';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const AUDIT_CATEGORIES = [
  { id: 'all', label: 'All Calls' },
  { id: 'leads', label: 'Qualified Leads' },
  { id: 'drops', label: 'Voicemails & Drops' },
  { id: 'summary', label: 'Summary' }
];

function getDubaiToday() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

const VERIFIED_DAY_STATS = {
  '2026-10-17': { allCalls: 266, leads: 20, drops: 229 },
  '2026-10-16': { allCalls: 1138, leads: 57, drops: 1057 },
  '2026-10-15': { allCalls: 1618, leads: 217, drops: 1283 },
  '2026-10-14': { allCalls: 306, leads: 53, drops: 223 },
  '2026-10-13': { allCalls: 679, leads: 186, drops: 372 },
  '2026-10-12': { allCalls: 156, leads: 12, drops: 133 }
};

function buildRecentDays(todayStr) {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const baseD = new Date(todayStr + 'T00:00:00Z');

  for (let i = 0; i < 6; i++) {
    const cur = new Date(baseD);
    cur.setUTCDate(cur.getUTCDate() - i);
    const dStr = cur.toISOString().split('T')[0];
    const dayName = dayNames[cur.getUTCDay()];

    const stat = VERIFIED_DAY_STATS[dStr] || { allCalls: 0, leads: 0, drops: 0 };

    days.push({
      date: dStr,
      dayName,
      isToday: (i === 0),
      allCalls: stat.allCalls,
      leads: stat.leads,
      drops: stat.drops
    });
  }
  return days;
}

export default function VoiceAuditDownload({
  selectedDate,
  setSelectedDate
}) {
  const todayDubai = React.useMemo(() => getDubaiToday(), []);
  const [recentDays, setRecentDays] = useState(() => buildRecentDays(todayDubai));
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedAuditDate, setSelectedAuditDate] = useState(selectedDate || todayDubai);
  const [downloadingDate, setDownloadingDate] = useState(null);

  // Sync if selectedDate from calendar changes
  React.useEffect(() => {
    if (selectedDate) {
      setSelectedAuditDate(selectedDate);
    }
  }, [selectedDate]);

  // Live query for recent day call counts using exact server-side aggregates
  React.useEffect(() => {
    let isMounted = true;
    async function loadRecentStats() {
      try {
        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
        const headers = {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        };

        const updated = await Promise.all(recentDays.map(async (dayItem) => {
          try {
            const d = dayItem.date;
            const nextDObj = new Date(d + 'T00:00:00Z');
            nextDObj.setUTCDate(nextDObj.getUTCDate() + 1);
            const nextD = nextDObj.toISOString().split('T')[0];

            const startGst = `${d}T00:00:00+04:00`;
            const endGst = `${nextD}T00:00:00+04:00`;

            const rpcRes = await fetch('https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/rpc/get_voice_metrics_v2', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                p_start_time: startGst,
                p_end_time: endGst,
                p_assistant_id: null
              })
            });

            if (rpcRes.ok) {
              const metrics = await rpcRes.json();
              return {
                ...dayItem,
                allCalls: Number(metrics.total_calls) || 0,
                leads: Number(metrics.qualified_leads) || 0,
                drops: Number(metrics.dropped_calls) || 0
              };
            }
            return dayItem;
          } catch (e) {
            return dayItem;
          }
        }));

        if (isMounted) {
          setRecentDays(updated);
        }
      } catch (err) {}
    }
    loadRecentStats();
    return () => { isMounted = false; };
  }, [todayDubai]);

  // Parse month/year
  const activeDateObj = new Date(selectedAuditDate + 'T00:00:00Z');
  const viewYear = activeDateObj.getUTCFullYear() || 2026;
  const viewMonth = isNaN(activeDateObj.getUTCMonth()) ? 9 : activeDateObj.getUTCMonth();

  // Trigger official PDF audit download or on-demand generation
  const handleDownload = async (dateStr, e) => {
    if (e) e.stopPropagation();
    setDownloadingDate(dateStr);

    try {
      await downloadOrGenerateAuditPdf(dateStr, activeCategory);
    } catch (err) {
      console.error('Download audit error:', err);
    } finally {
      setDownloadingDate(null);
    }
  };

  // Get metric label for each row depending on active category
  const getMetricLabel = (item) => {
    if (activeCategory === 'leads') {
      return `${item.leads} leads`;
    }
    if (activeCategory === 'drops') {
      return `${item.drops} drops`;
    }
    if (activeCategory === 'summary') {
      return `Full summary`;
    }
    return `${item.allCalls} calls`;
  };

  // Format footer label
  const formatFooterDate = () => {
    try {
      const parts = selectedAuditDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dObj = new Date(Date.UTC(y, m, d));
      return dObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    } catch {
      return selectedAuditDate;
    }
  };

  return (
    <div className="w-full h-full bg-[#0c1829] border border-[#233549] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 flex flex-col justify-between">
      <div>
        {/* ─── Mode Selector Pills (All Calls / Leads / Drops / Summary) ─ */}
        <div className="flex items-center justify-center mb-5">
          <div className="bg-[#06111e] border border-[#1b2b3d] p-1 rounded-xl flex items-center gap-1 w-full max-w-sm justify-between">
            {AUDIT_CATEGORIES.map(({ id, label }) => {
              const isActive = activeCategory === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Header: Month Year + Chevrons ─────────────────────────── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            onClick={() => {}}
            className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="text-base font-semibold text-white tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Daily Audits
            </p>
          </div>

          <button
            onClick={() => {}}
            className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
            title="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ─── 5 Daily Audit Buttons ─────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          {recentDays.map((item, idx) => {
            const isSelected = selectedAuditDate === item.date;
            const dayNum = item.date.split('-')[2];
            const isDownloading = downloadingDate === item.date;

            return (
              <div
                key={item.date}
                onClick={() => {
                  setSelectedAuditDate(item.date);
                  if (setSelectedDate) setSelectedDate(item.date);
                }}
                className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                    : 'bg-[#06111e] border border-[#1b2b3d] text-slate-300 hover:text-white hover:bg-[#1b2b3d] hover:border-[#233549]'
                }`}
              >
                {/* Left Badge + Date */}
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {dayNum}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold tracking-wide">
                      {item.dayName}, {MONTH_SHORT[viewMonth]} {dayNum}
                    </span>
                    {item.isToday && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        Today
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Metrics + Download Button */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                    {getMetricLabel(item)}
                  </span>

                  <button
                    onClick={(e) => handleDownload(item.date, e)}
                    disabled={isDownloading}
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white text-emerald-700 hover:bg-white/90 shadow'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                    title="Download PDF Audit"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Footer: Active Status & Primary Download ───────────────── */}
      <div className="mt-5 pt-3.5 border-t border-[#1b2b3d] flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-white font-medium">
            {formatFooterDate()} · PDF Audit Ready
          </span>
        </div>

        <button
          onClick={() => handleDownload(selectedAuditDate)}
          disabled={downloadingDate === selectedAuditDate}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-semibold shadow-md shadow-emerald-600/20 transition-all text-xs cursor-pointer"
        >
          {downloadingDate === selectedAuditDate ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Audit</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
