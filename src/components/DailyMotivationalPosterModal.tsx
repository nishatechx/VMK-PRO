import React, { useEffect, useRef, useId } from 'react';
import { X, ArrowRight, Sparkles, Sun } from 'lucide-react';
import { MotivationalQuote } from '../types/motivationalQuote';

interface DailyMotivationalPosterModalProps {
  isOpen: boolean;
  quote: MotivationalQuote | null;
  onClose: () => void;
  dateString?: string;
  userName?: string;
}

// Impactful words to tastefully highlight with contrasting accent colors
const HIGHLIGHT_KEYWORDS = new Set([
  'discipline', 'habits', 'consistency', 'strength', 'routine', 'freedom',
  'progress', 'standards', 'focus', 'process', 'effort', 'learning',
  'results', 'quality', 'confidence', 'courage', 'leadership', 'trust',
  'resilience', 'values', 'creativity', 'integrity', 'gratitude', 'action',
  'today', 'tomorrow', 'future', 'opportunity', 'character', 'excellence',
  'wisdom', 'purpose', 'patience', 'service', 'preparation', 'momentum',
  'curiosity', 'attention', 'respect', 'responsibility', 'clarity'
]);

/**
 * Parses quote string and highlights key impactful words for poster-grade typography
 */
function renderHighlightedQuote(quoteText: string, accentColorClass: string) {
  const words = quoteText.split(' ');
  return words.map((word, index) => {
    // Strip trailing punctuation for matching
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    const isKeyword = HIGHLIGHT_KEYWORDS.has(cleanWord);

    if (isKeyword) {
      return (
        <span key={index} className={`${accentColorClass} font-black drop-shadow-xs`}>
          {word}{' '}
        </span>
      );
    }
    return <span key={index}>{word} </span>;
  });
}

