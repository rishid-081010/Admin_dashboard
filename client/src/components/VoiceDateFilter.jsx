import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Database, Check } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDubaiToday() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

export default function VoiceDateFilter({
  timeFilter,
  setTimeFilter,
  selectedDate,
  setSelectedDate,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  selectedWeek,
  setSelectedWeek,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  activeLabel,
  loading
}) {
  // Today reference in DB context (Dubai GST)
  const TODAY_STR = getDubaiToday();

  // Parse initial selected date for month/year view
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00Z') : new Date(TODAY_STR + 'T00:00:00Z');
  const [viewYear, setViewYear] = useState(() => selectedYear || initialDate.getUTCFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(() => (selectedMonth ? selectedMonth - 1 : (isNaN(initialDate.getUTCMonth()) ? 9 : initialDate.getUTCMonth()))); // 0-indexed

  // Keep viewMonth & viewYear in sync if parent changes them
  useEffect(() => {
    if (selectedYear) setViewYear(selectedYear);
    if (selectedMonth) setViewMonth(selectedMonth - 1);
  }, [selectedYear, selectedMonth]);

  // Navigate to previous month (for Day & Week modes)
  const handlePrevMonth = () => {
    let nextY = viewYear;
    let nextM = viewMonth - 1;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    }
    setViewMonth(nextM);
    setViewYear(nextY);

    if (timeFilter === 'Weekly') {
      setSelectedMonth(nextM + 1);
      setSelectedYear(nextY);
    }
  };

  // Navigate to next month (for Day & Week modes)
  const handleNextMonth = () => {
    let nextY = viewYear;
    let nextM = viewMonth + 1;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    setViewMonth(nextM);
    setViewYear(nextY);

    if (timeFilter === 'Weekly') {
      setSelectedMonth(nextM + 1);
      setSelectedYear(nextY);
    }
  };

  // Navigate years (for Month mode)
  const handlePrevYear = () => {
    const nextY = viewYear - 1;
    setViewYear(nextY);
    if (timeFilter === 'Monthly') {
      setSelectedYear(nextY);
    }
  };

  const handleNextYear = () => {
    const nextY = viewYear + 1;
    setViewYear(nextY);
    if (timeFilter === 'Monthly') {
      setSelectedYear(nextY);
    }
  };

  // Switch filter mode (Day, Week, Month, All Time)
  const handleModeChange = (mode) => {
    if (mode === 'Day') {
      setTimeFilter('Daily');
      if (!selectedDate) setSelectedDate(TODAY_STR);
    } else if (mode === 'Week') {
      setTimeFilter('Weekly');
      setSelectedYear(viewYear);
      setSelectedMonth(viewMonth + 1);
      if (!selectedWeek || selectedWeek < 1 || selectedWeek > 5) {
        setSelectedWeek(viewMonth === 9 && viewYear === 2026 ? 2 : 1);
      }
    } else if (mode === 'Month') {
      setTimeFilter('Monthly');
      setSelectedYear(viewYear);
      setSelectedMonth(viewMonth + 1);
    } else if (mode === 'Custom') {
      setTimeFilter('Custom');
    } else if (mode === 'All Time') {
      setTimeFilter('All Time');
    }
  };

  // Quick preset ranges for Custom mode
  const handleCustomPreset = (days) => {
    const end = new Date(TODAY_STR + 'T00:00:00Z');
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    if (setCustomStartDate) setCustomStartDate(sStr);
    if (setCustomEndDate) setCustomEndDate(eStr);
    setTimeFilter('Custom');
  };

  const handleThisMonthPreset = () => {
    const parts = TODAY_STR.split('-');
    const sStr = `${parts[0]}-${parts[1]}-01`;
    if (setCustomStartDate) setCustomStartDate(sStr);
    if (setCustomEndDate) setCustomEndDate(TODAY_STR);
    setTimeFilter('Custom');
  };

  // Handle day click (Day mode)
  const handleSelectDay = (day) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const newDateStr = `${viewYear}-${mStr}-${dStr}`;
    setSelectedDate(newDateStr);
    setTimeFilter('Daily');
  };

  // Handle week selection (Week mode)
  const handleSelectWeek = (weekNum) => {
    setSelectedWeek(weekNum);
    setSelectedMonth(viewMonth + 1);
    setSelectedYear(viewYear);
  };

  // Handle month click (Month mode)
  const handleSelectMonth = (monthIndex) => {
    setSelectedMonth(monthIndex + 1);
    setSelectedYear(viewYear);
  };

  // Quick jump to today
  const handleJumpToToday = () => {
    const parts = TODAY_STR.split('-');
    const y = parseInt(parts[0], 10) || 2026;
    const m = parseInt(parts[1], 10) || 10;
    setViewYear(y);
    setViewMonth(m - 1);
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDate(TODAY_STR);
    setTimeFilter('Daily');
  };

  // Days in month calculation
  const totalDaysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay(); // 0 = Sun

  // Format active scope label for footer
  const formatScopeLabel = () => {
    if (timeFilter === 'All Time') {
      return 'All Time (88,729 Historical Calls)';
    }
    if (timeFilter === 'Custom') {
      return activeLabel || `Custom (${customStartDate || ''} to ${customEndDate || ''})`;
    }
    if (timeFilter === 'Monthly') {
      const activeM = (selectedMonth ? selectedMonth - 1 : viewMonth);
      const activeY = selectedYear || viewYear;
      return `Full Month · ${MONTH_NAMES[activeM]} ${activeY}`;
    }
    if (timeFilter === 'Weekly') {
      const w = selectedWeek || 2;
      const startD = (w - 1) * 7 + 1;
      const endD = Math.min(w * 7, totalDaysInMonth);
      return `Week ${w} (${MONTH_SHORT[viewMonth]} ${startD}–${endD}, ${viewYear})`;
    }
    // Daily
    if (!selectedDate) return 'No Date Selected';
    try {
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(Date.UTC(y, m, d));
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    } catch {
      return selectedDate;
    }
  };

  const currentMode = 
    timeFilter === 'Daily' ? 'Day' :
    timeFilter === 'Weekly' ? 'Week' :
    timeFilter === 'Monthly' ? 'Month' :
    timeFilter === 'Custom' ? 'Custom' : 'All Time';

  return (
    <div className="w-full h-full bg-[#0c1829] border border-[#233549] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 flex flex-col justify-between">
      {/* ─── Mode Selector Pills (Day / Week / Month / Custom / All Time) ───── */}
      <div className="flex items-center justify-center mb-4 shrink-0">
        <div className="bg-[#06111e] border border-[#1b2b3d] p-1 rounded-xl flex items-center gap-1 w-full max-w-md justify-between overflow-x-auto">
          {[
            { id: 'Day', label: 'Day' },
            { id: 'Week', label: 'Week' },
            { id: 'Month', label: 'Month' },
            { id: 'Custom', label: 'Custom Range' },
            { id: 'All Time', label: 'All Time' }
          ].map(({ id, label }) => {
            const isActive = currentMode === id;
            return (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-all ${
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

      {/* ─── 1. DAY MODE: FULL-HEIGHT EXPANDED CALENDAR ────────────── */}
      {currentMode === 'Day' && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in my-1">
          {/* Header: Month Year + Chevrons */}
          <div className="flex items-center justify-between mb-3 px-1 shrink-0">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekdays Row */}
          <div className="grid grid-cols-7 text-center mb-1 shrink-0">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-xs font-semibold text-slate-400 py-1 uppercase tracking-wider">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid (Fills full height of the card evenly) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1 items-stretch">
            {/* Leading empty slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[46px] sm:min-h-[50px] w-full" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(day).padStart(2, '0');
              const currentCellDateStr = `${viewYear}-${mStr}-${dStr}`;

              const isSelectedDay = selectedDate === currentCellDateStr;
              const isToday = currentCellDateStr === TODAY_STR;

              let buttonStyle = 'text-slate-200 hover:text-white hover:bg-[#1b2b3d] border border-transparent';

              if (isSelectedDay) {
                buttonStyle = 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50 border border-emerald-400/60';
              } else if (isToday) {
                buttonStyle = 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/40';
              }

              return (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`min-h-[46px] sm:min-h-[50px] w-full rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold flex items-center justify-center transition-all ${buttonStyle}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 2. WEEKLY MODE: FULL-HEIGHT WEEK CARDS ─────────────────── */}
      {currentMode === 'Week' && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in my-1">
          {/* Header: Month Year + Chevrons */}
          <div className="flex items-center justify-between mb-3 px-1 shrink-0">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Select a week to filter calls
              </p>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 5 Full-Height Week Buttons */}
          <div className="flex-1 flex flex-col justify-between gap-2.5 sm:gap-3">
            {[1, 2, 3, 4, 5].map((w) => {
              const startDay = (w - 1) * 7 + 1;
              const endDay = Math.min(w * 7, totalDaysInMonth);
              const isSelected = (selectedWeek === w) && 
                                 (selectedMonth === viewMonth + 1) && 
                                 (selectedYear === viewYear);

              return (
                <button
                  key={w}
                  onClick={() => handleSelectWeek(w)}
                  className={`w-full flex-1 py-3.5 sm:py-4 px-5 rounded-2xl flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                      : 'bg-[#06111e] border border-[#1b2b3d] text-slate-300 hover:text-white hover:bg-[#1b2b3d] hover:border-[#233549]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      W{w}
                    </span>
                    <span className="text-base font-semibold tracking-wide">
                      Week {w}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs sm:text-sm font-mono ${isSelected ? 'text-white/90 font-bold' : 'text-slate-400'}`}>
                      {MONTH_SHORT[viewMonth]} {startDay} – {endDay}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 3. MONTHLY MODE: FULL-HEIGHT MONTH GRID ────────────────── */}
      {currentMode === 'Month' && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in my-1">
          {/* Header: Year + Chevrons */}
          <div className="flex items-center justify-between mb-3 px-1 shrink-0">
            <button
              onClick={handlePrevYear}
              className="p-2 rounded-xl hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Previous Year"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Year {viewYear}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Select a month to filter calls
              </p>
            </div>

            <button
              onClick={handleNextYear}
              className="p-2 rounded-xl hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Next Year"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 12 Full-Height Month Grid (3 columns x 4 rows) */}
          <div className="flex-1 grid grid-cols-3 gap-2.5 sm:gap-3">
            {MONTH_SHORT.map((mName, idx) => {
              const monthNum = idx + 1;
              const isSelected = (selectedMonth === monthNum) && (selectedYear === viewYear);

              return (
                <button
                  key={mName}
                  onClick={() => handleSelectMonth(idx)}
                  className={`w-full h-full py-4 sm:py-5 px-3 rounded-2xl text-xs font-semibold text-center flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                      : 'bg-[#06111e] border border-[#1b2b3d] text-slate-300 hover:text-white hover:bg-[#1b2b3d] hover:border-[#233549]'
                  }`}
                >
                  <div className="text-base font-bold tracking-wide">{mName}</div>
                  <div className={`text-xs font-mono mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. CUSTOM RANGE MODE: DUAL DATE PICKER & PRESETS ─────────── */}
      {currentMode === 'Custom' && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in my-1 space-y-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick Filter Presets
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 14 Days', days: 14 },
                { label: 'Last 30 Days', days: 30 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => handleCustomPreset(days)}
                  className="py-1.5 px-2 bg-[#06111e] hover:bg-[#1b2b3d] border border-[#1b2b3d] hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all text-center"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={handleThisMonthPreset}
                className="py-1.5 px-2 bg-[#06111e] hover:bg-[#1b2b3d] border border-[#1b2b3d] hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all text-center"
              >
                This Month
              </button>
            </div>

            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Custom Date Window (Dubai GST)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#06111e] border border-[#1b2b3d] rounded-2xl p-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Start Date (From)
                </label>
                <input
                  type="date"
                  value={customStartDate || ''}
                  onChange={(e) => setCustomStartDate && setCustomStartDate(e.target.value)}
                  className="w-full bg-[#0c1829] border border-[#233549] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  End Date (To)
                </label>
                <input
                  type="date"
                  value={customEndDate || ''}
                  onChange={(e) => setCustomEndDate && setCustomEndDate(e.target.value)}
                  className="w-full bg-[#0c1829] border border-[#233549] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Telemetry data dynamically aggregated across selected period</span>
          </div>
        </div>
      )}

      {/* ─── 5. ALL TIME MODE: CENTERED STATUS VIEW ─────────────────── */}
      {currentMode === 'All Time' && (
        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in py-8 px-4 text-center my-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Complete Historical Database
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed mb-4">
            Displaying all 88,729 calls placed across Sarah, Maya, James, and Aisha in the Supabase telephony cluster.
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-emerald-400/90 font-medium">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>All Historical Records Active</span>
          </div>
        </div>
      )}

      {/* ─── Footer: Active Scope Label & Quick Jump ────────────────── */}
      <div className="pt-4 mt-2 border-t border-[#1b2b3d] flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="text-white font-medium truncate">
            {formatScopeLabel()}
          </span>
          {loading && (
            <span className="text-[11px] text-blue-400 font-mono animate-pulse ml-1 shrink-0">
              • Loading...
            </span>
          )}
        </div>

        <button
          onClick={handleJumpToToday}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold transition-colors shrink-0 ml-2"
        >
          Today
        </button>
      </div>
    </div>
  );
}
