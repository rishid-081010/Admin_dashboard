import React, { useState, useRef } from 'react';
import { 
  Sparkles, RefreshCw, CheckCircle2, Sliders, Download, 
  RotateCcw, Trash2, ArrowLeft, ChevronUp, ChevronDown, 
  Upload, Image as ImageIcon, Send, X, Layers, Check 
} from 'lucide-react';

const ROOM_CATEGORIES = [
  'Living_Room',
  'Master_Bedroom',
  'Bedroom',
  'Modern_Kitchen',
  'Balcony_Skyline_View',
  'Luxury_Bathroom',
  'Dining_Area',
  'Infinity_Pool',
  'Building_Exterior',
  'Foyer_Entrance',
  'Walk_in_Closet',
  'Terrace_Lounge',
  'Property_Photo'
];

const QUICK_DIRECTIVES = [
  { label: '☀️ Lift Dark Shadows', text: 'Lift deep shadows and dark corners on the floor while preserving black depth' },
  { label: '🪟 Pull Window Glare', text: 'Compress harsh window glare to reveal the exterior skyline and balcony view' },
  { label: '❄️ Neutralize Yellow Tint', text: 'Strip warm tungsten ceiling bulb cast to clean 3500K warm-white architectural lighting' },
  { label: '✨ Ultra Texture Crispness', text: 'Enhance micro-contrast on marble veining, joinery, and structural details' },
  { label: '🌅 Subtle Warm Glow', text: 'Add a subtle golden-hour ambient luxury warmth across the room' },
  { label: '🌊 Rich Balcony Pool/Sky', text: 'Enrich natural sky blue and pool water clarity without altering architecture' },
];