export const DailyMotivationalPosterModal: React.FC<DailyMotivationalPosterModalProps> = ({
  isOpen,
  quote,
  onClose,
  dateString,
  userName,
}) => {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Accessibility: Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !quote) return null;

  // Determine visual composition variant (4 curated poster aesthetics)
  const variantIndex = quote.id % 4;

  const formattedDate = dateString
    ? new Date(dateString).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none"
    >
      {/* Refined blurred backdrop keeping dashboard recognizable */}
      <div
        className="fixed inset-0 bg-[#001D3D]/65 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Card Container */}
      <div className="relative w-full max-w-xl my-auto z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close motivational poster"
          className="absolute -top-3.5 -right-3.5 sm:-top-4 sm:-right-4 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-slate-600 hover:text-slate-900 shadow-lg border border-slate-200/80 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#0056A6]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =========================================================================
            POSTER VARIANT 0: Executive Navy & Sapphire Glow
            ========================================================================= */}
        {variantIndex === 0 && (
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-cyan-500/30 bg-gradient-to-br from-[#001428] via-[#00264D] to-[#003B73] text-white relative">
            {/* Ambient Lighting & Geometric Grid Details */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

            <div className="p-6 sm:p-8 relative z-10 flex flex-col">
              {/* Poster Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[11px] sm:text-xs font-bold tracking-widest text-cyan-300 uppercase">
                    {quote.category} · DAILY FOCUS
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-300/80">
                  {formattedDate}
                </span>
              </div>

              {/* Poster Body */}
              <div className="py-7 sm:py-9 relative">
                {/* Oversized Decorative Quotation Glyph */}
                <div className="absolute -top-3 -left-3 text-7xl sm:text-8xl font-serif text-cyan-400/15 select-none pointer-events-none leading-none">
                  “
                </div>

                <blockquote className="relative z-10">
                  <p
                    id={titleId}
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug sm:leading-tight text-white mb-5"
                  >
                    {renderHighlightedQuote(quote.quote, 'text-cyan-300 underline decoration-cyan-400/40 decoration-2 underline-offset-4')}
                  </p>

                  <div className="border-l-3 border-cyan-400/60 pl-4 py-0.5">
                    <p className="text-sm sm:text-base font-normal text-cyan-100/90 leading-relaxed">
                      {quote.supportingLine}
                    </p>
                  </div>
                </blockquote>
              </div>

              {/* Poster Footer CTA */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end">
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-[#0070D2] hover:from-cyan-400 hover:to-[#0056A6] text-white font-bold text-sm shadow-md hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Let&apos;s Make Today Count</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            POSTER VARIANT 1: Architectural Clean Light Poster
            ========================================================================= */}
        {variantIndex === 1 && (
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white text-slate-900 relative">
            {/* Subtle Architectural Corner Accents */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#0056A6]/40 pointer-events-none" />
            <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#0056A6]/40 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#0056A6]/40 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#0056A6]/40 pointer-events-none" />

            <div className="p-6 sm:p-8 relative z-10 flex flex-col">
              {/* Poster Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0056A6]" />
                  <span className="text-[11px] sm:text-xs font-extrabold tracking-widest text-[#0056A6] uppercase">
                    {quote.category} · PERSPECTIVE
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {formattedDate}
                </span>
              </div>

              {/* Poster Body */}
              <div className="py-7 sm:py-9 relative">
                {/* Big Elegant Quotation Glyph */}
                <div className="absolute -top-4 -left-2 text-7xl sm:text-8xl font-serif text-[#0056A6]/10 select-none pointer-events-none leading-none">
                  “
                </div>

                <blockquote className="relative z-10">
                  <p
                    id={titleId}
                    className="text-2xl sm:text-3xl font-black tracking-tight leading-snug sm:leading-tight text-[#0A1A2F] mb-5"
                  >
                    {renderHighlightedQuote(quote.quote, 'text-[#0056A6]')}
                  </p>

                  <div className="bg-[#F0F7FF] rounded-xl p-3.5 border border-[#BAE0FD]/60">
                    <p className="text-sm sm:text-base font-medium text-slate-700 leading-relaxed">
                      {quote.supportingLine}
                    </p>
                  </div>
                </blockquote>
              </div>

              {/* Poster Footer CTA */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0056A6] hover:bg-[#003B73] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Let&apos;s Make Today Count</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            POSTER VARIANT 2: Modern Cobalt Gradient Wave
            ========================================================================= */}
        {variantIndex === 2 && (
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-sky-400/40 bg-gradient-to-br from-[#003B73] via-[#0056A6] to-[#0284C7] text-white relative">
            {/* Luminous Warm Flare & Watermark */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-10 text-9xl font-serif text-white/5 select-none pointer-events-none">
              ”
            </div>

            <div className="p-6 sm:p-8 relative z-10 flex flex-col">
              {/* Poster Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[11px] sm:text-xs font-black tracking-widest text-amber-300 uppercase">
                    {quote.category} · INSPIRATION
                  </span>
                </div>
                <span className="text-[11px] font-medium text-sky-100/80">
                  {formattedDate}
                </span>
              </div>

              {/* Poster Body */}
              <div className="py-7 sm:py-9 relative">
                <div className="absolute -top-4 -left-3 text-7xl sm:text-8xl font-serif text-white/20 select-none pointer-events-none leading-none">
                  “
                </div>

                <blockquote className="relative z-10">
                  <p
                    id={titleId}
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug sm:leading-tight text-white mb-5"
                  >
                    {renderHighlightedQuote(quote.quote, 'text-amber-300 drop-shadow-sm')}
                  </p>

                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/20">
                    <p className="text-sm sm:text-base font-normal text-sky-50 leading-relaxed">
                      {quote.supportingLine}
                    </p>
                  </div>
                </blockquote>
              </div>

              {/* Poster Footer CTA */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-end">
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-[#003B73] font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Let&apos;s Make Today Count</span>
                  <ArrowRight className="w-4 h-4 text-[#0056A6]" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            POSTER VARIANT 3: Editorial Split-Frame Heritage
            ========================================================================= */}
        {variantIndex === 3 && (
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-300/80 bg-white text-slate-800 flex flex-col relative">
            {/* Top Navy Header Banner */}
            <div className="bg-gradient-to-r from-[#00264D] via-[#003B73] to-[#0056A6] text-white px-6 sm:px-8 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[11px] sm:text-xs font-bold tracking-widest text-cyan-200 uppercase">
                  {quote.category} · THOUGHT FOR THE DAY
                </span>
              </div>
              <span className="text-[11px] text-slate-200 font-medium">
                {formattedDate}
              </span>
            </div>

            {/* Poster Main Body */}
            <div className="p-6 sm:p-8 flex flex-col bg-gradient-to-b from-white via-white to-[#F7FAFD]">
              <div className="py-4 sm:py-6 relative">
                <div className="absolute -top-3 -left-2 text-7xl sm:text-8xl font-serif text-[#0056A6]/10 select-none pointer-events-none leading-none">
                  “
                </div>

                <blockquote className="relative z-10">
                  <p
                    id={titleId}
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug sm:leading-tight text-[#0F172A] mb-5"
                  >
                    {renderHighlightedQuote(quote.quote, 'text-[#0056A6]')}
                  </p>

                  <div className="border-l-3 border-[#0056A6] pl-4 py-1">
                    <p className="text-sm sm:text-base font-normal text-slate-600 leading-relaxed">
                      {quote.supportingLine}
                    </p>
                  </div>
                </blockquote>
              </div>

              {/* Poster Footer CTA */}
              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#003B73] to-[#0056A6] hover:from-[#00264D] hover:to-[#003B73] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Let&apos;s Make Today Count</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
