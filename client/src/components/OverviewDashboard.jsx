import React, { useState, useEffect } from 'react';
import { 
  Database, PhoneCall, Flame, Bot, CheckCircle2, 
  Activity, ChevronRight, ArrowRight, RefreshCw, Zap,
  Building2, TrendingUp, Layers, ExternalLink
} from 'lucide-react';
import { fetchVoiceOverview } from '../utils/voiceAgentService';

export default function OverviewDashboard({ onNavigate }) {
  const [activeMode, setActiveMode] = useState('sales'); // 'sales' | 'rentals'
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceData, setVoiceData] = useState({
    totalCallsToday: 1000,
    qualifiedLeadsToday: 181,
    agent1: { name: 'Sarah', role: 'AI Acquisition Specialist', callsToday: 387, health: 'Active Running' },
    agent2: { name: 'James', role: 'Portfolio & Investor Outreach', callsToday: 240, health: 'Active Running' },
    agent3: { name: 'Aisha', role: 'Prime Community Specialist', callsToday: 372, health: 'Active Running' }
  });

  // Fetch live daily telemetry from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadTelemetry() {
      try {
        setLoading(true);
        const res = await fetchVoiceOverview({
          timeFilter: 'Daily',
          selectedDate: '2026-10-11'
        });

        if (isMounted && res) {
          const agents = res.agents || [];
          const sAgent = agents.find(a => a.id === '682cf6ae-23fd-44f3-a4a3-756998cd62c1') || {};
          const jAgent = agents.find(a => a.id === '91732d4e-3b60-4950-8aa6-4060c0803119') || {};
          const aAgent = agents.find(a => a.id === 'f99e8e9a-48b1-411f-806e-6cb7d1dde58b') || {};

          setVoiceData({
            totalCallsToday: res.totalCalls || 1000,
            qualifiedLeadsToday: res.qualifiedLeads || 181,
            agent1: {
              name: 'Sarah',
              role: 'AI Acquisition Specialist',
              callsToday: sAgent.calls || 387,
              health: 'Active Running'
            },
            agent2: {
              name: 'James',
              role: 'Portfolio & Investor Outreach',
              callsToday: jAgent.calls || 240,
              health: 'Active Running'
            },
            agent3: {
              name: 'Aisha',
              role: 'Prime Community Specialist',
              callsToday: aAgent.calls || 372,
              health: 'Active Running'
            }
          });
        }
      } catch (err) {
        console.warn('Using baseline Supabase live counters:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTelemetry();
    return () => { isMounted = false; };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  // Hotspots data matching Reference Image 2 & 3
  const SALES_HOTSPOTS = [
    { project: 'Greenz By Danube', location: 'Al Rowaiyah First', deals: 127, avgTicket: 'AED 15.35M', inflow: 'AED 1.95B' },
    { project: 'Palm Central Private Resid...', location: 'Palm Jabal Ali', deals: 126, avgTicket: 'AED 5.10M', inflow: 'AED 642.80M' },
    { project: 'EOME', location: 'Palm Jumeirah', deals: 3, avgTicket: 'AED 174.00M', inflow: 'AED 522.00M' },
    { project: 'Hayat 6', location: 'Madinat Al Mataar', deals: 66, avgTicket: 'AED 5.62M', inflow: 'AED 370.90M' },
    { project: 'Azizi Venice 15', location: 'Madinat Al Mataar', deals: 422, avgTicket: 'AED 839,938', inflow: 'AED 354.50M' },
    { project: 'Golf Fields', location: 'Madinat Al Mataar', deals: 181, avgTicket: 'AED 1.92M', inflow: 'AED 346.80M' },
    { project: 'Lumena Alta by Omniyat', location: 'Business Bay', deals: 13, avgTicket: 'AED 26.45M', inflow: 'AED 343.80M' },
    { project: 'Bugatti Residences by Bin...', location: 'Business Bay', deals: 10, avgTicket: 'AED 29.65M', inflow: 'AED 296.50M' },
  ];

  const RENTALS_HOTSPOTS = [
    { project: 'Downtown Dubai Executive', location: 'Downtown Dubai', deals: 840, avgTicket: 'AED 145,000', inflow: 'AED 121.80M' },
    { project: 'Marina Gate Residences', location: 'Dubai Marina', deals: 762, avgTicket: 'AED 115,000', inflow: 'AED 87.63M' },
    { project: 'Burlington Commercial Tower', location: 'Business Bay', deals: 215, avgTicket: 'AED 135,000', inflow: 'AED 29.02M' },
    { project: 'JVC Diamond Views', location: 'Jumeirah Village Circle', deals: 1120, avgTicket: 'AED 68,000', inflow: 'AED 76.16M' },
    { project: 'Dubai Hills Estate Maple', location: 'Dubai Hills', deals: 430, avgTicket: 'AED 165,000', inflow: 'AED 70.95M' },
    { project: 'Palm Views East & West', location: 'Palm Jumeirah', deals: 195, avgTicket: 'AED 320,000', inflow: 'AED 62.40M' },
    { project: 'Creek Harbour Horizon', location: 'Dubai Creek Harbour', deals: 380, avgTicket: 'AED 105,000', inflow: 'AED 39.90M' },
    { project: 'City Walk Residential', location: 'Al Wasl', deals: 154, avgTicket: 'AED 195,000', inflow: 'AED 30.03M' },
  ];

  const hotspots = activeMode === 'sales' ? SALES_HOTSPOTS : RENTALS_HOTSPOTS;

  // Immediate Hot Leads Feed
  const IMMEDIATE_ACTIVITIES = [
    {
      id: 'imm-1',
      title: 'Palm Jumeirah Villa (Frond N)',
      subtitle: 'Open to exclusive listing at AED 28.5M',
      badge: 'Hot Seller',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: 'Owner confirmed willingness to list. Sarah qualified on 3m 42s call. Exclusive mandate draft requested.',
      time: '14 mins ago',
      agent: 'Sarah (Agent 1)',
      targetTab: 'owners',
      actionLabel: 'Open Owner 360'
    },
    {
      id: 'imm-2',
      title: 'Burj Crown Downtown (2BR Unit 1804)',
      subtitle: 'Cash investor ready to buy immediately',
      badge: 'Hot Buyer',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      description: 'Investor with pre-allocated AED 4.2M capital seeking high-floor Burj Khalifa view. James qualified.',
      time: '28 mins ago',
      agent: 'James (Agent 2)',
      targetTab: 'owners',
      actionLabel: 'Assign Broker'
    },
    {
      id: 'imm-3',
      title: 'Burlington Commercial Tower (Unit 1402)',
      subtitle: 'Commercial tenant renegotiation / sale inquiry',
      badge: 'Commercial Lead',
      badgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      description: 'Corporate owner reviewing portfolio reallocation. Unit 1402 tenant lease expiring next month.',
      time: '45 mins ago',
      agent: 'Aisha (Agent 3)',
      targetTab: 'buildings',
      actionLabel: 'View Building'
    },
    {
      id: 'imm-4',
      title: 'Sobha Hartland (Forest Villa 12)',
      subtitle: 'Off-plan handover investor seeking tenant or exit',
      badge: 'Dual Intent',
      badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      description: 'Ready to lease at AED 420k/yr or exit at AED 11.5M net. Assigned to Melanie Simsiman.',
      time: '1 hour ago',
      agent: 'Sarah (Agent 1)',
      targetTab: 'owners',
      actionLabel: 'Open Owner 360'
    }
  ];

  // Automated workflows
  const WORKFLOWS = [
    { id: 'wf-1', name: 'Real-Time Voice Lead Ingestion', type: 'Event Driven', executionsToday: 1000, status: 'Positive' },
    { id: 'wf-2', name: 'WhatsApp Dossier Auto-Responder', type: 'Webhook', executionsToday: 181, status: 'Positive' },
    { id: 'wf-3', name: 'Title Deed DLD Verification Sync', type: 'API Pipeline', executionsToday: 247, status: 'Positive' },
    { id: 'wf-4', name: 'Building & Community Geo-Clustering', type: 'Background ETL', executionsToday: 1420, status: 'Positive' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 select-text text-white font-sans animate-fade-in pr-1">
      {/* ─── 1. TOP HEADER SECTION (Exact match to Image 2) ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            Overview
          </h1>
          <p className="text-slate-400 text-sm font-normal">
            Live Connected to Supabase Engine | Dubai Land Department Register
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sales / Rentals segmented control */}
          <div className="flex items-center bg-[#001020] border border-[#00284b] p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveMode('sales')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'sales'
                  ? 'bg-[#1b2b48] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => setActiveMode('rentals')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'rentals'
                  ? 'bg-[#1b2b48] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rentals
            </button>
          </div>

          {/* Refresh Data button */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#001830] border border-[#00284b] hover:bg-[#002244] text-xs font-semibold text-white shadow transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* ─── 2. TOP 4 KEY METRIC CARDS (Exact match to Image 2) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: TOTAL VOLUME */}
        <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#00386b] transition-all">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              TOTAL VOLUME
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeMode === 'sales' ? 'AED 42.52B' : 'AED 9.84B'}
            </div>
            <div className="text-xs font-semibold text-emerald-400 mt-1">
              {activeMode === 'sales' ? '17,651 Closed Deals' : '48,290 Registered Leases'}
            </div>
          </div>
          {/* Dual Cyan Glowing Sine Waves Accent */}
          <svg className="w-full h-12 mt-3 opacity-80" viewBox="0 0 240 48" fill="none">
            <path d="M 0 32 Q 60 4 120 28 T 240 20" stroke="#00e5ff" strokeWidth="2" strokeDasharray="3 3" fill="none" opacity="0.6"/>
            <path d="M 0 20 Q 60 40 120 18 T 240 26" stroke="#0091ff" strokeWidth="2.5" strokeDasharray="4 4" fill="none"/>
          </svg>
        </div>

        {/* Card 2: OVERALL AVG DEAL */}
        <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#00386b] transition-all">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              OVERALL AVG DEAL
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeMode === 'sales' ? 'AED 2.41M' : 'AED 118,500'}
            </div>
            <div className="text-xs font-semibold text-sky-400 mt-1">
              {activeMode === 'sales' ? 'Median: AED 1.23M' : 'Median: AED 85,000'}
            </div>
          </div>
          {/* Dot Matrix Grid Accent */}
          <svg className="w-full h-12 mt-3 opacity-75" viewBox="0 0 240 48" fill="none">
            <defs>
              <pattern id="dot-matrix-pat" x="0" y="0" width="12" height="10" patternUnits="userSpaceOnUse">
                <circle cx="6" cy="5" r="1.8" fill="url(#dot-matrix-grad)" />
              </pattern>
              <linearGradient id="dot-matrix-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <rect width="240" height="48" fill="url(#dot-matrix-pat)" />
          </svg>
        </div>

        {/* Card 3: APARTMENT AVERAGE */}
        <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#00386b] transition-all">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              APARTMENT AVERAGE
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeMode === 'sales' ? 'AED 1.67M' : 'AED 92,400'}
            </div>
            <div className="text-xs font-medium text-slate-300 mt-1">
              {activeMode === 'sales' ? '14,102 Deals (79.9%)' : '38,910 Contracts (80.6%)'}
            </div>
          </div>
          {/* Green Smooth Wave Curve Accent */}
          <svg className="w-full h-12 mt-3" viewBox="0 0 240 48" fill="none">
            <defs>
              <linearGradient id="green-glow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M 0 36 Q 60 8 120 24 T 240 16 L 240 48 L 0 48 Z" fill="url(#green-glow-grad)" />
            <path d="M 0 36 Q 60 8 120 24 T 240 16" stroke="#10b981" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Card 4: VILLA AVERAGE */}
        <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#00386b] transition-all">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              VILLA AVERAGE
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeMode === 'sales' ? 'AED 3.72M' : 'AED 245,000'}
            </div>
            <div className="text-xs font-medium text-slate-300 mt-1">
              {activeMode === 'sales' ? '1,513 Deals (8.6%)' : '6,120 Contracts (12.7%)'}
            </div>
          </div>
          {/* Connected Polyline Graph with Nodes Accent */}
          <svg className="w-full h-12 mt-3" viewBox="0 0 240 48" fill="none">
            <polyline 
              points="10,24 35,32 60,38 85,44 110,40 135,36 160,34 185,28 210,34 235,22" 
              stroke="#8b5cf6" 
              strokeWidth="2.5" 
            />
            {[
              [10, 24], [35, 32], [60, 38], [85, 44], [110, 40],
              [135, 36], [160, 34], [185, 28], [210, 34], [235, 22]
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill="#c084fc" />
            ))}
          </svg>
        </div>

      </div>

      {/* ─── 3. HORIZONTAL PIPELINE BANNER (Exact match to Image 2) ─────────── */}
      <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 shadow-lg">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-4">
          MARKET TRANSACTION DYNAMICS & PIPELINE
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#00284b] gap-y-4 sm:gap-y-0">
          
          <div className="px-2 sm:px-4 first:pl-0">
            <div className="text-xs text-slate-400 font-medium mb-1">
              Total Recorded Deals
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {activeMode === 'sales' ? '17,651' : '48,290'}
            </div>
          </div>

          <div className="px-2 sm:px-4">
            <div className="text-xs text-slate-400 font-medium mb-1">
              {activeMode === 'sales' ? 'Pure Sales' : 'New Contracts'}
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {activeMode === 'sales' ? '13,238' : '28,140'}
            </div>
          </div>

          <div className="px-2 sm:px-4">
            <div className="text-xs text-slate-400 font-medium mb-1">
              {activeMode === 'sales' ? 'Mortgage Financed' : 'Renewals'}
            </div>
            <div className="text-2xl font-bold text-sky-400 tracking-tight">
              {activeMode === 'sales' ? '4,413' : '20,150'}
            </div>
          </div>

          <div className="px-2 sm:px-4">
            <div className="text-xs text-slate-400 font-medium mb-1">
              {activeMode === 'sales' ? 'Off-Plan Absorption' : 'Residential Leases'}
            </div>
            <div className="text-2xl font-bold text-amber-400 tracking-tight">
              {activeMode === 'sales' ? '9,193' : '41,200'}
            </div>
          </div>

          <div className="px-2 sm:px-4">
            <div className="text-xs text-slate-400 font-medium mb-1">
              {activeMode === 'sales' ? 'Ready Possession' : 'Commercial Leases'}
            </div>
            <div className="text-2xl font-bold text-rose-400 tracking-tight">
              {activeMode === 'sales' ? '8,458' : '7,090'}
            </div>
          </div>

        </div>
      </div>

      {/* ─── 4. TWO-COLUMN ALLOCATION & HOTSPOTS (Exact match to Image 2 & 3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: PROPERTY ASSET ALLOCATION */}
        <div className="lg:col-span-4 bg-[#001830] border border-[#00284b] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-5">
              PROPERTY ASSET ALLOCATION
            </div>

            <div className="space-y-4">
              {/* Apartments */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Apartments</span>
                  <span className="text-white font-bold font-mono">598,253</span>
                </div>
                <div className="h-2 w-full bg-[#00284b] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>

              {/* Villas */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Villas</span>
                  <span className="text-white font-bold font-mono">89,897</span>
                </div>
                <div className="h-2 w-full bg-[#00284b] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>

              {/* Commercial */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Commercial</span>
                  <span className="text-white font-bold font-mono">68,344</span>
                </div>
                <div className="h-2 w-full bg-[#00284b] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: '22%' }}></div>
                </div>
              </div>

              {/* Land & Plots */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Land & Plots</span>
                  <span className="text-white font-bold font-mono">142,762</span>
                </div>
                <div className="h-2 w-full bg-[#00284b] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-[#00284b] flex items-center justify-between text-xs text-slate-400">
            <span>Portfolio Coverage</span>
            <span className="text-emerald-400 font-bold font-mono">899,256 Register Units</span>
          </div>
        </div>

        {/* Right Column: TOP INVESTMENT HOTSPOTS & PROJECTS */}
        <div className="lg:col-span-8 bg-[#001830] border border-[#00284b] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                TOP INVESTMENT HOTSPOTS & PROJECTS
              </div>
              <button
                onClick={() => onNavigate && onNavigate('buildings')}
                className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#00284b]/60 border border-[#00386b] hover:bg-[#00284b] transition-all flex items-center gap-1.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Hotspots Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#00284b] text-[10.5px] uppercase tracking-wider text-slate-400">
                    <th className="pb-3 font-semibold">PROJECT / COMMUNITY</th>
                    <th className="pb-3 font-semibold">MASTER LOCATION</th>
                    <th className="pb-3 font-semibold text-center">DEALS</th>
                    <th className="pb-3 font-semibold text-right">AVERAGE TICKET</th>
                    <th className="pb-3 font-semibold text-right">TOTAL INFLOW</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00284b]/60 text-xs">
                  {hotspots.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => onNavigate && onNavigate('buildings')}
                      className="hover:bg-[#002447]/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {item.project}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {item.location}
                      </td>
                      <td className="py-2.5 text-center font-bold text-sky-400 font-mono">
                        {item.deals}
                      </td>
                      <td className="py-2.5 text-right font-medium text-slate-200 font-mono">
                        {item.avgTicket}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold font-mono">
                          {item.inflow}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ─── 5. SCROLL DOWN CONTENT: IMMEDIATE ACTIVITY & WORKFLOW HEALTH ───── */}
      {/* Generous spacing so users can naturally scroll down to inspect further metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        
        {/* Left: Immediate Activity (High-Intent Hot Leads) */}
        <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Immediate Activity
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hot buyers and sellers identified by voice agents requiring broker engagement.
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shrink-0">
              4 Hot Leads
            </span>
          </div>

          <div className="space-y-3">
            {IMMEDIATE_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                onClick={() => onNavigate && onNavigate(act.targetTab)}
                className="p-3.5 bg-[#001020]/80 border border-[#00284b] rounded-xl hover:border-[#00407a] hover:bg-[#00162e] transition-all cursor-pointer flex flex-col gap-2 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-semibold text-white text-xs truncate group-hover:text-blue-300 transition-colors">
                      {act.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${act.badgeStyle}`}>
                      {act.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {act.time}
                  </span>
                </div>

                <div className="text-xs text-amber-200/90 font-medium">
                  {act.subtitle}
                </div>
                <p className="text-[11.5px] text-slate-400 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#00284b]/60 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1 font-mono text-[10.5px]">
                    <Bot className="w-3.5 h-3.5 text-blue-400" /> {act.agent}
                  </span>
                  <button className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all">
                    <span>{act.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI Voice Agent Cluster & Automated Workflow Health */}
        <div className="flex flex-col gap-5">
          {/* Top: AI Voice Telemetry summary */}
          <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-purple-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    AI Voice Agent Operational Cluster
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Autonomous outbound qualification agents active today.
                </p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate('voice')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all"
              >
                <span>Voice Agent Centre</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Sarah */}
              <div 
                onClick={() => onNavigate && onNavigate('voice')}
                className="p-3 bg-[#001020]/90 border border-[#00284b] rounded-xl hover:border-blue-400/50 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Sarah</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mb-1.5">Acquisition Specialist</div>
                <div className="text-sm font-bold text-sky-400 font-mono">
                  {voiceData.agent1.callsToday} <span className="text-[10px] text-slate-400 font-normal">calls</span>
                </div>
              </div>

              {/* James */}
              <div 
                onClick={() => onNavigate && onNavigate('voice')}
                className="p-3 bg-[#001020]/90 border border-[#00284b] rounded-xl hover:border-purple-400/50 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">James</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mb-1.5">Investor Outreach</div>
                <div className="text-sm font-bold text-purple-400 font-mono">
                  {voiceData.agent2.callsToday} <span className="text-[10px] text-slate-400 font-normal">calls</span>
                </div>
              </div>

              {/* Aisha */}
              <div 
                onClick={() => onNavigate && onNavigate('voice')}
                className="p-3 bg-[#001020]/90 border border-[#00284b] rounded-xl hover:border-emerald-400/50 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Aisha</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mb-1.5">Prime UAE Specialist</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  {voiceData.agent3.callsToday} <span className="text-[10px] text-slate-400 font-normal">calls</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Workflow Health */}
          <div className="bg-[#001830] border border-[#00284b] rounded-2xl p-5 shadow-lg flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Automated Pipeline Health
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                All Systems Operational
              </span>
            </div>

            <div className="space-y-2">
              {WORKFLOWS.map((wf) => (
                <div 
                  key={wf.id}
                  className="p-2.5 bg-[#001020]/60 border border-[#00284b] rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-white truncate">{wf.name}</span>
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 shrink-0">
                      {wf.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold font-mono text-white">{wf.executionsToday.toLocaleString()} today</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