export default function PhotoStudio({
  images = [],
  listingId,
  selectedCoverId,
  onSetCover,
  onReorder,
  onDeleteImage,
  onUploadPhotos,
  onBatchEnhance,
  isProcessingBatch,
  customPrompt,
  setCustomPrompt,
  onOpenComparison,
  refineModalImage: externalRefineModalImage,
  setRefineModalImage: externalSetRefineModalImage,
  onSingleEnhance,
  isRetrying = {},
  onDownloadSingle,
}) {
  const [internalRefineModalImage, setInternalRefineModalImage] = useState(null);
  const refineModalImage = externalRefineModalImage !== undefined ? externalRefineModalImage : internalRefineModalImage;
  const setRefineModalImage = externalSetRefineModalImage || setInternalRefineModalImage;
  const [refineDirective, setRefineDirective] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const fileInputRef = useRef(null);

  const completedCount = images.filter((img) => img.status === 'completed' || img.generated_image_location).length;
  const processingCount = images.filter((img) => img.status === 'processing').length;
  const failedCount = images.filter((img) => img.status === 'failed').length;
  const totalCount = images.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllPhotosProcessed = totalCount > 0 && completedCount === totalCount;

  const handleApplyDirective = async (text) => {
    if (!refineModalImage) return;
    setIsRefining(true);
    try {
      await onSingleEnhance(refineModalImage, 'flare', text);
      setRefineModalImage(null);
      setRefineDirective('');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Enhancement Directives Card */}
      <div className="glass-card p-5 border border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Photographic Enhancement Directives
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="re-enhance-flare-btn"
              name="re_enhance_flare"
              onClick={() => onBatchEnhance('flare')}
              disabled={isProcessingBatch}
              className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-xs font-semibold text-blue-300 flex items-center gap-1.5 transition-all border border-blue-500/30 cursor-pointer disabled:opacity-50"
              title="Enhance all photos with high-speed Flare (~15s/photo)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessingBatch ? 'animate-spin' : ''}`} />
              {isProcessingBatch ? 'Processing...' : '⚡ Re-Enhance (Flare)'}
            </button>

            <button
              type="button"
              id="re-enhance-sunburst-btn"
              name="re_enhance_sunburst"
              onClick={() => onBatchEnhance('sunburst')}
              disabled={isProcessingBatch}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-all border border-amber-500/30 cursor-pointer disabled:opacity-50"
              title="Enhance all photos with Sunburst Luxury Master (~25s/photo)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              ☀️ Re-Enhance (Sunburst Luxury)
            </button>
          </div>
        </div>

        <textarea
          id="custom-enhancement-prompt"
          name="custom_prompt"
          rows={2}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Custom AI enhancement instructions (e.g. lift deep shadows on floor, compress window glare, preserve authentic finishes)..."
          className="w-full glass-input rounded-xl p-3 text-bone-100 text-xs font-mono placeholder-slate-500 focus:outline-none transition-all leading-relaxed"
        />
      </div>

      {/* Progress & Health Card */}
      <div className={`glass-card p-6 border border-white/[0.08] transition-all duration-300 ${isAllPhotosProcessed ? 'border-emerald-500/30 bg-gradient-to-br from-[#061826]/90 via-[#071322]/80 to-[#020b18]' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {isAllPhotosProcessed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-400" />
            )}
            <h2 className="text-base sm:text-lg font-sans font-bold text-white">
              {isAllPhotosProcessed ? 'Photographic Processing Complete' : 'Photographic Processing Status'}
            </h2>
          </div>
          <span className={`text-xs sm:text-sm font-bold font-sans ${isAllPhotosProcessed ? 'text-emerald-400' : 'text-blue-400'}`}>
            {isAllPhotosProcessed
              ? `All ${totalCount} Photos Fully Enhanced & Calibrated (100%)`
              : `${completedCount} / ${totalCount} photos completed (${progressPercentage}%)`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/40 rounded-full h-2.5 mb-5 overflow-hidden border border-white/[0.08]">
          <div
            className={`h-full transition-all duration-500 rounded-full ${isAllPhotosProcessed ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Status Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="glass-pill rounded-xl p-3 text-center border border-white/[0.06]">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 block">{completedCount}</span>
            <span className="text-[11px] text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Enhanced
            </span>
          </div>

          <div className="glass-pill rounded-xl p-3 text-center border border-white/[0.06]">
            <span className={`text-xl sm:text-2xl font-bold block ${processingCount > 0 ? 'text-blue-400' : 'text-white/40'}`}>
              {processingCount}
            </span>
            <span className="text-[11px] text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <RefreshCw className={`w-3.5 h-3.5 ${processingCount > 0 ? 'text-blue-400 animate-spin' : 'text-white/40'}`} /> Processing
            </span>
          </div>

          <div className="glass-pill rounded-xl p-3 text-center border border-white/[0.06]">
            <span className={`text-xl sm:text-2xl font-bold block ${failedCount > 0 ? 'text-red-400' : 'text-white/40'}`}>
              {failedCount}
            </span>
            <span className="text-[11px] text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <RotateCcw className={`w-3.5 h-3.5 ${failedCount > 0 ? 'text-red-400' : 'text-white/40'}`} /> Needs Retry
            </span>
          </div>

          <div className="glass-pill rounded-xl p-3 text-center border border-white/[0.06]">
            <span className="text-xl sm:text-2xl font-bold text-white block">{totalCount}</span>
            <span className="text-[11px] text-white/60 font-medium flex items-center justify-center gap-1 mt-0.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Total Photos
            </span>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="glass-card p-4 border border-dashed border-white/[0.12] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Add Additional Property Photos</p>
            <p className="text-[11px] text-white/50">Upload RAW JPEG, PNG, or WebP. Auto-enhancement & watermarking applied automatically.</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadPhotos(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Photos
        </button>
      </div>

      {/* Photo Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {images.map((img, idx) => {
          const isCover = img.id === selectedCoverId || (!selectedCoverId && idx === 0);
          const displayUrl = img.generated_image_location || img.original_image_location || img.url;
          const isEnhanced = !!img.generated_image_location;

          return (
            <div
              key={img.id || idx}
              className={`glass-card overflow-hidden border transition-all flex flex-col justify-between group ${
                isCover ? 'border-amber-400/50 shadow-lg shadow-amber-500/10' : 'border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              {/* Photo Preview Container */}
              <div className="relative aspect-[4/3] bg-black/60 overflow-hidden flex items-center justify-center">
                {displayUrl ? (
                  <img
                    src={displayUrl}
                    alt={img.room_type || `Photo ${idx + 1}`}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/30 text-xs">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span>Photo Processing</span>
                  </div>
                )}

                {/* Cover Pill */}
                {isCover && (
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-black shadow-md flex items-center gap-1">
                    ★ COVER PHOTO
                  </span>
                )}

                {/* Status Pill */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  {isEnhanced ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/80 text-white shadow-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Enhanced
                    </span>
                  ) : img.status === 'processing' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/80 text-white shadow-md flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Processing
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700/80 text-white/80 shadow-md">
                      RAW
                    </span>
                  )}
                </div>

                {/* Reorder Buttons */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded-lg backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => onReorder(idx, idx - 1)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer"
                    title="Move photo left"
                  >
                    <ChevronUp className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(idx, idx + 1)}
                    disabled={idx === images.length - 1}
                    className="p-1 rounded hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer"
                    title="Move photo right"
                  >
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>
              </div>

              {/* Photo Metadata Bar */}
              <div className="p-3.5 bg-black/30 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white/80 font-mono truncate">
                    #{idx + 1} • {(img.room_type || 'Property Photo').replace(/_/g, ' ')}
                  </span>
                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => onSetCover(img.id)}
                      className="text-[10px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                    >
                      Make Cover
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {isEnhanced && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenComparison(img)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-white/[0.08] transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3 h-3 text-blue-400" /> Compare
                      </button>

                      <button
                        type="button"
                        onClick={() => setRefineModalImage(img)}
                        className="py-1.5 px-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-semibold flex items-center gap-1 border border-blue-500/30 transition-colors cursor-pointer"
                        title="AI Darkroom Refinement"
                      >
                        <Sparkles className="w-3 h-3 text-blue-400" /> Refine
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onSingleEnhance(img, 'flare')}
                    disabled={isRetrying[img.id]}
                    className="py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-blue-500/20 text-white/80 hover:text-blue-300 text-xs font-semibold flex items-center gap-1 border border-white/[0.08] transition-colors cursor-pointer"
                    title="Enhance single photo with Flare"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRetrying[img.id] ? 'animate-spin' : ''}`} />
                  </button>

                  {isEnhanced && onDownloadSingle && (
                    <button
                      type="button"
                      onClick={() => onDownloadSingle(img.generated_image_location, `0${idx + 1}_${img.room_type || 'photo'}.jpg`)}
                      className="py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1 border border-white/[0.08] transition-colors cursor-pointer"
                      title="Download photo"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}

                  {onDeleteImage && (
                    <button
                      type="button"
                      onClick={() => onDeleteImage(img.id)}
                      className="py-1.5 px-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-white/60 hover:text-red-400 text-xs font-semibold flex items-center gap-1 border border-white/[0.08] transition-colors cursor-pointer ml-auto"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Darkroom Refine Modal */}
      {refineModalImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="relative w-full max-w-2xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/[0.15] p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white font-sans">
                  AI Darkroom Refine Directives
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefineModalImage(null)}
                className="p-1 rounded-xl hover:bg-white/[0.08] text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/60 mb-4">
              Select a calibrated optical preset or type a specific directive below to adjust exposure, shadows, or window pull.
            </p>

            {/* Quick Directive Pills */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {QUICK_DIRECTIVES.map((qd) => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => setRefineDirective(qd.text)}
                  className="p-2.5 rounded-xl text-left bg-white/[0.04] hover:bg-blue-500/15 border border-white/[0.06] hover:border-blue-500/30 text-xs text-white/80 hover:text-white transition-all cursor-pointer"
                >
                  <p className="font-semibold text-blue-300">{qd.label}</p>
                  <p className="text-[10px] text-white/50 truncate mt-0.5">{qd.text}</p>
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              rows={3}
              value={refineDirective}
              onChange={(e) => setRefineDirective(e.target.value)}
              placeholder="e.g. Lift shadow on living room marble floor, enhance exterior view through the window..."
              className="w-full glass-input rounded-xl p-3 text-bone-100 text-xs font-mono placeholder-slate-500 focus:outline-none transition-all leading-relaxed mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefineModalImage(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyDirective(refineDirective)}
                disabled={isRefining || !refineDirective.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                <span>{isRefining ? 'Applying Refinement...' : 'Apply AI Directive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
