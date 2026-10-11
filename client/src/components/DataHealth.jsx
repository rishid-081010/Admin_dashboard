import React from 'react';
import { Database, CheckCircle, ShieldCheck, FileSpreadsheet, Info } from 'lucide-react';

export default function DataHealth() {
  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 gap-4 overflow-hidden justify-between">
      {/* Top Banner Notice */}
      <div className="bg-[#0b2144]/80 backdrop-blur-xl border border-blue-400/20 rounded-xl px-4 py-2.5 text-xs text-blue-200/90 flex items-center gap-2 shrink-0 shadow-lg">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <span>Published snapshot. Personal owner records stay in the local workspace.</span>
      </div>

      {/* Breadcrumb & Header */}
      <div className="shrink-0">
        <div className="text-[10px] font-mono tracking-widest text-white/40 uppercase mb-1">
          A SQUARED / INTELLIGENCE
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1" style={{ fontFamily: "Georgia, serif" }}>
          Data health
        </h1>
        <p className="text-white/60 text-xs sm:text-sm font-medium">
          Completeness and validity are shown separately from verification.
        </p>
      </div>

      {/* 4 Health Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
        {/* Card 1 */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between group hover:border-white/20 transition-all">
          <div className="w-10 h-1 bg-blue-500 rounded-full mb-3"></div>
          <div className="text-xs text-white/60 font-semibold mb-2">Source files</div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">1,118</div>
          <div className="text-[11.5px] text-white/50">1,380+ tabs processed</div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between group hover:border-white/20 transition-all">
          <div className="w-10 h-1 bg-purple-500 rounded-full mb-3"></div>
          <div className="text-xs text-white/60 font-semibold mb-2">Party observations</div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">3,042,722</div>
          <div className="text-[11.5px] text-white/50">Unique owner profiles indexed</div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between group hover:border-white/20 transition-all">
          <div className="w-10 h-1 bg-emerald-500 rounded-full mb-3"></div>
          <div className="text-xs text-white/60 font-semibold mb-2">Property observations</div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">897,696</div>
          <div className="text-[11.5px] text-white/50">Verified property transactions matched</div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between group hover:border-white/20 transition-all">
          <div className="w-10 h-1 bg-amber-500 rounded-full mb-3"></div>
          <div className="text-xs text-white/60 font-semibold mb-2">Needs review</div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">0</div>
          <div className="text-[11.5px] text-emerald-400 font-medium">100% clean unit format validation</div>
        </div>
      </div>

      {/* Bottom Two Large Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-5 sm:p-6 flex flex-col shadow-2xl min-h-0 overflow-hidden group hover:border-white/20 transition-all">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2 shrink-0" style={{ fontFamily: "Georgia, serif" }}>
            Unresolved transformation issues
          </h3>
          <div className="flex-1 border border-white/10 rounded-xl bg-black/25 flex items-center justify-center relative overflow-hidden min-h-0 p-6">
            <div className="text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <div className="text-white font-bold text-sm">All Transformations Resolved</div>
              <p className="text-white/50 text-xs mt-1 max-w-sm">
                No unresolved parsing errors or corrupted cell values found across 3,042,722 rows.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="bg-[#04152d]/80 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-5 sm:p-6 flex flex-col shadow-2xl min-h-0 overflow-hidden group hover:border-white/20 transition-all">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-2 shrink-0" style={{ fontFamily: "Georgia, serif" }}>
            Validation results
          </h3>
          <p className="text-white/60 text-xs mb-5">
            — unit labels checked against the original text and number formats.
          </p>

          <div className="border-t border-white/10 pt-4 mt-auto">
            <h4 className="text-sm font-bold text-white tracking-wide mb-2" style={{ fontFamily: "Georgia, serif" }}>
              Consolidation policy
            </h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Identical files and exact repeated rows within the same source tab share observations. Matching names, shared phone numbers and unreviewed property keys do not merge identities.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-white/40 shrink-0">
        <span>Reported observations</span>
        <span>Current ownership unverified</span>
        <span>Contacts are not verified for deliverability</span>
      </div>
    </div>
  );
}
