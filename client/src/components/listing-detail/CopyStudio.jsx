import React, { useState } from 'react';
import { 
  Building2, MessageSquare, Instagram, Mail, Globe, 
  Sparkles, RefreshCw, Copy, Check, AlertTriangle, ShieldCheck, FileText 
} from 'lucide-react';

export default function CopyStudio({
  listing,
  copyData,
  isGenerating,
  onGenerateCopy,
  onCopyText,
  copiedField,
}) {
  const [copyTab, setCopyTab] = useState('portal'); // 'portal' | 'whatsapp' | 'instagram' | 'investor' | 'arabic' | 'russian'
  const [selectedTone, setSelectedTone] = useState('luxury');

  const portalTitle = copyData?.portal_title || '';
  const portalDesc = copyData?.portal_description || '';

  const titleLength = portalTitle.length;
  const descLength = portalDesc.length;
  const descWordCount = portalDesc.trim() ? portalDesc.trim().split(/\s+/).length : 0;

  // Compliance rules
  const isTitleCompliant = titleLength > 0 && titleLength <= 80;
  const isDescCompliant = descLength > 0 && descLength <= 2000;
  const isDescNearLimit = descLength > 1800 && descLength <= 2000;
  const isDescOverLimit = descLength > 2000;

  return (
    <div className="glass-card p-6 mb-8 border border-white/[0.08] relative overflow-hidden">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base font-sans font-bold text-white tracking-tight">
              A Squared AI Copywriting Studio
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              GPT-4o Luxury Real Estate Model
            </span>
          </div>
          <p className="text-xs text-white/60">
            Generates authoritative editorial listings, WhatsApp broadcasts, and multilingual summaries calibrated for Dubai portals.
          </p>
        </div>

        {/* Generate / Tone Toolbar */}
        <div className="flex items-center gap-2">
          <select
            id="copy-tone-selector"
            name="copy_tone"
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="luxury">Signature Luxury Editorial</option>
            <option value="investor_roi">High ROI / Investor Yield</option>
            <option value="fast_deal">Fast Close / Motivated Seller</option>
            <option value="vip_private">VIP Private Office Pitch</option>
          </select>

          <button
            type="button"
            id="generate-copy-btn"
            name="generate_copy_btn"
            onClick={() => onGenerateCopy(selectedTone)}
            disabled={isGenerating}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Synthesizing Copy...' : copyData ? 'Regenerate Copy' : 'Generate AI Copy'}
          </button>
        </div>
      </div>

      {/* Channel Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/[0.06] pb-3">
        <button
          type="button"
          onClick={() => setCopyTab('portal')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            copyTab === 'portal'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400'
              : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> Bayut & Property Finder
        </button>

        <button
          type="button"
          onClick={() => setCopyTab('whatsapp')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            copyTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-400'
              : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Broadcast
        </button>

        <button
          type="button"
          onClick={() => setCopyTab('instagram')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            copyTab === 'instagram'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-500/25 border border-pink-400'
              : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
          }`}
        >
          <Instagram className="w-3.5 h-3.5" /> Instagram Caption
        </button>

        <button
          type="button"
          onClick={() => setCopyTab('investor')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            copyTab === 'investor'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25 border border-amber-400'
              : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" /> VIP Investor Pitch
        </button>

        <button
          type="button"
          onClick={() => setCopyTab('arabic')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            copyTab === 'arabic'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/25 border border-teal-400'
              : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> العربية (Arabic)
        </button>

        <button
          type="button"
          onClick={() => setCopyTab('russian')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            copyTab === 'russian'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25 border border-cyan-400'
              : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> Русский (Russian)
        </button>
      </div>

      {/* Copy Content Area */}
      {copyData ? (
        <div>
          {/* TAB 1: BAYUT & PROPERTY FINDER */}
          {copyTab === 'portal' && (
            <div className="space-y-4">
              {/* Portal Headline / SEO Title */}
              <div className="glass-pill rounded-xl p-4 border border-white/[0.08]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                      SEO Portal Title (Bayut & Property Finder)
                    </span>
                    {/* Live Title Character Counter Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border ${
                      isTitleCompliant
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {isTitleCompliant ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                      {titleLength} / 80 chars {isTitleCompliant ? '(Optimal)' : '(May Truncate)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCopyText(portalTitle, 'Portal Title')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedField === 'Portal Title' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Title!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Title
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {portalTitle}
                </p>
              </div>

              {/* Portal Description with Live Character Count & Truncation Guard */}
              <div className="glass-pill rounded-xl p-4 border border-white/[0.08]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                      Signature Editorial Description & Specifications
                    </span>

                    {/* Live Portal Description Character Counter Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border ${
                      isDescOverLimit
                        ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                        : isDescNearLimit
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {isDescOverLimit ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-red-400" /> Exceeds Property Finder Cap ({descLength} / 2,000 chars)
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> {descLength} / 2,000 chars ({descWordCount} words)
                        </>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCopyText(portalDesc, 'Full Description')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedField === 'Full Description' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Full Description!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Full Description
                      </>
                    )}
                  </button>
                </div>

                <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.06] select-all">
                  {portalDesc}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP BROADCAST */}
          {copyTab === 'whatsapp' && (
            <div className="glass-pill rounded-xl p-4 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  High-Converting WhatsApp Broker Broadcast
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(copyData.whatsapp_copy || '', 'WhatsApp Text')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copiedField === 'WhatsApp Text' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied WhatsApp Text!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy WhatsApp Broadcast
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.06] select-all">
                {copyData.whatsapp_copy || 'No WhatsApp copy generated yet.'}
              </pre>
            </div>
          )}

          {/* TAB 3: INSTAGRAM CAPTION */}
          {copyTab === 'instagram' && (
            <div className="glass-pill rounded-xl p-4 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
                  Luxury Instagram Caption & Targeted Hashtags
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(copyData.instagram_copy || '', 'Instagram Caption')}
                  className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copiedField === 'Instagram Caption' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Caption!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Instagram Caption
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.06] select-all">
                {copyData.instagram_copy || 'No Instagram caption generated yet.'}
              </pre>
            </div>
          )}

          {/* TAB 4: VIP INVESTOR PITCH */}
          {copyTab === 'investor' && (
            <div className="glass-pill rounded-xl p-4 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  VIP Investor Pitch & Deal Memorandum
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(copyData.investor_email || '', 'Investor Pitch')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copiedField === 'Investor Pitch' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Pitch!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Investor Pitch
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.06] select-all">
                {copyData.investor_email || 'No investor pitch generated yet.'}
              </pre>
            </div>
          )}

          {/* TAB 5: ARABIC SUMMARY */}
          {copyTab === 'arabic' && (
            <div className="glass-pill rounded-xl p-4 border border-white/[0.08]" dir="rtl">
              <div className="flex items-center justify-between mb-2" dir="ltr">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                  ملخص العقار باللغة العربية (Formal Arabic Editorial)
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(copyData.arabic_summary || '', 'Arabic Copy')}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copiedField === 'Arabic Copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> تم النسخ!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> نسخ النص العربي
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.06] select-all text-right font-arabic">
                {copyData.arabic_summary || 'لم يتم إنشاء النص العربي بعد.'}
              </pre>
            </div>
          )}

          {/* TAB 6: RUSSIAN SUMMARY */}
          {copyTab === 'russian' && (
            <div className="glass-pill rounded-xl p-4 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  Описание на русском языке (Russian Luxury Translation)
                </span>
                <button
                  type="button"
                  onClick={() => onCopyText(copyData.russian_summary || '', 'Russian Copy')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {copiedField === 'Russian Copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Копировать на русском
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs text-bone-100 whitespace-pre-wrap font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.06] select-all">
                {copyData.russian_summary || 'Русский текст еще не сгенерирован.'}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08]">
          <FileText className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">
            No AI Marketing Copy Generated Yet
          </h3>
          <p className="text-xs text-white/50 max-w-md mx-auto mb-5 leading-relaxed">
            Click the button below to generate high-converting editorial copy, SEO portal titles, and multilingual broadcasts using OpenAI GPT-4o.
          </p>
          <button
            type="button"
            onClick={() => onGenerateCopy(selectedTone)}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {isGenerating ? 'Synthesizing Copy...' : 'Generate Marketing Copy Now'}
          </button>
        </div>
      )}
    </div>
  );
}
