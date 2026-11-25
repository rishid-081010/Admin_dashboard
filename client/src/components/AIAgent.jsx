import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Trash2, ArrowUpRight, ArrowUp, ArrowRight, Plus, X, Bookmark, Play, ExternalLink, RefreshCw, Download, FileText, Volume2, Table, Loader2, Workflow, CheckCircle2, ShieldAlert, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { sendAgentMessage } from '../utils/aiAgentService';
import { downloadOrGenerateAuditPdf } from '../utils/clientAuditPdfGenerator';
import { authService } from '../utils/authService';

function ExecutionPipelineCard({ pipelineEvents, isLive = false }) {
  const [expanded, setExpanded] = useState(false);
  if (!pipelineEvents || pipelineEvents.length === 0) return null;

  const totalSteps = pipelineEvents.length;
  const hasBlocked = pipelineEvents.some(p => p.status === 'blocked');

  return (
    <div className="mb-3 rounded-xl border border-[#233549] bg-[#050e1a]/90 overflow-hidden shadow-md">
      {/* Header / Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#0c1a2d] transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-500/15 text-blue-400">
            {isLive ? <Loader2 className="w-3 h-3 animate-spin" /> : <Workflow className="w-3 h-3" />}
          </div>
          <span className="font-semibold text-slate-200">
            Capability Execution Pipeline
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10243d] text-slate-300 border border-[#1e3a5f]">
            {totalSteps} Steps
          </span>
          {hasBlocked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <ShieldAlert className="w-2.5 h-2.5" /> High-Impact Guardrail
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          <span>{expanded ? 'Hide Details' : 'View Pipeline'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Stepper Details */}
      {expanded && (
        <div className="p-3 pt-1 border-t border-[#1b2b3d]/70 space-y-2">
          {pipelineEvents.map((step, sIdx) => {
            const isCompleted = step.status === 'completed';
            const isBlocked = step.status === 'blocked';
            const isFailed = step.status === 'failed';
            const isRunning = step.status === 'running';

            return (
              <div key={sIdx} className="flex items-start gap-2.5 text-xs">
                <div className="mt-0.5 shrink-0">
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isBlocked && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                  {isFailed && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                  {isRunning && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                  {!isCompleted && !isBlocked && !isFailed && !isRunning && (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-200 font-mono text-[11.5px]">
                      {step.title || step.step}
                    </span>
                    {step.duration_ms && (
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {step.duration_ms}ms
                      </span>
                    )}
                  </div>
                  {step.detail && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  'Download today\'s call audit PDF',
  'Get latest call recording audio',
  'Export 5 Marina owners to CSV',
  'Average 2-bed price in Business Bay',
  'Check n8n workflow health and errors'
];

const DEFAULT_SAVED_PROMPTS = [
  { id: 'sp-1', title: 'Daily Call Audit', text: 'Download today\'s call audit PDF' },
  { id: 'sp-2', title: 'Marina Owners Export', text: 'Export 5 Marina owners to CSV' },
  { id: 'sp-3', title: 'Business Bay 2BR Avg', text: 'Average 2-bed price in Business Bay' },
  { id: 'sp-4', title: 'n8n Health Check', text: 'Check n8n workflow health and errors' }
];

const CAPABILITY_CARDS = [
  {
    title: 'Owner Intelligence',
    description: 'Search 414k+ verified owners, unit portfolios, and direct contacts.',
    borderHover: 'hover:border-blue-500/45',
    sampleQuery: 'Find 5 owners with verified phones in Dubai Marina'
  },
  {
    title: 'Market & Building 360',
    description: 'Inspect tower dossiers, average prices, and DLD community stats.',
    borderHover: 'hover:border-[#b7a990]/45',
    sampleQuery: 'Show me buildings and coverage in Business Bay'
  },
  {
    title: 'Call Intelligence',
    description: 'Access Vapi call recordings, transcripts, and daily call audit PDFs.',
    borderHover: 'hover:border-sky-400/45',
    sampleQuery: 'Download today\'s call audit PDF'
  },
  {
    title: 'Workflows & CRM',
    description: 'Monitor n8n workflow health, listings, and Bitrix24 CRM syncs.',
    borderHover: 'hover:border-emerald-500/45',
    sampleQuery: 'Check n8n workflow health and errors'
  }
];

function AudioPlayerCard({ label, url }) {
  const filename = url.split('/').pop()?.split('?')[0] || 'call_recording.wav';
  return (
    <div className="my-2.5 p-3.5 bg-[#06111e] border border-blue-500/30 rounded-xl flex flex-col gap-2.5 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">
              {label || 'AI Telephony Call Recording'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs sm:max-w-md">
              {filename}
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/25 shrink-0">
          Stereo WAV
        </span>
      </div>

      <audio controls src={url} className="w-full h-8 accent-blue-500 rounded bg-[#0a1829]" />

      <div className="flex items-center gap-2 pt-1 border-t border-[#1b2b3d]/60">
        <a
          href={url}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/25 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Audio (.wav)</span>
        </a>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0c1829] hover:bg-[#152538] text-slate-300 hover:text-white border border-[#233549] text-xs transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open Direct</span>
        </a>
      </div>
    </div>
  );
}

function PdfAuditCard({ label, url }) {
  const filename = url.split('/').pop()?.split('?')[0] || 'AS_PROPERTIES_DAILY_CALL_AUDIT.pdf';
  const [downloading, setDownloading] = useState(false);

  const handlePdfDownload = async (e) => {
    e.preventDefault();
    setDownloading(true);
    try {
      const match = filename.match(/\d{8}/);
      const dateStr = match ? `${match[0].slice(0, 4)}-${match[0].slice(4, 6)}-${match[0].slice(6, 8)}` : '2026-10-15';
      await downloadOrGenerateAuditPdf(dateStr);
    } catch (err) {
      console.warn('Direct download error, opening link:', err);
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-2.5 p-3.5 bg-[#06111e] border border-rose-500/30 rounded-xl flex flex-col gap-2.5 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">
              {label || 'Daily Telephony Call Audit Report'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-md">
              {filename}
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/25 shrink-0">
          Official Audit PDF
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[#1b2b3d]/60">
        <button
          onClick={handlePdfDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-600/25 cursor-pointer"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{downloading ? 'Downloading...' : 'Download Audit (PDF)'}</span>
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0c1829] hover:bg-[#152538] text-slate-300 hover:text-white border border-[#233549] text-xs transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3 h-3" />
          <span>View in Browser</span>
        </a>
      </div>
    </div>
  );
}

function CsvExportCard({ label, url }) {
  const filename = url.split('/').pop()?.split('?')[0] || 'asquared_owners_export.csv';
  return (
    <div className="my-2.5 p-3.5 bg-[#06111e] border border-emerald-500/30 rounded-xl flex flex-col gap-2.5 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">
              {label || 'Exported Real Estate Dataset'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-md">
              {filename}
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
          CSV Export
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[#1b2b3d]/60">
        <a
          href={url}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-600/25 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV (.csv)</span>
        </a>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0c1829] hover:bg-[#152538] text-slate-300 hover:text-white border border-[#233549] text-xs transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open Direct</span>
        </a>
      </div>
    </div>
  );
}

function detectMedia(line) {
  // Check markdown link: [label](url)
  const mdMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+|\/[^\)]+|data:[^\)]+)\)/);
  if (mdMatch) {
    const label = mdMatch[1];
    const url = mdMatch[2];
    if (url.endsWith('.wav') || url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.m4a') || url.includes('call_recordings')) {
      return { type: 'audio', label, url };
    }
    if (url.endsWith('.pdf') || url.includes('/audits/')) {
      return { type: 'pdf', label, url };
    }
    if (url.endsWith('.csv') || url.includes('/exports/') || url.startsWith('data:text/csv')) {
      return { type: 'csv', label, url };
    }
  }

  // Check bare URL
  const rawMatch = line.match(/(https?:\/\/[^\s\)]+)/);
  if (rawMatch) {
    const url = rawMatch[1];
    if (url.endsWith('.wav') || url.endsWith('.mp3') || url.includes('call_recordings')) {
      return { type: 'audio', label: 'Call Recording (WAV)', url };
    }
    if (url.endsWith('.pdf') || url.includes('/audits/')) {
      return { type: 'pdf', label: 'Daily Call Audit (PDF)', url };
    }
    if (url.endsWith('.csv') || url.includes('/exports/')) {
      return { type: 'csv', label: 'Owners Dataset (CSV)', url };
    }
  }
  return null;
}

// Tokenize inline markdown (bold, italic, code, links)
function renderInline(text) {
  if (!text) return null;
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={idx++}>{text.substring(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<strong key={idx++} className="text-white font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={idx++} className="italic text-slate-300">{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={idx++} className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#06111e] text-blue-300 border border-blue-500/20">
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      const label = match[5];
      const url = match[6];
      const isAudio = url.endsWith('.wav') || url.endsWith('.mp3') || url.includes('call_recordings');
      const isPdf = url.endsWith('.pdf') || url.includes('/audits/');

      if (isAudio) {
        parts.push(
          <a
            key={idx++}
            href={url}
            download="recording.wav"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-medium transition-colors my-0.5"
          >
            <Download className="w-3 h-3" />
            <span>{label}</span>
          </a>
        );
      } else if (isPdf) {
        parts.push(
          <a
            key={idx++}
            href={url}
            download={url.split('/').pop()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-xs font-medium transition-colors my-0.5"
          >
            <Download className="w-3 h-3" />
            <span>{label}</span>
          </a>
        );
      } else if (url.endsWith('.csv') || url.includes('/exports/') || url.startsWith('data:text/csv')) {
        parts.push(
          <a
            key={idx++}
            href={url}
            download={url.split('/').pop() || 'dataset.csv'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-medium transition-colors my-0.5"
          >
            <Download className="w-3 h-3" />
            <span>{label}</span>
          </a>
        );
      } else {
        parts.push(
          <a
            key={idx++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-0.5"
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={idx++}>{text.substring(lastIndex)}</span>);
  }
  return parts;
}

// Block markdown formatter
function FormattedMessage({ content }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements = [];
  let currentList = null;
  let currentTable = null;
  let elKey = 0;

  const flushList = () => {
    if (currentList) {
      elements.push(
        <div key={elKey++} className="space-y-1.5 my-2">
          {currentList.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[13px] text-slate-200 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div className="flex-1">{renderInline(item)}</div>
            </div>
          ))}
        </div>
      );
      currentList = null;
    }
  };

  const flushTable = () => {
    if (currentTable) {
      const headerRow = currentTable[0];
      const bodyRows = currentTable.slice(1);
      elements.push(
        <div key={elKey++} className="my-3 overflow-x-auto rounded-lg border border-[#233549] bg-[#06111e]">
          <table className="w-full text-left text-xs border-collapse">
            {headerRow && (
              <thead>
                <tr className="border-b border-[#233549] bg-[#0c1829]">
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2 font-semibold text-slate-300">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-[#1b2b3d]/50 hover:bg-[#0f2136]/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-slate-300">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushList();
      flushTable();
      continue;
    }

    // Markdown Table row
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList();
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        continue;
      }
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      if (!currentTable) currentTable = [];
      currentTable.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={elKey++} className="text-sm font-bold text-white tracking-wide mt-3 mb-1.5 pb-1 border-b border-[#1b2b3d]">
          {renderInline(line.replace(/^###\s+/, ''))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={elKey++} className="text-[15px] font-bold text-white tracking-wide mt-3.5 mb-1.5 pb-1 border-b border-[#233549]">
          {renderInline(line.replace(/^##\s+/, ''))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={elKey++} className="text-base font-bold text-white tracking-tight mt-4 mb-2">
          {renderInline(line.replace(/^#\s+/, ''))}
        </h2>
      );
      continue;
    }

    // Media Card Detection (Audio Recordings, Daily Audit PDFs & CSV Exports)
    const media = detectMedia(line);
    if (media) {
      flushList();
      if (media.type === 'audio') {
        elements.push(<AudioPlayerCard key={elKey++} label={media.label} url={media.url} />);
      } else if (media.type === 'pdf') {
        elements.push(<PdfAuditCard key={elKey++} label={media.label} url={media.url} />);
      } else if (media.type === 'csv') {
        elements.push(<CsvExportCard key={elKey++} label={media.label} url={media.url} />);
      }
      continue;
    }

    // List item
    const listMatch = line.match(/^(\*|-|\d+\.)\s+(.+)$/);
    if (listMatch) {
      if (!currentList) currentList = [];
      currentList.push(listMatch[2]);
      continue;
    } else {
      flushList();
    }

    // Regular paragraph
    elements.push(
      <p key={elKey++} className="text-[13px] leading-relaxed text-slate-200 my-1">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className="space-y-1">{elements}</div>;
}

export default function AIAgent({ currentUser, setActiveTab }) {
  const activeUser = currentUser || authService.getCurrentUser();
  const agentName = activeUser?.name || 'Melanie Simsiman';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedPromptsOpen, setSavedPromptsOpen] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState(() => {
    try {
      const raw = localStorage.getItem('maya_ai_saved_prompts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SAVED_PROMPTS;
  });
  const [showAddPromptForm, setShowAddPromptForm] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const savedPromptsRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('maya_ai_saved_prompts', JSON.stringify(savedPrompts));
    } catch {}
  }, [savedPrompts]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (savedPromptsRef.current && !savedPromptsRef.current.contains(e.target)) {
        setSavedPromptsOpen(false);
      }
    };
    if (savedPromptsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [savedPromptsOpen]);

  const handleSavePrompt = (e) => {
    e.preventDefault();
    const title = newPromptTitle.trim() || newPromptText.trim().slice(0, 28);
    const text = newPromptText.trim();
    if (!text) return;
    setSavedPrompts((prev) => [
      { id: 'sp-' + Date.now(), title, text },
      ...prev
    ]);
    setNewPromptTitle('');
    setNewPromptText('');
    setShowAddPromptForm(false);
  };

  const handleDeletePrompt = (id, e) => {
    e.stopPropagation();
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendAgentMessage(query, messages);

      const assistantMsg = {
        role: 'assistant',
        content: res.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Handle UI directives if instructed by the AI
      if (res.uiDirectives && res.uiDirectives.length > 0) {
        for (const dir of res.uiDirectives) {
          if (dir.action === 'NAVIGATE' && dir.tab && setActiveTab) {
            setTimeout(() => {
              setActiveTab(dir.tab);
            }, 1200);
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to complete request. Please verify network or database connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const isWelcomeState = messages.length === 0 && !loading;

  return (
    <div className="w-full h-full flex flex-col bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 text-white font-sans select-text overflow-hidden">

      {/* ─── Subtle Top Header (when active conversation) ──────────────── */}
      {!isWelcomeState && (
        <div className="shrink-0 px-5 py-3 border-b border-[#1b2b3d] bg-[#071322]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-white tracking-tight">Maya AI</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Operational
            </span>
          </div>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-[#0c1829] hover:bg-[#183153] border border-[#233549] rounded-xl transition-colors cursor-pointer"
            title="New conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* ─── Main Viewport: Welcome Hero OR Active Chat Stream ────────── */}
      {isWelcomeState ? (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center px-4 sm:px-8 py-6">
          <div className="w-full max-w-4xl flex flex-col items-center">
            <h1 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight text-center mb-8">
              Welcome back {agentName}
            </h1>

            {/* 4 Capability Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
              {CAPABILITY_CARDS.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInput(card.sampleQuery);
                    inputRef.current?.focus();
                  }}
                  className={`rounded-2xl bg-[#071322] border border-[#233549] ${card.borderHover} p-5 text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-start shadow-md shadow-black/25 min-h-[110px]`}
                >
                  <h3 className="text-[14px] font-semibold text-white mb-2 tracking-tight group-hover:text-blue-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
                >
                  {/* Message Header: Role label + timestamp */}
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {isUser ? 'You' : 'Maya AI'}
                    </span>
                    <span>·</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Box */}
                  <div
                    className={`rounded-2xl p-4 text-[13.5px] leading-relaxed max-w-[92%] sm:max-w-[82%] shadow-sm ${
                      isUser
                        ? 'bg-[#183153] text-white border border-white/10 rounded-tr-sm'
                        : 'bg-[#071322] text-slate-200 border border-[#233549] rounded-tl-sm'
                    }`}
                  >
                    <div className="select-text font-normal">
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <FormattedMessage content={msg.content} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-start max-w-full">
                <div className="bg-[#071322] border border-[#233549] rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-2.5 text-xs text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  <span className="font-mono">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ─── Bottom Dock: Quick Prompt Pills + Unified Input Box ──────── */}
      <div className="shrink-0 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-5 pt-2 relative" ref={savedPromptsRef}>
        {/* Saved Prompts Popover Drawer */}
        {savedPromptsOpen && (
          <div className="absolute bottom-full left-4 right-4 sm:left-6 sm:right-auto sm:w-[440px] mb-2 bg-[#0c1829] border border-[#233549] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-40">
            {/* Popover Header */}
            <div className="px-4 py-3 border-b border-[#1b2b3d] bg-[#071322] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-white tracking-wide">Saved Prompts</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#183153] text-slate-300 border border-[#233549]">
                  {savedPrompts.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {input.trim() && !showAddPromptForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewPromptTitle(input.trim().slice(0, 28));
                      setNewPromptText(input.trim());
                      setShowAddPromptForm(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#183153] hover:bg-blue-600 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Save input</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAddPromptForm((v) => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#0c1829] hover:bg-[#183153] text-slate-300 hover:text-white border border-[#233549] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavedPromptsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inline Add Prompt Form */}
            {showAddPromptForm && (
              <form
                onSubmit={handleSavePrompt}
                className="p-3 bg-[#06111e] border-b border-[#1b2b3d] space-y-2"
              >
                <input
                  type="text"
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  placeholder="Prompt title (e.g. Marina High-Net-Worth)"
                  className="w-full bg-[#0c1829] border border-[#233549] focus:border-blue-500/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <textarea
                  rows={2}
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="Enter the exact prompt text..."
                  required
                  className="w-full bg-[#0c1829] border border-[#233549] focus:border-blue-500/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPromptForm(false)}
                    className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newPromptText.trim()}
                    className="px-3 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Save Prompt
                  </button>
                </div>
              </form>
            )}

            {/* Saved Prompts List */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-[#1b2b3d]/50">
              {savedPrompts.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400">
                  No saved prompts yet. Click <strong className="text-white">+ New</strong> to save one.
                </div>
              ) : (
                savedPrompts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setInput(p.text);
                      setSavedPromptsOpen(false);
                      setTimeout(() => inputRef.current?.focus(), 30);
                    }}
                    className="px-4 py-2.5 hover:bg-[#071322] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {p.text}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSavedPromptsOpen(false);
                          handleSend(p.text);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-[#183153] rounded-lg transition-colors cursor-pointer"
                        title="Run prompt immediately"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePrompt(p.id, e)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete saved prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Quick Prompt Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 custom-scrollbar">
          {SUGGESTED_PROMPTS.map((promptText, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => handleSend(promptText)}
              disabled={loading}
              className="shrink-0 px-3.5 py-1.5 text-xs bg-[#071322] hover:bg-[#183153] border border-[#233549] hover:border-blue-500/40 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Rounded Prompt Input Card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="bg-[#071322] border border-[#233549] focus-within:border-blue-500/60 rounded-2xl px-4 py-3 shadow-lg shadow-black/30 transition-colors"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Maya AI anything..."
            disabled={loading}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none py-1.5 disabled:opacity-50"
          />

          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#1b2b3d]/50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSavedPromptsOpen(true);
                  setShowAddPromptForm(true);
                  if (input.trim()) {
                    setNewPromptTitle(input.trim().slice(0, 28));
                    setNewPromptText(input.trim());
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#0c1829] rounded-lg transition-colors cursor-pointer"
                title="Add new saved prompt"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSavedPromptsOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer px-2.5 py-1 rounded-lg ${
                  savedPromptsOpen
                    ? 'bg-[#183153] text-white'
                    : 'text-slate-300 hover:text-white hover:bg-[#0c1829]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                <span>Saved prompts</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shadow-md shadow-blue-600/25"
              title="Send message"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
