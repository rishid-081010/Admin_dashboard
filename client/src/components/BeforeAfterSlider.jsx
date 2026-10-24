import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Columns, SplitSquareHorizontal } from 'lucide-react';

export default function BeforeAfterSlider({ 
  originalUrl, 
  enhancedUrl, 
  leftLabel = 'ORIGINAL RAW', 
  rightLabel = 'AUTO-ENHANCED', 
  className = '' 
}) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 - 100)
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side'
  const containerRef = useRef(null);

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = clientX - rect.left;
    let pos = (x / rect.width) * 100;
    if (pos < 0) pos = 0;
    if (pos > 100) pos = 100;
    setSliderPosition(pos);
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      setIsDragging(true);
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalMouseMove = (e) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    };
    const handleGlobalTouchMove = (e) => {
      if (isDragging && e.touches && e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    };
    const handleGlobalTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
      window.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, updatePosition]);

  return (
    <div className={`relative flex flex-col w-full h-full min-h-0 select-none ${className}`}>
      {/* View Mode Toggle Controls */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-2xl">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setViewMode('slider'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            viewMode === 'slider'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <SplitSquareHorizontal className="w-3.5 h-3.5" />
          Split Slider
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setViewMode('side-by-side'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            viewMode === 'side-by-side'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
          Side by Side
        </button>
      </div>

      {viewMode === 'side-by-side' ? (
        /* ── Side-by-Side Dual View ── */
        <div className="flex-1 min-h-0 w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-[#050811] rounded-2xl border border-white/[0.08] overflow-hidden">
          {/* Left: Original */}
          <div className="relative flex flex-col items-center justify-center bg-black/40 rounded-xl overflow-hidden border border-white/5">
            <img
              src={originalUrl}
              alt={leftLabel}
              loading="eager"
              className="w-full h-full object-contain pointer-events-none select-none block"
              draggable={false}
            />
            <span className="absolute bottom-3 left-3 bg-black/80 text-bone-100 text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-sm tracking-wider border border-white/10">
              {leftLabel}
            </span>
          </div>

          {/* Right: Enhanced */}
          <div className="relative flex flex-col items-center justify-center bg-black/40 rounded-xl overflow-hidden border border-white/5">
            <img
              src={enhancedUrl}
              alt={rightLabel}
              loading="eager"
              className="w-full h-full object-contain pointer-events-none select-none block"
              draggable={false}
            />
            <span className="absolute bottom-3 right-3 bg-blue-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-sm tracking-wider border border-white/10">
              {rightLabel}
            </span>
          </div>
        </div>
      ) : (
        /* ── Interactive GPU-Accelerated Clip-Path Slider ── */
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="relative flex-1 min-h-0 w-full h-full select-none overflow-hidden rounded-2xl cursor-ew-resize bg-[#050811] border border-white/[0.08]"
          style={{ touchAction: 'none' }}
        >
          {/* 1. Enhanced Image (Base Layer - Right Side) */}
          <img
            src={enhancedUrl}
            alt={rightLabel}
            loading="eager"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none block"
            draggable={false}
          />
          <span 
            className="absolute top-3.5 right-3.5 bg-black/75 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-sm z-10 pointer-events-none tracking-wider border border-white/10"
            style={{
              opacity: sliderPosition < 88 ? 1 : Math.max(0, (100 - sliderPosition) / 12),
              transition: 'opacity 0.15s ease'
            }}
          >
            {rightLabel}
          </span>

          {/* 2. Original Image (Top Layer - Left Side with GPU clipPath) */}
          <img
            src={originalUrl}
            alt={leftLabel}
            loading="eager"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none block"
            style={{
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
            draggable={false}
          />
          <span
            className="absolute top-3.5 left-3.5 bg-black/80 text-bone-100 text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-sm z-10 pointer-events-none tracking-wider border border-white/10"
            style={{
              opacity: sliderPosition > 12 ? 1 : Math.max(0, sliderPosition / 12),
              transition: 'opacity 0.15s ease'
            }}
          >
            {leftLabel}
          </span>

          {/* 3. Draggable Divider Line & Handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] z-20 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-navy-900 text-blue-400 shadow-2xl flex items-center justify-center border-2 border-blue-400/60 transition-transform hover:scale-110">
              <svg className="w-4 h-4 fill-current text-blue-400" viewBox="0 0 24 24">
                <path d="M8.5 7l-5 5 5 5V7zm7 10l5-5-5-5v10z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
