import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Mic, Phone, PhoneOff, PhoneOutgoing, Clock, Activity, 
  DollarSign, CheckCircle2, AlertCircle, Copy, ExternalLink, ShieldCheck, 
  Search, Play, Pause, Volume2, VolumeX, FileText, Bot, User, Sparkles, Filter, 
  ChevronLeft, ChevronRight, X, RefreshCw, RotateCcw, RotateCw
} from 'lucide-react';
import { 
  fetchVoiceAgent360, formatDuration, formatCurrency, 
  isQualifiedLead, isCallAnswered, isCallDropOrVoicemail 
} from '../utils/voiceAgentService';

export default function VoiceAgent360({
  agent,
  filterParams,
  onBack
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedField, setCopiedField] = useState(null);
  const [activeCallModal, setActiveCallModal] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1.0);
  const [audioIsMuted, setAudioIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Reset audio playback whenever active call modal opens or changes
  useEffect(() => {
    setIsPlayingAudio(false);
    setAudioCurrentTime(0);
    setAudioDuration(Number(activeCallModal?.duration_seconds) || 0);
    setAudioPlaybackRate(1.0);
    setAudioIsMuted(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = 1.0;
      audioRef.current.muted = false;
    }
  }, [activeCallModal?.id]);

  // Deterministic natural conversational waveform envelope
  const waveformBars = useMemo(() => {
    if (!activeCallModal) return [];
    const seed = activeCallModal.id 
      ? activeCallModal.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) 
      : 42;
    const bars = [];
    for (let i = 0; i < 48; i++) {
      const raw = Math.sin(i * 0.38 + seed) * 0.35 + Math.cos(i * 0.85 + seed * 0.5) * 0.28 + 0.5;
      const height = Math.max(18, Math.min(95, Math.round(raw * 90)));
      bars.push(height);
    }
    return bars;
  }, [activeCallModal?.id]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(err => {
        console.warn('Audio playback error:', err);
      });
    }
  };

  const handleSeek = (newSec) => {
    if (!audioRef.current) return;
    const dur = audioDuration || Number(activeCallModal?.duration_seconds) || 1;
    const clamped = Math.max(0, Math.min(dur, newSec));
    audioRef.current.currentTime = clamped;
    setAudioCurrentTime(clamped);
    if (!isPlayingAudio) {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
    }
  };

  const handleWaveformClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const dur = audioDuration || Number(activeCallModal?.duration_seconds) || 1;
    handleSeek(pct * dur);
  };

  const handleCycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIdx = speeds.indexOf(audioPlaybackRate);
    const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
    setAudioPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !audioIsMuted;
    setAudioIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const formatAudioTime = (seconds) => {
    const s = Math.floor(seconds || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  // Stable string key to avoid re-running on object reference changes
  const filterKey = `${filterParams?.timeFilter}_${filterParams?.selectedDate}_${filterParams?.selectedYear}_${filterParams?.selectedMonth}_${filterParams?.selectedWeek}`;

  // Load 360 data whenever agent, page, search, or statusFilter changes
  useEffect(() => {
    let isMounted = true;
    const load360 = async () => {
      setLoading(true);
      try {
        const res = await fetchVoiceAgent360(
          agent.id, 
          filterParams, 
          page, 
          25, 
          search, 
          statusFilter
        );
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Failed to load Agent 360 data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load360();
    return () => { isMounted = false; };
  }, [agent.id, filterKey, page, search, statusFilter]);

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Calculate local stats from current batch
  const currentCalls = data?.calls || [];
  const totalCallsCount = data?.totalCalls || 0;

  let qualifiedInBatch = 0;
  let answeredInBatch = 0;
  let voicemailsInBatch = 0;
  let busyInBatch = 0;
  let totalDurBatch = 0;
  let durSamples = 0;
  let totalCostBatch = 0;

  for (const c of currentCalls) {
    if (isQualifiedLead(c)) qualifiedInBatch++;
    if (isCallAnswered(c)) answeredInBatch++;
    if (c.status === 'voicemail') voicemailsInBatch++;
    if (c.status === 'customer-busy') busyInBatch++;
    const dur = Number(c.duration_seconds) || 0;
    if (dur > 0) {
      totalDurBatch += dur;
      durSamples++;
    }
    totalCostBatch += Number(c.cost_usd) || 0;
  }

  const batchCount = currentCalls.length || 1;
  const answerRate = ((answeredInBatch / batchCount) * 100).toFixed(1) + '%';
  const qualRate = ((qualifiedInBatch / batchCount) * 100).toFixed(1) + '%';
  const avgDuration = durSamples > 0 ? formatDuration(totalDurBatch / durSamples) : '24s';

  // Format transcript into lines with estimated audio timeline offsets
  const parseTranscript = (raw, totalDurSec = 0) => {
    if (!raw) return [];
    const lines = (typeof raw !== 'string' ? [String(raw)] : raw.split('\n'))
      .map(line => line.trim())
      .filter(Boolean);

    const totalChars = lines.reduce((acc, l) => acc + l.length, 0) || 1;
    let accumulatedChars = 0;

    return lines.map((line, idx) => {
      const isAI = line.startsWith('AI:') || line.startsWith('Assistant:');
      const isUser = line.startsWith('User:') || line.startsWith('Human:') || line.startsWith('Customer:');
      const text = line.replace(/^(AI|Assistant|User|Human|Customer):\s*/i, '');
      const startSec = Math.round((accumulatedChars / totalChars) * (totalDurSec || 30));
      accumulatedChars += line.length;
      return { 
        id: idx,
        isAI, 
        isUser, 
        speaker: isAI ? `${agent?.name || 'Voice Bot'} (AI)` : (isUser ? 'Property Owner' : 'Dialogue'), 
        text,
        startSec
      };
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar pr-1 -mr-1 text-slate-100 animate-fade-in">
      
      {/* ─── Breadcrumb & Top Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Voice Center
          </button>
          <span className="text-white/20">/</span>
          <span className="text-xs text-white/50 uppercase tracking-wider font-mono">
            Voice Agent 360 / {agent.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Telephony Line
          </span>
        </div>
      </div>

      {/* ─── Profile Header Widget ───────────────────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 mb-6 shadow-xl shadow-black/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* Avatar with Glow */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${agent.avatarBg} border ${agent.borderColor} flex items-center justify-center text-white text-2xl font-bold shadow-inner relative flex-shrink-0`}>
            <Mic className={`w-8 h-8 ${agent.textColor}`} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse"></span>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-mono tracking-widest uppercase font-bold px-2 py-0.5 rounded-md border ${agent.badgeClass}`}>
                {agent.line}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
              {agent.name} <span className="text-slate-400 font-normal text-base">— {agent.role}</span>
            </h1>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Voice: <strong className="text-white">{agent.voiceModel}</strong></span>
              <span>&bull;</span>
              <span>Scope: <strong className="text-white">{data?.label || 'Active Period'}</strong></span>
              <span>&bull;</span>
              <button
                onClick={() => copyToClipboard(agent.id, 'assistantId')}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[11px] transition-colors"
                title="Copy Assistant UUID"
              >
                <span>UUID: {agent.id.substring(0, 8)}...</span>
                <Copy className="w-3 h-3" />
                {copiedField === 'assistantId' && <span className="text-emerald-400 text-[10px]">Copied!</span>}
              </button>
            </p>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-4 bg-[#06111e] border border-[#1b2b3d] rounded-xl p-3">
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-slate-400">Total Dialed</div>
            <div className="text-xl font-bold text-white font-mono">{agent.allTimeTotal.toLocaleString()} calls</div>
          </div>
          <div className="h-8 w-[1px] bg-[#1b2b3d]"></div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-slate-400">Filtered Scope</div>
            <div className="text-xl font-bold text-blue-400 font-mono">{totalCallsCount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ─── 4 Hero KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Total Calls in Filter */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Calls Handled</span>
            <PhoneOutgoing className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight font-mono">
              {totalCallsCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 2: Connect / Answer Rate */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Answered Rate</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400 tracking-tight font-mono">
              {answerRate}
            </div>
          </div>
        </div>

        {/* Card 3: Qualified Conversion */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Qualified Leads</span>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight font-mono">
              {qualRate}
            </div>
          </div>
        </div>

        {/* Card 4: Avg Call Duration */}
        <div className="p-5 rounded-2xl bg-[#0c1829] border border-[#233549] hover:border-[#385175] shadow-xl shadow-black/40 flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span>Avg Talk Duration</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-bold text-white tracking-tight font-mono">
              {avgDuration}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search, Filter & Live Call Log Feed ─────────────────────────── */}
      <div className="bg-[#0c1829] border border-[#233549] rounded-2xl p-5 shadow-xl shadow-black/40 relative flex flex-col flex-1 min-h-[420px]">
        
        {/* Feed Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#233549]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Outbound Calls Stream</span>
              <span className="text-xs font-mono font-normal text-slate-400 bg-[#06111e] border border-[#1b2b3d] px-2 py-0.5 rounded-full">
                Page {page} of {data?.totalPages || 1}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any call to listen to the audio recording and inspect dialogue transcripts.
            </p>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone or name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-[#06111e] border border-[#1b2b3d] rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-[#385175] w-52 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All Outcomes' },
            { id: 'QUALIFIED', label: '🎯 Qualified Leads' },
            { id: 'ANSWERED', label: '📞 Answered Calls' },
            { id: 'VOICEMAIL', label: '📬 Voicemails' },
            { id: 'BUSY', label: '⏳ Customer Busy' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => {
                setStatusFilter(f.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 ring-1 ring-blue-400'
                  : 'bg-[#06111e] text-slate-400 hover:text-white hover:bg-[#102035] border border-[#1b2b3d]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table of Calls */}
        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[480px] custom-scrollbar border border-[#1b2b3d] rounded-xl bg-[#06111e]">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="bg-[#071322] text-slate-400 uppercase font-mono text-[10px] sticky top-0 z-10 border-b border-[#233549]">
              <tr>
                <th className="py-2.5 px-3">Date / Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3 text-center">Duration</th>
                <th className="py-2.5 px-3">Status / Outcome</th>
                <th className="py-2.5 px-3 text-right">Cost</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2b3d]/60">
              {loading && !data ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    Fetching call logs from Supabase...
                  </td>
                </tr>
              ) : currentCalls.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No calls found matching the current search &amp; filter criteria.
                  </td>
                </tr>
              ) : (
                currentCalls.map((c) => {
                  const isQual = isQualifiedLead(c);
                  const isAns = isCallAnswered(c);
                  const isDrop = isCallDropOrVoicemail(c);
                  const hasRec = Boolean(c.recording_url);
                  const hasTranscript = Boolean(c.transcript);
                  const timeStr = c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '—';

                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-[#102035] transition-colors cursor-pointer group"
                      onClick={() => setActiveCallModal(c)}
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {timeStr}
                      </td>

                      {/* Customer Name */}
                      <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">
                        {c.customer_name || 'Property Owner'}
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 font-mono text-white/70 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{c.customer_phone || '—'}</span>
                          {c.customer_phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(c.customer_phone, c.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white transition-opacity"
                              title="Copy Phone"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-2.5 px-3 font-mono text-center text-white/70 whitespace-nowrap">
                        {formatDuration(c.duration_seconds)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isQual ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3" /> Qualified Lead
                          </span>
                        ) : isAns ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                            Answered ({c.status})
                          </span>
                        ) : c.status === 'voicemail' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                            Voicemail
                          </span>
                        ) : c.status === 'customer-busy' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                            Busy / Declined
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-white/40 bg-white/5 border border-white/5 w-fit">
                            {c.status || 'No Answer'}
                          </span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="py-2.5 px-3 text-right font-mono text-white/60 whitespace-nowrap">
                        {c.cost_usd ? `$${Number(c.cost_usd).toFixed(3)}` : '$0.00'}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCallModal(c);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-semibold border border-blue-500/20 transition-all flex items-center gap-1 mx-auto"
                        >
                          <Play className="w-3 h-3" /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#233549] text-xs text-slate-400">
          <span>Total matching: <strong className="text-white">{totalCallsCount.toLocaleString()}</strong> calls</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg bg-[#06111e] hover:bg-[#102035] border border-[#1b2b3d] disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
            >
              Previous
            </button>
            <span className="font-mono text-slate-300">Page {page} of {data?.totalPages || 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data?.totalPages || page >= data.totalPages}
              className="px-3 py-1 rounded-lg bg-[#06111e] hover:bg-[#102035] border border-[#1b2b3d] disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── Call Audio & Transcript Modal ───────────────────────────────── */}
      {activeCallModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveCallModal(null)}
        >
          <div 
            className="w-full max-w-2xl bg-[#0c1829] border border-[#233549] rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#233549] mb-4">
              <div>
                <div className="text-xs text-slate-400 font-mono mb-1">
                  ID: {activeCallModal.id}
                </div>
                <h2 className="text-xl font-bold text-white">
                  Call with {activeCallModal.customer_name || 'Property Owner'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>Phone: <strong className="text-white font-mono">{activeCallModal.customer_phone || '—'}</strong></span>
                  <span>&bull;</span>
                  <span>Duration: <strong className="text-white font-mono">{formatDuration(activeCallModal.duration_seconds)}</strong></span>
                  <span>&bull;</span>
                  <span>Cost: <strong className="text-white font-mono">${Number(activeCallModal.cost_usd || 0).toFixed(4)}</strong></span>
                </p>
              </div>

              <button
                onClick={() => setActiveCallModal(null)}
                className="p-1.5 rounded-lg bg-[#06111e] hover:bg-[#102035] text-slate-400 hover:text-white border border-[#1b2b3d] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Audio Waveform Player */}
            {activeCallModal.recording_url ? (
              <div className="bg-[#06111e] border border-[#1b2b3d] rounded-2xl p-4 sm:p-5 mb-4 shadow-xl">
                {/* Audio Element Hidden */}
                <audio
                  ref={audioRef}
                  src={activeCallModal.recording_url}
                  preload="metadata"
                  onTimeUpdate={() => {
                    if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) {
                      const dur = audioRef.current.duration;
                      if (dur && !isNaN(dur) && isFinite(dur)) setAudioDuration(dur);
                    }
                  }}
                  onPlay={() => setIsPlayingAudio(true)}
                  onPause={() => setIsPlayingAudio(false)}
                  onEnded={() => {
                    setIsPlayingAudio(false);
                    setAudioCurrentTime(0);
                  }}
                />

                {/* Header row */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <div className="flex items-center gap-2 font-bold text-white tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Telephony Voice Waveform</span>
                  </div>
                  <a
                    href={activeCallModal.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono transition-colors"
                  >
                    Raw Stream <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Interactive Waveform Scrubber Bars */}
                <div 
                  onClick={handleWaveformClick}
                  className="h-16 flex items-center gap-[3px] bg-[#071322] border border-[#16273b] hover:border-emerald-500/40 rounded-xl px-3 py-2 cursor-pointer transition-all relative select-none group"
                  title="Click anywhere along the waveform to jump directly to that moment in the call"
                >
                  {waveformBars.map((barHeight, idx) => {
                    const totalBars = waveformBars.length;
                    const barTime = (idx / totalBars) * (audioDuration || Number(activeCallModal.duration_seconds) || 1);
                    const isPlayed = audioCurrentTime >= barTime;

                    return (
                      <div
                        key={idx}
                        className="flex-1 h-full flex items-center justify-center pointer-events-none"
                      >
                        <div
                          style={{ height: `${barHeight}%` }}
                          className={`w-full rounded-full transition-all duration-75 ${
                            isPlayed
                              ? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                              : 'bg-slate-700/70 group-hover:bg-slate-600/80'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Audio Controls Bar */}
                <div className="flex items-center justify-between mt-3 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Rewind 10s */}
                    <button
                      onClick={() => handleSeek(audioCurrentTime - 10)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Rewind 10 seconds"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Big Play / Pause */}
                    <button
                      onClick={handleTogglePlay}
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
                      title={isPlayingAudio ? 'Pause' : 'Play'}
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Forward 10s */}
                    <button
                      onClick={() => handleSeek(audioCurrentTime + 10)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Forward 10 seconds"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Time Counter */}
                    <div className="font-mono text-xs text-white/90 ml-2 font-medium tracking-tight">
                      <span className="text-emerald-400">{formatAudioTime(audioCurrentTime)}</span>
                      <span className="text-white/30 mx-1">/</span>
                      <span className="text-white/60">{formatAudioTime(audioDuration || activeCallModal.duration_seconds)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Playback speed multiplier */}
                    <button
                      onClick={handleCycleSpeed}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[11px] font-semibold text-white/80 hover:text-white transition-colors"
                      title="Change playback speed"
                    >
                      {audioPlaybackRate}x
                    </button>

                    {/* Mute button */}
                    <button
                      onClick={handleToggleMute}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title={audioIsMuted ? 'Unmute' : 'Mute'}
                    >
                      {audioIsMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#06111e] border border-[#1b2b3d] rounded-xl p-3 mb-4 text-xs text-slate-400 flex items-center gap-2">
                <PhoneOff className="w-4 h-4 text-amber-400" />
                <span>No audio recording available for this call attempt (call did not bridge to audio storage).</span>
              </div>
            )}

            {/* AI Summary Card (if present) */}
            {activeCallModal.summary && (
              <div className="bg-[#06111e] border border-[#1b2b3d] rounded-xl p-3.5 mb-4 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Conversation Summary
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {activeCallModal.summary}
                </p>
              </div>
            )}

            {/* Dialogue Transcript with Click-to-Seek Synchronization */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Interactive Dialogue Transcript</span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal lowercase">
                  Click any dialogue timestamp to jump audio
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar bg-[#06111e] border border-[#1b2b3d] rounded-xl p-4 space-y-3">
                {activeCallModal.transcript ? (
                  (() => {
                    const parsed = parseTranscript(activeCallModal.transcript, activeCallModal.duration_seconds);
                    return parsed.map((turn, idx) => {
                      const isNextTurn = idx < parsed.length - 1;
                      const nextTurnStart = isNextTurn ? parsed[idx + 1].startSec : Infinity;
                      const isActiveTurn = audioCurrentTime >= turn.startSec && audioCurrentTime < nextTurnStart;

                      return (
                        <div 
                          key={turn.id} 
                          className={`flex flex-col transition-all duration-150 ${turn.isAI ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[10px] font-mono text-white/50">
                              {turn.speaker}
                            </span>
                            {activeCallModal.recording_url && (
                              <button
                                onClick={() => handleSeek(turn.startSec)}
                                className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded transition-all ${
                                  isActiveTurn
                                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                                    : 'bg-white/5 hover:bg-emerald-500/20 text-emerald-400'
                                }`}
                                title={`Jump audio to ${formatAudioTime(turn.startSec)}`}
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>{formatAudioTime(turn.startSec)}</span>
                              </button>
                            )}
                          </div>

                          <div 
                            onClick={() => activeCallModal.recording_url && handleSeek(turn.startSec)}
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed cursor-pointer transition-all ${
                              turn.isAI 
                                ? (isActiveTurn 
                                    ? 'bg-blue-600/40 border-2 border-emerald-400 text-white rounded-tl-sm shadow-lg shadow-emerald-500/10' 
                                    : 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tl-sm hover:border-blue-400/50')
                                : (isActiveTurn 
                                    ? 'bg-white/20 border-2 border-emerald-400 text-white rounded-tr-sm shadow-lg shadow-emerald-500/10' 
                                    : 'bg-white/10 border border-white/15 text-white rounded-tr-sm hover:border-white/30')
                            }`}
                          >
                            {turn.text}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="text-center py-8 text-xs text-white/40 italic">
                    No speech transcript captured for this call attempt.
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setActiveCallModal(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
