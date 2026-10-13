import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VoiceDateFilter({
  timeFilter,
  setTimeFilter,
  selectedDate,
  setSelectedDate,
  loading
}) {
  // Parse initial selected date for month view (default to Oct 2026)
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00Z') : new Date('2026-10-13T00:00:00Z');
  const [viewYear, setViewYear] = useState(() => initialDate.getUTCFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(() => (isNaN(initialDate.getUTCMonth()) ? 9 : initialDate.getUTCMonth())); // 0-indexed

  // Today reference in database context (October 13, 2026)
  const TODAY_STR = '2026-10-13';

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Handle day selection
  const handleSelectDay = (day) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const newDateStr = `${viewYear}-${mStr}-${dStr}`;
    setSelectedDate(newDateStr);
    setTimeFilter('Daily');
  };

  // Quick jump to today
  const handleJumpToToday = () => {
    setSelectedDate(TODAY_STR);
    setViewYear(2026);
    setViewMonth(9); // October
    setTimeFilter('Daily');
  };

  // Days in month calculation
  const totalDaysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay(); // 0 = Sun

  // Format active label
  const formatSelectedLabel = () => {
    if (timeFilter === 'All Time') {
      return 'All Time';
    }
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

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto bg-[#0c1829] border border-[#233549] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40 mb-6">
      {/* ─── Header: Month Year + Chevrons ─────────────────────────── */}
      <div className="flex items-center justify-between mb-5 px-1">
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

      {/* ─── Weekdays Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-7 text-center mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-xs font-medium text-slate-400 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* ─── Calendar Days Grid ─────────────────────────────────────── */}
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

          const isSelected = timeFilter === 'Daily' && selectedDate === currentCellDateStr;
          const isToday = currentCellDateStr === TODAY_STR;

          return (
            <button
              key={day}
              onClick={() => handleSelectDay(day)}
              className={`w-9 h-9 mx-auto rounded-full text-sm flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                  : isToday
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-300 font-medium hover:text-white hover:bg-[#1b2b3d]'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* ─── Footer: Selected Date Label & Quick Toggles ────────────── */}
      <div className="mt-5 pt-3.5 border-t border-[#1b2b3d] flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-white font-medium">
            {formatSelectedLabel()}
          </span>
          {loading && (
            <span className="text-[11px] text-blue-400 font-mono animate-pulse ml-1">
              • Loading...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleJumpToToday}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setTimeFilter('All Time')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              timeFilter === 'All Time'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-[#06111e] text-slate-400 hover:text-white border border-[#1b2b3d]'
            }`}
          >
            All Time
          </button>
        </div>
      </div>
    </div>
  );
}
