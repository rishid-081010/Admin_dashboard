import React, { useState } from 'react';
import { 
  AlertTriangle, CheckCircle2, Building2, Phone, FileSpreadsheet, 
  ArrowRight, ShieldCheck, Filter, RefreshCw, X, ChevronRight, Sparkles 
} from 'lucide-react';

const INITIAL_QUEUE_ITEMS = [
  {
    id: 'REV-001',
    category: 'building_alias',
    title: 'Building Name Alias Merge',
    severity: 'Medium',
    community: 'Business Bay',
    reportedValue: 'Burlington Tower',
    canonicalSuggestion: 'Burlington',
    affectedRecords: 2186,
    sourceFile: 'business_bay_commercial_q3.xlsx',
    description: 'Source file reports "Burlington Tower", which should be unified under canonical building entity "Burlington".',
    status: 'pending'
  },
  {
    id: 'REV-002',
    category: 'contact_conflict',
    title: 'Multiple Conflicting Numbers',
    severity: 'High',
    community: 'Downtown Dubai',
    reportedValue: 'Mohammad Al Hashimi',
    canonicalSuggestion: '+971 50 492 1882 (Primary WhatsApp Verified)',
    affectedRecords: 3,
    sourceFile: 'downtown_penthouses_v2.csv',
    description: 'Owner has 2 distinct mobile numbers across different purchase deeds. One confirmed active via WhatsApp delivery.',
    status: 'pending'
  },
  {
    id: 'REV-003',
    category: 'building_alias',
    title: 'Tower Complex Sub-cluster',
    severity: 'Low',
    community: 'Dubai Marina',
    reportedValue: 'Marina Gate Tower 1',
    canonicalSuggestion: 'Marina Gate 1',
    affectedRecords: 342,
    sourceFile: 'marina_gate_handover_2024.xlsx',
    description: 'Alias discrepancy in developer import. Standardizing to "Marina Gate 1".',
    status: 'pending'
  },
  {
    id: 'REV-004',
    category: 'missing_unit',
    title: 'Missing Unit Identifier in Deed',
    severity: 'High',
    community: 'Palm Jumeirah',
    reportedValue: 'Signature Villa Frond N',
    canonicalSuggestion: 'Requires Villa Number Verification',
    affectedRecords: 1,
    sourceFile: 'palm_villas_deed_registry.xlsx',
    description: 'Transaction recorded without unit/plot number. Cross-referencing against DEWA premise catalog.',
    status: 'pending'
  },
  {
    id: 'REV-005',
    category: 'building_alias',
    title: 'Churchill Residence vs Tower 2',
    severity: 'Medium',
    community: 'Business Bay',
    reportedValue: 'Churchill Executive Tower',
    canonicalSuggestion: 'Churchill Executive',
    affectedRecords: 512,
    sourceFile: 'bb_commercial_registry.xlsx',
    description: 'Distinguishing Churchill Executive (Commercial) from Churchill Residency (Residential).',
    status: 'pending'
  },
  {
    id: 'REV-006',
    category: 'contact_conflict',
    title: 'International Format Normalization',
    severity: 'Low',
    community: 'Jumeirah Lakes Towers (JLT)',
    reportedValue: '+44 7911 123456 (UK Expat Owner)',
    canonicalSuggestion: 'E.164 Validated · WhatsApp Enabled',
    affectedRecords: 14,
    sourceFile: 'jlt_cluster_o_owners.xlsx',
    description: 'Non-UAE mobile number flagged for international dialer routing.',
    status: 'pending'
  }
];

