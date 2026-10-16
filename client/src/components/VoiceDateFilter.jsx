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
    } else if (mode === 'All Time') {
      setTimeFilter('All Time');
    }
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
    setViewYear(2026);
    setViewMonth(9); // October
    setSelectedMonth(10);
    setSelectedYear(2026);
    if (timeFilter === 'Daily') {
      setSelectedDate(TODAY_STR);
    } else if (timeFilter === 'Weekly') {
      setSelectedWeek(2); // Oct 13 falls in week 2 (8-14)
    } else if (timeFilter === 'Monthly') {
      setSelectedMonth(10);
    } else {
      setTimeFilter('Daily');
      setSelectedDate(TODAY_STR);
    }
  };

  // Days in month calculation
  const totalDaysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay(); // 0 = Sun

  // Format active scope label for footer
  const formatScopeLabel = () => {
    if (timeFilter === 'All Time') {
      return 'All Time (81,597 Historical Calls)';
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
    timeFilter === 'Monthly' ? 'Month' : 'All Time';

  return (
    <div className="w-full h-full bg-[#0c1829] border border-[#233549] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 flex flex-col justify-between">
      <div>
        {/* ─── Mode Selector Pills (Day / Week / Month / All Time) ───── */}
      <div className="flex items-center justify-center mb-5">
        <div className="bg-[#06111e] border border-[#1b2b3d] p-1 rounded-xl flex items-center gap-1 w-full max-w-xs justify-between">
          {[
            { id: 'Day', label: 'Day' },
            { id: 'Week', label: 'Week' },
            { id: 'Month', label: 'Month' },
            { id: 'All Time', label: 'All Time' }
          ].map(({ id, label }) => {
            const isActive = currentMode === id;
            return (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold text-center transition-all ${
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

      {/* ─── 1. DAY MODE VIEW ────────────────────────────────────────── */}
      {currentMode === 'Day' && (
        <div className="animate-fade-in">
          {/* Header: Month Year + Chevrons */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h2 className="text-base font-semibold text-white tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekdays Row */}
          <div className="grid grid-cols-7 text-center mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-xs font-medium text-slate-400 py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-y-2 text-center">
            {/* Leading empty slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="w-9 h-9 mx-auto" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(day).padStart(2, '0');
              const currentCellDateStr = `${viewYear}-${mStr}-${dStr}`;

              const isSelectedDay = selectedDate === currentCellDateStr;
              const isToday = currentCellDateStr === TODAY_STR;

              let buttonStyle = 'text-slate-300 font-medium hover:text-white hover:bg-[#1b2b3d]';

              if (isSelectedDay) {
                buttonStyle = 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40';
              } else if (isToday) {
                buttonStyle = 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30';
              }

              return (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`w-9 h-9 mx-auto rounded-full text-sm flex items-center justify-center transition-all ${buttonStyle}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 2. WEEKLY MODE VIEW (5 Buttons for the Month) ───────────── */}
      {currentMode === 'Week' && (
        <div className="animate-fade-in">
          {/* Header: Month Year + Chevrons */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-base font-semibold text-white tracking-wide">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Select a week below
              </p>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 5 Distinct Week Buttons */}
          <div className="flex flex-col gap-2">
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
                  className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                      : 'bg-[#06111e] border border-[#1b2b3d] text-slate-300 hover:text-white hover:bg-[#1b2b3d] hover:border-[#233549]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      W{w}
                    </span>
                    <span className="text-sm font-semibold tracking-wide">
                      Week {w}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
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

      {/* ─── 3. MONTHLY MODE VIEW (12 Months Grid + Year Navigator) ──── */}
      {currentMode === 'Month' && (
        <div className="animate-fade-in">
          {/* Header: Year + Chevrons */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={handlePrevYear}
              className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Previous Year"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-base font-semibold text-white tracking-wide">
                Year {viewYear}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Select a month below
              </p>
            </div>

            <button
              onClick={handleNextYear}
              className="p-1.5 rounded-full hover:bg-[#1b2b3d] text-slate-400 hover:text-white transition-colors"
              title="Next Year"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 12 Months Grid (4 columns x 3 rows) */}
          <div className="grid grid-cols-3 gap-2.5">
            {MONTH_SHORT.map((mName, idx) => {
              const monthNum = idx + 1;
              const isSelected = (selectedMonth === monthNum) && (selectedYear === viewYear);

              return (
                <button
                  key={mName}
                  onClick={() => handleSelectMonth(idx)}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                      : 'bg-[#06111e] border border-[#1b2b3d] text-slate-300 hover:text-white hover:bg-[#1b2b3d] hover:border-[#233549]'
                  }`}
                >
                  <div className="text-sm font-bold tracking-wide">{mName}</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. ALL TIME MODE VIEW ──────────────────────────────────── */}
      {currentMode === 'All Time' && (
        <div className="animate-fade-in py-3 px-2 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Complete Historical Database
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-3">
            Displaying all 81,597 calls placed across Sarah, James, and Aisha in the Supabase telephony cluster.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>All Historical Records Active</span>
          </div>
        </div>
      )}
      </div>

      {/* ─── Footer: Active Scope Label & Quick Jump ────────────────── */}
      <div className="mt-5 pt-3.5 border-t border-[#1b2b3d] flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-white font-medium">
            {formatScopeLabel()}
          </span>
          {loading && (
            <span className="text-[11px] text-blue-400 font-mono animate-pulse ml-1">
              • Loading...
            </span>
          )}
        </div>

        <button
          onClick={handleJumpToToday}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
}
