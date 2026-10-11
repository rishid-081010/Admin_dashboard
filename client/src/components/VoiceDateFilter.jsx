import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  CalendarRange, CalendarDays, Sparkles, Clock, Check
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);

  // Parse current date
  const parsedDate = new Date(selectedDate || '2026-10-10');
  const calYear = parsedDate.getUTCFullYear() || 2026;
  const calMonth = parsedDate.getUTCMonth(); // 0..11
  const calDay = parsedDate.getUTCDate();

  // Navigation for daily calendar month/year
  const handlePrevMonth = () => {
    let newM = calMonth - 1;
    let newY = calYear;
    if (newM < 0) {
      newM = 11;
      newY -= 1;
    }
    const daysInNewM = new Date(Date.UTC(newY, newM + 1, 0)).getUTCDate();
    const newDay = Math.min(calDay, daysInNewM);
    const dateStr = `${newY}-${String(newM + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleNextMonth = () => {
    let newM = calMonth + 1;
    let newY = calYear;
    if (newM > 11) {
      newM = 0;
      newY += 1;
    }
    const daysInNewM = new Date(Date.UTC(newY, newM + 1, 0)).getUTCDate();
    const newDay = Math.min(calDay, daysInNewM);
    const dateStr = `${newY}-${String(newM + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleSelectDay = (day) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowCalendarDropdown(false);
  };

  // Days in current calendar month
  const totalDaysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(calYear, calMonth, 1)).getUTCDay(); // 0 = Sun

  return (
    <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl mb-6 flex flex-col gap-3">
      {/* ─── Top Filter Tabs & Quick Date Badge ────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter Type Pills */}
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 p-1 rounded-xl">
          {[
            { id: 'Daily', label: 'Daily', icon: CalendarIcon },
            { id: 'Weekly', label: 'Weekly', icon: CalendarRange },
            { id: 'Monthly', label: 'Monthly', icon: CalendarDays },
            { id: 'All Time', label: 'All Time', icon: Sparkles }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTimeFilter(id);
                setShowCalendarDropdown(false);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                timeFilter === id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Current Active Scope Display / Quick Selector Trigger */}
        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 font-mono animate-pulse bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              <Clock className="w-3.5 h-3.5 animate-spin" /> Querying Supabase...
            </span>
          )}

          <div className="text-xs font-medium text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-white text-xs">{activeLabel || 'Selected Scope'}</span>
          </div>
        </div>
      </div>

      {/* ─── DAILY MODE: Inbuilt Calendar & Stepper ─────────────────── */}
      {timeFilter === 'Daily' && (
        <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider mr-1">Quick Select:</span>
              <button
                onClick={() => setSelectedDate('2026-10-10')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  selectedDate === '2026-10-10'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                ⚡ Latest (Oct 10, 2026)
              </button>
              <button
                onClick={() => setSelectedDate('2026-10-09')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  selectedDate === '2026-10-09'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                Oct 9, 2026
              </button>
              <button
                onClick={() => setSelectedDate('2026-09-27')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  selectedDate === '2026-09-27'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                High-Volume Dial Day (Sep 27)
              </button>
            </div>

            {/* Toggle Calendar Grid Button */}
            <button
              onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all ml-auto"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>{showCalendarDropdown ? 'Hide Calendar' : 'Pick Day from Calendar'}</span>
            </button>
          </div>

          {/* Interactive Month/Year Stepper + Grid */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3">
            {/* Calendar Month & Year Bar */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <span className="text-[10px] text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded">
                  Day {calDay}
                </span>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Inbuilt Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="text-[10px] font-mono font-bold text-white/30 py-1 uppercase">
                  {d}
                </div>
              ))}

              {/* Leading blank slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1" />
              ))}

              {/* Calendar Days */}
              {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isSelected = dayNum === calDay;
                // Highlight days that have known calls
                const isKnownDataDay = 
                  (calYear === 2026 && calMonth === 9 && (dayNum === 10 || dayNum === 9 || dayNum === 8 || dayNum === 7 || dayNum === 6)) ||
                  (calYear === 2026 && calMonth === 8 && dayNum >= 20);

                return (
                  <button
                    key={dayNum}
                    onClick={() => handleSelectDay(dayNum)}
                    className={`py-1.5 rounded-lg text-xs font-mono transition-all relative flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md shadow-blue-500/30'
                        : isKnownDataDay
                        ? 'bg-white/10 text-white hover:bg-blue-500/20 hover:text-blue-300 font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {isKnownDataDay && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── WEEKLY MODE: Month & Week Picker ───────────────────────── */}
      {timeFilter === 'Weekly' && (
        <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-white/40 font-mono">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value="2026" className="bg-slate-900">2026</option>
                <option value="2025" className="bg-slate-900">2025</option>
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-white/40 font-mono">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1} className="bg-slate-900">
                    {m} {idx >= 4 && idx <= 9 ? '⚡' : ''}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-white/20">|</span>

            {/* Week Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { w: 1, label: 'Week 1 (Days 1–7)' },
                { w: 2, label: 'Week 2 (Days 8–14)' },
                { w: 3, label: 'Week 3 (Days 15–21)' },
                { w: 4, label: 'Week 4 (Days 22–28)' },
                { w: 5, label: 'Week 5 (Days 29–End)' }
              ].map(({ w, label }) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedWeek === w
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-1 ring-blue-400'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── MONTHLY MODE: Month Grid Picker ────────────────────────── */}
      {timeFilter === 'Monthly' && (
        <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50 font-mono uppercase tracking-wider">
              Select Calendar Month ({selectedYear})
            </span>
            <div className="flex items-center gap-1 text-xs">
              <button 
                onClick={() => setSelectedYear(selectedYear - 1)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-white font-mono px-1">{selectedYear}</span>
              <button 
                onClick={() => setSelectedYear(selectedYear + 1)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {MONTH_NAMES.map((name, idx) => {
              const mNum = idx + 1;
              const isSelected = selectedMonth === mNum;
              const callVolume = 
                mNum === 10 ? '7.5k dials' :
                mNum === 9 ? '27.3k dials' :
                mNum === 8 ? '30.9k dials' :
                mNum === 7 ? '8.2k dials' :
                mNum === 5 ? '5.7k dials' : null;

              return (
                <button
                  key={name}
                  onClick={() => setSelectedMonth(mNum)}
                  className={`p-2.5 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400'
                      : 'bg-black/30 border-white/5 hover:border-white/20 text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-300" />}
                  </div>
                  {callVolume && (
                    <span className="text-[10px] font-mono text-emerald-400/90 mt-1 block">
                      ⚡ {callVolume}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ALL TIME MODE: Informational Banner ────────────────────── */}
      {timeFilter === 'All Time' && (
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>Displaying complete database history from May 2026 to October 2026</span>
          </div>
          <span className="font-mono text-white/40">79,993 Recorded Calls Across 3 Lines</span>
        </div>
      )}
    </div>
  );
}
