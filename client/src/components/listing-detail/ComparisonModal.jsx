import React, { useEffect } from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight, RefreshCw, Sliders } from 'lucide-react';
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
  // Keyboard navigation: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen || !image) return null;

  const raw = image.original_image_location || image.originalUrl || '';
  const auto = image.generated_image_location || image.enhancedUrl || '';
  const refined = image.custom_refined_location || image.refinedUrl || '';

  const hasAuto = !!auto && auto !== raw;
  const hasRefined = !!refined && refined !== auto && refined !== raw;

  // Resolve comparison URLs based on sliderMode
  const getComparisonUrls = () => {
    if (sliderMode === 'orig-vs-refined') {
      const targetRight = refined || auto || raw;
      return {
        leftUrl: raw,
        rightUrl: targetRight,
        leftLabel: 'Raw Authentic',
        rightLabel: refined ? '✨ Custom Refined' : '✨ AI Enhanced',
        isDifferent: !!raw && !!targetRight && raw !== targetRight,
      };
    }
    if (sliderMode === 'baseline-vs-refined') {
      return {
        leftUrl: auto || raw,
        rightUrl: refined || auto || raw,
        leftLabel: '🤖 Auto Enhanced',
        rightLabel: refined ? '✨ Custom Refined' : '🤖 Auto Enhanced',
        isDifferent: !!auto && !!refined && auto !== refined,
      };
    }
    // orig-vs-baseline
    return {
      leftUrl: raw,
      rightUrl: auto || raw,
      leftLabel: 'Raw Authentic',
      rightLabel: '🤖 Auto Enhanced',
      isDifferent: !!raw && !!auto && raw !== auto,
    };
  };

  const comp = getComparisonUrls();
  const roomTitle = (image.room_type || 'Property Photo').replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in select-none">
      <div className="relative w-full max-w-6xl h-[88vh] min-h-[550px] max-h-[94vh] glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-[#080d19]/95 border border-white/[0.1]">
        {/* Modal Top Bar */}
        <div className="flex-shrink-0 p-3.5 sm:p-4 bg-black/40 border-b border-white/[0.08] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold bg-white/[0.06] text-white px-2.5 py-1 rounded-md font-sans shrink-0">
              #{currentIndex + 1} of {totalCount}
            </span>
            <span className="text-sm font-sans font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {roomTitle}
            </span>
            <span className="text-xs text-white/50 font-mono hidden md:inline truncate max-w-[240px]">
              {image.original_filename || ''}
            </span>
          </div>

          {/* 3-Way Mode Pills */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSliderMode('orig-vs-refined')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                sliderMode === 'orig-vs-refined'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              📸 Raw vs ✨ Refined
            </button>
            <button
              type="button"
              onClick={() => setSliderMode('baseline-vs-refined')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                sliderMode === 'baseline-vs-refined'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🤖 Auto vs ✨ Refined
            </button>
            <button
              type="button"
              onClick={() => setSliderMode('orig-vs-baseline')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                sliderMode === 'orig-vs-baseline'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25'
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
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRefine(image);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-semibold flex items-center gap-1.5 border border-blue-500/30 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI Refine
              </button>
            )}
            <button
              type="button"
              onClick={onPrev}
              className="p-2 rounded-xl glass-pill hover:bg-white/[0.1] text-bone-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Previous image (Left arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="p-2 rounded-xl glass-pill hover:bg-white/[0.1] text-bone-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Next image (Right arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl glass-pill hover:bg-red-600/80 text-bone-100 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slider Canvas Container */}
        <div className="p-3 sm:p-5 flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden bg-black/50 relative">
          {!comp.isDifferent ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-black/60 rounded-2xl border border-white/[0.08] shadow-2xl my-auto">
              {sliderMode === 'baseline-vs-refined' && !hasRefined ? (
                <>
                  <Sparkles className="w-10 h-10 text-blue-400 mb-3" />
                  <h3 className="text-white font-bold text-base mb-1.5 font-sans">No Custom Refinement Yet</h3>
                  <p className="text-white/60 text-xs mb-5 leading-relaxed font-sans">
                    This photo has been enhanced by the neural baseline engine. You can use the AI Refine studio to fine-tune architectural lighting, staging, or materials.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSliderMode('orig-vs-refined')}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold cursor-pointer"
                    >
                      View Raw vs Enhanced
                    </button>
                    {onOpenRefine && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenRefine(image);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-900/50 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-200" /> Open Refine
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mb-4" />
                  <h3 className="text-white font-bold text-base mb-1.5 font-sans">Photographic Enhancement In Progress</h3>
                  <p className="text-white/60 text-xs mb-5 leading-relaxed font-sans">
                    This photo is currently being processed by the OpenAI Neural Engine. Once finished, the interactive Before/After comparison slider will immediately become available.
                  </p>
                  {onSingleEnhance && (
                    <button
                      type="button"
                      onClick={() => onSingleEnhance(image, 'flare')}
                      disabled={isRetrying}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> Enhance Now (Flare)
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <BeforeAfterSlider
              originalUrl={comp.leftUrl}
              enhancedUrl={comp.rightUrl}
              leftLabel={comp.leftLabel}
              rightLabel={comp.rightLabel}
              className="w-full h-full min-h-[420px]"
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex-shrink-0 p-3 bg-black/50 border-t border-white/[0.08] flex items-center justify-between text-xs text-white/60">
          <span className="text-[11px] flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            Drag horizontal handle to compare • Switch modes in top bar • Preserves natural architecture & geometry
          </span>
          <span className="font-mono text-[11px] text-blue-400 font-semibold hidden sm:inline">
            A Squared Neural Studio
          </span>
        </div>
      </div>
    </div>
  );
}
