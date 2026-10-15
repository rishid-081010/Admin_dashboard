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

// Baseline metrics for recent days (October 2026)
const RECENT_DAYS = [
  { date: '2026-10-15', dayName: 'Thu', isToday: true, allCalls: 248, leads: 4, drops: 182 },
  { date: '2026-10-14', dayName: 'Wed', isToday: false, allCalls: 306, leads: 2, drops: 214 },
  { date: '2026-10-13', dayName: 'Tue', isToday: false, allCalls: 679, leads: 115, drops: 372 },
  { date: '2026-10-12', dayName: 'Mon', isToday: false, allCalls: 582, leads: 98, drops: 315 },
  { date: '2026-10-11', dayName: 'Sun', isToday: false, allCalls: 491, leads: 74, drops: 280 },
  { date: '2026-10-10', dayName: 'Sat', isToday: false, allCalls: 512, leads: 82, drops: 296 }
];

export default function VoiceAuditDownload({
  selectedDate,
  setSelectedDate
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedAuditDate, setSelectedAuditDate] = useState(selectedDate || '2026-10-15');
  const [downloadingDate, setDownloadingDate] = useState(null);

  // Sync if selectedDate from calendar changes
  React.useEffect(() => {
    if (selectedDate) {
      setSelectedAuditDate(selectedDate);
    }
  }, [selectedDate]);

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
          {RECENT_DAYS.map((item, idx) => {
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
