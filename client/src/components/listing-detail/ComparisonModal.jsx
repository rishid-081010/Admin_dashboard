import React from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import BeforeAfterSlider from '../BeforeAfterSlider';

export default function ComparisonModal({
  isOpen,
  onClose,
  image,
  currentIndex = 0,
  totalCount = 0,
  sliderMode = 'orig-vs-refined',
  setSliderMode,
  onPrev,
  onNext,
  onOpenRefine,
  onSingleEnhance,
  isRetrying = false,
}) {
  if (!isOpen || !image) return null;

  // Resolve comparison URLs based on sliderMode
  const getComparisonUrls = () => {
    const raw = image.original_image_location || image.originalUrl || '';
    const auto = image.generated_image_location || image.enhancedUrl || raw;
    const refined = image.custom_refined_location || image.refinedUrl || auto;

    if (sliderMode === 'orig-vs-refined') {
      return {
        leftUrl: raw,
        rightUrl: refined,
        leftLabel: 'Raw Authentic',
        rightLabel: image.custom_refined_location ? '✨ Custom Refined' : '✨ AI Enhanced',
      };
    }
    if (sliderMode === 'baseline-vs-refined') {
      return {
        leftUrl: auto,
        rightUrl: refined,
        leftLabel: '🤖 Auto Enhanced',
        rightLabel: '✨ Custom Refined',
      };
    }
    // orig-vs-baseline
    return {
      leftUrl: raw,
      rightUrl: auto,
      leftLabel: 'Raw Authentic',
      rightLabel: '🤖 Auto Enhanced',
    };
  };

  const comp = getComparisonUrls();
  const roomTitle = (image.room_type || 'Property Photo').replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-5xl glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-black/40 border-b border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-white/[0.06] text-white px-2.5 py-1 rounded-md font-sans">
              #{currentIndex + 1} of {totalCount}
            </span>
            <span className="text-sm font-sans font-bold text-white">
              {roomTitle}
            </span>
            <span className="text-xs text-white/60 font-mono hidden sm:inline">
              {image.original_filename || ''}
            </span>
          </div>

          {/* 3-Way Mode Pills */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSliderMode('orig-vs-refined')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                sliderMode === 'orig-vs-refined'
                  ? 'bg-white/[0.06] text-white font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              📸 Raw vs ✨ Refined
            </button>
            <button
              type="button"
              onClick={() => setSliderMode('baseline-vs-refined')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                sliderMode === 'baseline-vs-refined'
                  ? 'bg-white/[0.06] text-white font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🤖 Auto vs ✨ Refined
            </button>
            <button
              type="button"
              onClick={() => setSliderMode('orig-vs-baseline')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                sliderMode === 'orig-vs-baseline'
                  ? 'bg-white/[0.06] text-white font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              📸 Raw vs 🤖 Auto
            </button>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            {onOpenRefine && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRefine(image);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-white/[0.04] text-blue-300 text-xs font-semibold flex items-center gap-1.5 border border-blue-500/30 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI Refine
              </button>
            )}
            <button
              onClick={onPrev}
              className="p-2 rounded-xl glass-pill hover:bg-white/[0.1] text-bone-100 text-xs font-semibold flex items-center gap-1"
              title="Previous image (Left arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              className="p-2 rounded-xl glass-pill hover:bg-white/[0.1] text-bone-100 text-xs font-semibold flex items-center gap-1"
              title="Next image (Right arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl glass-pill hover:bg-red-600/80 text-bone-100 hover:text-white transition-colors ml-2"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slider Canvas Container */}
        <div className="p-4 sm:p-6 flex-1 flex items-center justify-center overflow-hidden bg-black/40">
          {comp.leftUrl === comp.rightUrl ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-black/50 rounded-2xl border border-white/[0.08] shadow-2xl">
              <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mb-4" />
              <h3 className="text-white font-bold text-base mb-1.5 font-sans">Photographic Enhancement In Progress</h3>
              <p className="text-white/60 text-xs mb-5 leading-relaxed font-sans">
                This photo is currently being processed by the OpenAI Neural Engine. Once finished, the interactive Before/After comparison slider will immediately become available.
              </p>
              {onSingleEnhance && (
                <button
                  onClick={() => onSingleEnhance(image, 'flare')}
                  disabled={isRetrying}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> Enhance Now (Flare)
                </button>
              )}
            </div>
          ) : (
            <BeforeAfterSlider
              originalUrl={comp.leftUrl}
              enhancedUrl={comp.rightUrl}
              leftLabel={comp.leftLabel}
              rightLabel={comp.rightLabel}
              className="w-full h-[62vh] max-h-[600px]"
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-black/40 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/60">
          <span className="text-[11px]">
            Drag horizontal handle to compare • Switch modes in top bar • Preserves natural architecture & geometry
          </span>
          <span className="font-mono text-[11px] text-blue-400">
            A Squared Neural Studio
          </span>
        </div>
      </div>
    </div>
  );
}