export default function ReviewQueue({ onNavigateToBuilding }) {
  const [items, setItems] = useState(INITIAL_QUEUE_ITEMS);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [resolvedIds, setResolvedIds] = useState(new Set());

  const handleResolve = (id, e) => {
    e?.stopPropagation();
    setResolvedIds(prev => new Set([...prev, id]));
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'resolved' } : item));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const handleDefer = (id, e) => {
    e?.stopPropagation();
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'deferred' } : item));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'resolved') return item.status === 'resolved';
    return item.category === activeCategory && item.status !== 'resolved';
  });

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const resolvedCount = items.filter(i => i.status === 'resolved').length;

  return (
    <div className="w-full flex flex-col h-full animate-fade-in text-white/90 overflow-hidden">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 font-mono">
              Data Integrity &amp; Quality Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
            REVIEW QUEUE
          </h1>
          <p className="text-white/60 text-xs sm:text-sm">
            Operational workspace to resolve building alias merges, contact conflicts, and deed evidence anomalies.
          </p>
        </div>

        {/* Aggregate Health Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-[#03152d]/90 border border-amber-500/20 rounded-xl px-3.5 py-2 flex items-center gap-2.5 backdrop-blur-md shadow-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-white/40 uppercase font-mono font-medium leading-none">Pending Decisions</div>
              <div className="text-sm font-bold text-amber-300 leading-tight font-serif mt-0.5">{pendingCount}</div>
            </div>
          </div>

          <div className="bg-[#03152d]/90 border border-emerald-500/20 rounded-xl px-3.5 py-2 flex items-center gap-2.5 backdrop-blur-md shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-white/40 uppercase font-mono font-medium leading-none">Resolved in Session</div>
              <div className="text-sm font-bold text-emerald-300 leading-tight font-serif mt-0.5">{resolvedCount}</div>
            </div>
          </div>

          <div className="bg-[#03152d]/90 border border-white/10 rounded-xl px-3.5 py-2 flex items-center gap-2.5 backdrop-blur-md shadow-lg">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[10px] text-white/40 uppercase font-mono font-medium leading-none">Clean Ingestion Rate</div>
              <div className="text-sm font-bold text-white leading-tight font-serif mt-0.5">99.4%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4 shrink-0 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: `All Pending (${items.filter(i => i.status === 'pending').length})` },
          { id: 'building_alias', label: `Building Aliases (${items.filter(i => i.category === 'building_alias' && i.status === 'pending').length})` },
          { id: 'contact_conflict', label: `Contact Conflicts (${items.filter(i => i.category === 'contact_conflict' && i.status === 'pending').length})` },
          { id: 'missing_unit', label: `Deed Evidence (${items.filter(i => i.category === 'missing_unit' && i.status === 'pending').length})` },
          { id: 'resolved', label: `Resolved (${resolvedCount})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Queue Cards List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-white mb-1">Queue Cleared</h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              All flagged records in this category have been verified against canonical database entities.
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.status === 'resolved'
                  ? 'bg-emerald-950/20 border-emerald-500/30 opacity-70'
                  : 'bg-[#03152d]/80 hover:bg-[#061d3d] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-white/10 text-white/60 font-semibold">
                      {item.id}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                      {item.community}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.severity === 'High' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : item.severity === 'Medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    }`}>
                      {item.severity} Priority
                    </span>
                    <span className="text-[11px] text-white/40">
                      • {item.affectedRecords} affected {item.affectedRecords === 1 ? 'record' : 'records'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/60 mb-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Transformation Box */}
                  <div className="bg-black/30 border border-white/10 rounded-lg p-2.5 flex items-center gap-3 text-xs max-w-xl">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-white/40 uppercase font-mono">Reported in Source</div>
                      <div className="font-semibold text-rose-300 truncate mt-0.5">{item.reportedValue}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-white/40 uppercase font-mono">Canonical Resolution</div>
                      <div className="font-semibold text-emerald-300 truncate mt-0.5">{item.canonicalSuggestion}</div>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'resolved' ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleDefer(item.id, e)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium border border-white/10 transition-all"
                      >
                        Defer
                      </button>
                      <button
                        onClick={(e) => handleResolve(item.id, e)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-[0.98]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept Merge</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
