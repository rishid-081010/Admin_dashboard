import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Trash2, ArrowUpRight, Play, ExternalLink, RefreshCw, Download, FileText, Volume2 } from 'lucide-react';
import { sendAgentMessage } from '../utils/aiAgentService';

const SUGGESTED_PROMPTS = [
  'Download today\'s call audit PDF',
  'Get latest call recording audio',
  'Average 2-bed price in Business Bay',
  'Find 3 uncontacted Marina owners with phone numbers',
  'Check n8n workflow health and errors'
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
        <a
          href={url}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-600/25 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Audit (PDF)</span>
        </a>
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

function detectMedia(line) {
  // Check markdown link: [label](url)
  const mdMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+|\/[^\)]+)\)/);
  if (mdMatch) {
    const label = mdMatch[1];
    const url = mdMatch[2];
    if (url.endsWith('.wav') || url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.m4a') || url.includes('call_recordings')) {
      return { type: 'audio', label, url };
    }
    if (url.endsWith('.pdf') || url.includes('/audits/')) {
      return { type: 'pdf', label, url };
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

    // Media Card Detection (Audio Recordings & Daily Audit PDFs)
    const media = detectMedia(line);
    if (media) {
      flushList();
      if (media.type === 'audio') {
        elements.push(<AudioPlayerCard key={elKey++} label={media.label} url={media.url} />);
      } else if (media.type === 'pdf') {
        elements.push(<PdfAuditCard key={elKey++} label={media.label} url={media.url} />);
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

export default function AIAgent({ setActiveTab }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'AI Agent ready. Ask any query across Owners Data, Call Transcripts, Market Averages, Bitrix CRM, or Workflows.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
        toolCalls: res.toolCalls,
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
    setMessages([
      {
        role: 'assistant',
        content: 'Conversation cleared. Ready for next query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="w-full h-full flex flex-col text-white font-sans select-text overflow-hidden gap-3 pr-1">
      
      {/* ─── Top Header: Minimalist & Clean ───────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl text-white font-bold tracking-tight">
            AI Agent
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational
          </span>
        </div>

        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-[#0c1829] hover:bg-[#152538] border border-[#233549] rounded-xl transition-colors cursor-pointer"
          title="Clear conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* ─── Main Chat Card ───────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-[#0c1829] border border-[#233549] rounded-2xl shadow-xl shadow-black/40 flex flex-col overflow-hidden">
        
        {/* Messages Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
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
                    {isUser ? 'You' : 'Antigravity OS'}
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
                  {/* Tool Badges if executed */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 pb-2.5 border-b border-[#1b2b3d]">
                      {msg.toolCalls.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#06111e] text-blue-300 border border-blue-500/25"
                        >
                          <span>Executed:</span>
                          <span className="font-bold">{t.tool}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message Content rendered with clean typography */}
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
                <span className="font-mono">Processing query across databases...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Bottom Toolbar: Suggestion Chips + Input Bar ─────────────── */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-[#233549] bg-[#071322]">
          
          {/* Quick-Action Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2.5 custom-scrollbar">
            <span className="text-[11px] font-mono text-slate-400 shrink-0 uppercase tracking-wider">
              Quick queries:
            </span>
            {SUGGESTED_PROMPTS.map((promptText, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSend(promptText)}
                disabled={loading}
                className="shrink-0 px-2.5 py-1 text-xs bg-[#0c1829] hover:bg-[#132238] border border-[#233549] hover:border-blue-500/40 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything (e.g. Lead transcript 89042, Business Bay avg price, uncontacted owners)..."
                disabled={loading}
                className="w-full bg-[#06111e] border border-[#1b2b3d] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/70 transition-all shadow-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
