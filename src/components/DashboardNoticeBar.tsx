import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Sparkles,
  FileText,
  ExternalLink,
  RefreshCw,
  Clock,
  ChevronRight,
  Layers,
  Search,
  X,
  Play,
  Pause,
  ArrowUp,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CetNotice, CetNoticesResponse } from '../types/cetNotice';
import { cetNoticeService } from '../services/cetNoticeService';

interface DashboardNoticeBarProps {
  className?: string;
}

export const DashboardNoticeBar: React.FC<DashboardNoticeBarProps> = ({ className = '' }) => {
  const [data, setData] = useState<CetNoticesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAllModal, setShowAllModal] = useState<boolean>(false);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [modalCourseFilter, setModalCourseFilter] = useState<string>('all');

  // Auto-scroll controls
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isReadingPause, setIsReadingPause] = useState<boolean>(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstBlockRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef<number>(0);
  const pauseTimeoutRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);
  const userInteractionTimeoutRef = useRef<number | null>(null);

  // Load notices from service
  const loadNotices = useCallback(async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      const res = await cetNoticeService.getNotices(force);
      setData(res);
    } catch (err) {
      console.error('Failed to load CET notices', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotices(false);
    // Background polling every 3 minutes for new circulars
    const timer = setInterval(() => {
      loadNotices(false);
    }, 180000);
    return () => clearInterval(timer);
  }, [loadNotices]);

  // Extract all notices and latest notice
  const allNotices: CetNotice[] = data?.allNotices || data?.latestNotices || [];
  const latestNotice: CetNotice | undefined =
    allNotices.length > 0 ? allNotices[0] : data?.highlightNotices?.[0];

  const displayToday = data?.currentDate || cetNoticeService.getCurrentDateFormatted();
  const displayYesterday = data?.yesterdayDate || cetNoticeService.getYesterdayDateFormatted();

  // Step-by-Step Auto-Scroll with 3-Second Stop at Each Notice
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || allNotices.length <= 1) return;

    let isCancelled = false;

    const startPauseThenScroll = () => {
      if (isCancelled) return;

      // If user paused, hovered, or is actively touching/scrolling, recheck shortly
      if (isAutoScrollPaused || isHovered || isUserInteractingRef.current) {
        pauseTimeoutRef.current = window.setTimeout(startPauseThenScroll, 400);
        return;
      }

      setIsReadingPause(true);

      // Stop for 3 seconds (3000ms) so user can comfortably read the notice
      pauseTimeoutRef.current = window.setTimeout(() => {
        if (isCancelled) return;

        if (isAutoScrollPaused || isHovered || isUserInteractingRef.current) {
          startPauseThenScroll();
          return;
        }

        setIsReadingPause(false);

        // Calculate target scroll position for the next notice card
        const firstBlock = firstBlockRef.current;
        if (!firstBlock || !container) {
          startPauseThenScroll();
          return;
        }

        const items = firstBlock.children;
        const totalItems = items.length;
        if (totalItems === 0) {
          startPauseThenScroll();
          return;
        }

        const nextIndex = currentIndexRef.current + 1;
        let targetY = 0;

        if (nextIndex < totalItems) {
          const nextEl = items[nextIndex] as HTMLElement;
          targetY = nextEl ? nextEl.offsetTop - firstBlock.offsetTop : 0;
        } else {
          // Reached the end of primary block, smoothly scroll to top of duplicate block
          targetY = firstBlock.offsetHeight;
        }

        const startY = container.scrollTop;
        const distance = targetY - startY;
        const duration = 750; // Smooth 750ms slide to next notice
        const startTime = performance.now();

        const animateStep = (now: number) => {
          if (isCancelled) return;

          // If user interacts during scroll, abort animation and yield to user
          if (isUserInteractingRef.current || isHovered || isAutoScrollPaused) {
            startPauseThenScroll();
            return;
          }

          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease in-out quadratic
          const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          container.scrollTop = startY + distance * ease;

          if (progress < 1) {
            animationFrameIdRef.current = requestAnimationFrame(animateStep);
          } else {
            // Scroll step completed
            if (nextIndex >= totalItems) {
              // Seamless loop: reset scrollTop to 0 instantaneously
              container.scrollTop = 0;
              currentIndexRef.current = 0;
            } else {
              currentIndexRef.current = nextIndex;
            }
            // Loop back to stop for 3 seconds, then scroll again
            startPauseThenScroll();
          }
        };

        animationFrameIdRef.current = requestAnimationFrame(animateStep);
      }, 3000);
    };

    // Begin cycle with 3 second pause on current notice
    startPauseThenScroll();

    return () => {
      isCancelled = true;
      if (pauseTimeoutRef.current) window.clearTimeout(pauseTimeoutRef.current);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [isAutoScrollPaused, isHovered, allNotices.length]);

  // Sync scroll position ONLY if user scrolls manually
  const handleScroll = () => {
    if (isUserInteractingRef.current && scrollContainerRef.current && firstBlockRef.current) {
      const currentScroll = scrollContainerRef.current.scrollTop;
      const items = firstBlockRef.current.children;
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < items.length; i++) {
        const el = items[i] as HTMLElement;
        const diff = Math.abs((el.offsetTop - firstBlockRef.current.offsetTop) - currentScroll);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      currentIndexRef.current = closestIdx;
    }
  };

  const handleUserInteractionStart = () => {
    isUserInteractingRef.current = true;
    if (userInteractionTimeoutRef.current) {
      window.clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = window.setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 2200);
  };

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      currentIndexRef.current = 0;
    }
  };

  // Filter list for full explorer modal
  const uniqueCourses = Array.from(new Set(allNotices.map((n) => n.course).filter(Boolean)));
  const filteredAllNotices = allNotices.filter((n) => {
    const matchSearch =
      !modalSearch ||
      n.subject.toLowerCase().includes(modalSearch.toLowerCase()) ||
      (n.course && n.course.toLowerCase().includes(modalSearch.toLowerCase())) ||
      (n.date && n.date.includes(modalSearch));
    const matchCourse = modalCourseFilter === 'all' || n.course === modalCourseFilter;
    return matchSearch && matchCourse;
  });

  return (
    <>
      <div
        id="dashboard-notice-bar"
        className={`bg-white border border-[#DCE5F0] rounded-2xl shadow-xs flex flex-col overflow-hidden select-none h-full min-h-[580px] max-h-[720px] shrink-0 ${className}`}
      >
        {/* Notice Bar Header */}
        <div className="bg-[#073B70] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs border-b border-[#092744]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-xs">
                <Bell className="w-4 h-4 text-amber-300" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
                  Admission Notices
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-bold uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-blue-100/90 font-medium">
                Official Circulars & Announcements
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1">
            {/* Auto-scroll Play/Pause Toggle */}
            <button
              type="button"
              id="notice-pause-toggle-btn"
              onClick={() => setIsAutoScrollPaused(!isAutoScrollPaused)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isAutoScrollPaused
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30'
                  : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'
              }`}
              title={isAutoScrollPaused ? 'Resume auto-scrolling' : 'Pause auto-scrolling'}
              aria-label={isAutoScrollPaused ? 'Resume auto-scrolling' : 'Pause auto-scrolling'}
            >
              {isAutoScrollPaused ? (
                <Play className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Pause className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            {/* Refresh notices */}
            <button
              type="button"
              id="notice-refresh-btn"
              onClick={() => loadNotices(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-white/20 bg-white/10 text-blue-100 hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh circulars directly from cetcell.mahacet.org"
              aria-label="Refresh notices"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            </button>

            {/* Open full modal */}
            <button
              type="button"
              id="notice-view-all-modal-btn"
              onClick={() => setShowAllModal(true)}
              className="p-1.5 rounded-lg border border-white/20 bg-white/10 text-blue-100 hover:bg-white/20 transition-colors cursor-pointer"
              title="Browse all CET Cell circulars directory"
              aria-label="Browse all notices"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TOP PINNED SECTION: LATEST NOTICE (WITHOUT SCROLLING) */}
        {/* ============================================================ */}
        <div className="bg-gradient-to-b from-rose-50/80 via-white to-white border-b-2 border-red-200/80 p-3.5 shrink-0 select-text">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* High-visibility LATEST NOTICE Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-rose-700 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                <span>LATEST NOTICE</span>
              </span>

              {latestNotice?.course && (
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#003B73] border border-blue-200 uppercase font-mono">
                  {latestNotice.course}
                </span>
              )}
            </div>

            {latestNotice?.date && (
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                {latestNotice.date}
              </span>
            )}
          </div>

          {/* Latest Notice Subject - Prominently Bold */}
          {latestNotice ? (
            <div>
              <a
                href={latestNotice.link || 'https://cetcell.mahacet.org/notices/'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold text-slate-950 text-xs sm:text-[13px] leading-snug hover:text-[#0056A6] hover:underline block transition-colors line-clamp-3"
                title={latestNotice.subject}
              >
                {latestNotice.subject}
              </a>

              {/* Direct PDF and Portal Action Link */}
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-red-100">
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-500" />
                  <span>Pinned on top</span>
                </span>

                {latestNotice.link && (
                  <a
                    href={latestNotice.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-all shadow-xs active:scale-95"
                    title="Open official PDF"
                  >
                    <FileText className="w-3 h-3" />
                    <span>View PDF</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No notice published yet.</p>
          )}
        </div>

        {/* Subheader Banner for the Smooth Scrolling List */}
        <div className="bg-[#F8FAFC] px-3.5 py-2 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              All Circulars
            </span>
            <span className="text-[10px] font-mono font-bold bg-[#E2E8F0] text-slate-700 px-1.5 py-0.2 rounded-full">
              {allNotices.length}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
            <span className="hidden sm:inline">
              {isAutoScrollPaused
                ? 'Paused'
                : isHovered
                ? 'Hovered (Paused)'
                : isReadingPause
                ? 'Paused (3s)'
                : 'Scrolling...'}
            </span>
            <button
              type="button"
              onClick={handleScrollToTop}
              className="p-1 rounded hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors"
              title="Scroll to top"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SCROLLING SECTION: ALL NOTICES (SCROLLS SMOOTHLY IN FIXED AREA) */}
        {/* ============================================================ */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={handleUserInteractionStart}
          onTouchMove={handleUserInteractionStart}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex-1 min-h-0 overflow-y-auto p-2 select-text"
        >
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#0056A6] animate-spin" />
              <span>Fetching live circulars from CET Cell...</span>
            </div>
          ) : allNotices.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No circulars found.
            </div>
          ) : (
            <>
              {/* Primary Notices Block */}
              <div ref={firstBlockRef} className="space-y-1.5 pb-1.5">
                {allNotices.map((notice, idx) => {
                  const isToday = notice.period === 'today' || notice.date === displayToday;
                  const isYesterday = notice.period === 'yesterday' || notice.date === displayYesterday;
                  const isFirstItem = idx === 0;

                  return (
                    <div
                      key={`pri-notice-${idx}-${notice.sn || idx}`}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isFirstItem
                          ? 'bg-red-50/40 border-red-200/60'
                          : isToday
                          ? 'bg-amber-50/40 border-amber-200/50'
                          : 'bg-white border-slate-100 hover:border-[#0056A6]/30 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isToday ? (
                            <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider">
                              Today
                            </span>
                          ) : isYesterday ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-bold uppercase tracking-wider">
                              Yesterday
                            </span>
                          ) : null}

                          {notice.course && (
                            <span className="text-[10px] font-mono font-bold text-[#003B73] bg-[#0056A6]/10 px-1.5 py-0.2 rounded">
                              {notice.course}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">
                          {notice.date}
                        </span>
                      </div>

                      {/* Notice Subject */}
                      <a
                        href={notice.link || 'https://cetcell.mahacet.org/notices/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block text-xs leading-snug hover:text-[#0056A6] transition-colors line-clamp-2 ${
                          isFirstItem
                            ? 'font-bold text-slate-900'
                            : 'font-medium text-slate-800'
                        }`}
                        title={notice.subject}
                      >
                        {notice.subject}
                      </a>

                      {/* PDF direct button */}
                      {notice.link && (
                        <div className="mt-1.5 flex justify-end">
                          <a
                            href={notice.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0056A6] hover:text-[#003B73] hover:underline"
                            title="Download PDF"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>PDF</span>
                            <ExternalLink className="w-2 h-2 opacity-70" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Seamless Duplicate Block for Infinite Continuous Auto-Scroll without stopping */}
              <div aria-hidden="true" className="space-y-1.5 pt-1 pb-1.5">
                {allNotices.map((notice, idx) => {
                  const isToday = notice.period === 'today' || notice.date === displayToday;
                  const isYesterday = notice.period === 'yesterday' || notice.date === displayYesterday;
                  const isFirstItem = idx === 0;

                  return (
                    <div
                      key={`dup-notice-${idx}-${notice.sn || idx}`}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isFirstItem
                          ? 'bg-red-50/40 border-red-200/60'
                          : isToday
                          ? 'bg-amber-50/40 border-amber-200/50'
                          : 'bg-white border-slate-100 hover:border-[#0056A6]/30 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isToday ? (
                            <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider">
                              Today
                            </span>
                          ) : isYesterday ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-bold uppercase tracking-wider">
                              Yesterday
                            </span>
                          ) : null}

                          {notice.course && (
                            <span className="text-[10px] font-mono font-bold text-[#003B73] bg-[#0056A6]/10 px-1.5 py-0.2 rounded">
                              {notice.course}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">
                          {notice.date}
                        </span>
                      </div>

                      {/* Notice Subject */}
                      <a
                        href={notice.link || 'https://cetcell.mahacet.org/notices/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block text-xs leading-snug hover:text-[#0056A6] transition-colors line-clamp-2 ${
                          isFirstItem
                            ? 'font-bold text-slate-900'
                            : 'font-medium text-slate-800'
                        }`}
                        title={notice.subject}
                      >
                        {notice.subject}
                      </a>

                      {/* PDF direct button */}
                      {notice.link && (
                        <div className="mt-1.5 flex justify-end">
                          <a
                            href={notice.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0056A6] hover:text-[#003B73] hover:underline"
                            title="Download PDF"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>PDF</span>
                            <ExternalLink className="w-2 h-2 opacity-70" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Bottom Footer with View All CTA */}
        <div className="p-2.5 bg-slate-50 border-t border-[#D9E1EA] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500 font-mono">
            Feed: cetcell.mahacet.org
          </span>
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0056A6] hover:text-[#003B73] cursor-pointer"
          >
            <span>Browse Full Directory</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Modal: All CET Cell Circulars Explorer */}
      <AnimatePresence>
        {showAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-[#D9E1EA] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[#D9E1EA] flex items-center justify-between bg-gradient-to-r from-[#003B73] to-[#0056A6] text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-xs">
                    <Bell className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-none">
                      Maharashtra Admission Circulars
                    </h3>
                    <p className="text-[11px] text-blue-100 mt-1">
                      Direct feed from{' '}
                      <a
                        href="https://cetcell.mahacet.org/notices/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white"
                      >
                        cetcell.mahacet.org/notices/
                      </a>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllModal(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="p-3 border-b border-[#D9E1EA] bg-[#F8FAFC] flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search notice subject, course, or date..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D9E1EA] bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0056A6]"
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {uniqueCourses.length > 0 && (
                  <select
                    value={modalCourseFilter}
                    onChange={(e) => setModalCourseFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#D9E1EA] bg-white text-xs text-slate-700 font-medium focus:outline-none focus:border-[#0056A6] cursor-pointer"
                  >
                    <option value="all">All Courses ({allNotices.length})</option>
                    {uniqueCourses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Notices Directory List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
                {filteredAllNotices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No circulars matching your search filter.
                  </div>
                ) : (
                  filteredAllNotices.map((n, i) => {
                    const isLatest = i === 0;
                    const isToday = n.date === displayToday;
                    const isYesterday = n.date === displayYesterday;
                    return (
                      <div
                        key={`modal-notice-${i}`}
                        className={`pt-2.5 first:pt-0 p-3 rounded-xl transition-colors ${
                          isLatest
                            ? 'bg-red-50/80 border-2 border-red-300 shadow-2xs'
                            : isToday
                            ? 'bg-red-50/60 border border-red-200/80'
                            : isYesterday
                            ? 'bg-amber-50/60 border border-amber-200/80'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isLatest && (
                                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Latest Notice</span>
                                </span>
                              )}
                              {isToday && !isLatest && (
                                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider">
                                  Today
                                </span>
                              )}
                              {isYesterday && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white text-[9px] font-bold uppercase tracking-wider">
                                  Yesterday
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-[#0056A6] bg-[#0056A6]/10 px-2 py-0.5 rounded font-bold">
                                {n.course || 'General Notice'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {n.date}
                              </span>
                            </div>

                            <h4
                              className={`leading-snug ${
                                isLatest
                                  ? 'text-sm font-extrabold text-slate-950'
                                  : 'text-xs font-semibold text-slate-800'
                              }`}
                            >
                              {n.subject}
                            </h4>
                          </div>

                          {n.link && (
                            <a
                              href={n.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold uppercase transition-colors shadow-2xs"
                              title="Download official PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>PDF</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-[#D9E1EA] bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Showing {filteredAllNotices.length} notices</span>
                <button
                  type="button"
                  onClick={() => setShowAllModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
