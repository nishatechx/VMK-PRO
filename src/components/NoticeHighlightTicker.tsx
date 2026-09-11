import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  ExternalLink,
  RefreshCw,
  FileText,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  X,
  Search,
  CheckCircle2,
  Sparkles,
  Clock,
  Radio,
} from 'lucide-react';
import { CetNotice, CetNoticesResponse } from '../types/cetNotice';
import { cetNoticeService } from '../services/cetNoticeService';

export const NoticeHighlightTicker: React.FC = () => {
  const [data, setData] = useState<CetNoticesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showAllModal, setShowAllModal] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  const loadNotices = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const res = await cetNoticeService.getNotices(force);
      setData(res);
    } catch {
      // Handled gracefully in service
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotices(false);
    // Poll every 3 minutes for live updates
    const timer = setInterval(() => {
      loadNotices(false);
    }, 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadNotices]);

  // Combined notices from yesterday and today or recent notices
  const highlightNotices: CetNotice[] =
    data?.highlightNotices && data.highlightNotices.length > 0
      ? data.highlightNotices
      : data?.todayNotices && data.todayNotices.length > 0
      ? data.todayNotices
      : [];

  const allNotices = data?.allNotices || data?.latestNotices || [];

  // Active notices to display (clean stationary display without marquee)
  const noticesList: CetNotice[] =
    highlightNotices.length > 0
      ? highlightNotices
      : allNotices.length > 0
      ? allNotices.slice(0, 5)
      : [];

  const totalNotices = noticesList.length;

  // Auto-cycle through notices comfortably when not paused
  useEffect(() => {
    if (totalNotices <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalNotices);
    }, 6000);

    return () => clearInterval(interval);
  }, [totalNotices, isPaused]);

  // Keep index within bounds if list changes
  useEffect(() => {
    if (currentIndex >= totalNotices && totalNotices > 0) {
      setCurrentIndex(0);
    }
  }, [totalNotices, currentIndex]);

  const activeNotice: CetNotice | undefined = totalNotices > 0 ? noticesList[currentIndex] : undefined;
  const isLatestNotice = currentIndex === 0;

  const handlePrevNotice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalNotices <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? totalNotices - 1 : prev - 1));
  };

  const handleNextNotice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalNotices <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalNotices);
  };

  const displayToday = data?.currentDate || cetNoticeService.getCurrentDateFormatted();
  const displayYesterday = data?.yesterdayDate || cetNoticeService.getYesterdayDateFormatted();

  const uniqueCourses = Array.from(new Set(allNotices.map((n) => n.course).filter(Boolean)));

  const filteredAllNotices = allNotices.filter((n) => {
    const matchesSearch =
      n.subject.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.course.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.date.includes(searchFilter);
    const matchesCourse = courseFilter === 'all' || n.course === courseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <>
      {/* Ticker Banner Container */}
      <div
        id="cetcell-notice-ticker"
        className="w-full relative z-20 rounded-xl overflow-hidden border border-red-300/80 bg-white shadow-sm transition-all duration-200"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center min-h-[48px] bg-gradient-to-r from-red-500/10 via-amber-500/8 to-blue-500/5">
          {/* Left Badge: Blinking Live Indicator & Dates */}
          <div className="flex items-center gap-2 px-3 py-2 sm:py-2.5 bg-red-600/10 border-b sm:border-b-0 sm:border-r border-red-200 shrink-0 select-none">
            {/* Blinking Live Beacon */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              
              {/* High-visibility Blinking Alert Pill */}
              <span className="animate-flash-badge px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-ticker-blink" />
                <span>Notice Alert</span>
              </span>
            </div>

            {/* Yesterday & Today Dates Pill */}
            <div className="hidden xs:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/90 border border-slate-200 text-[10px] font-mono font-semibold text-slate-800">
              <Calendar className="w-2.5 h-2.5 text-slate-500" />
              <span title="Today & Yesterday notice coverage">
                {displayYesterday} & {displayToday}
              </span>
            </div>
          </div>

          {/* Center Notice Content - Stationary Display (No Marquee) */}
          <div className="flex-1 px-3 py-1.5 min-w-0 flex items-center justify-between gap-3">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-[#4B5563] animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0056A6]" />
                <span>Checking latest circulars from cetcell.mahacet.org...</span>
              </div>
            ) : activeNotice ? (
              <div className="flex-1 flex items-center justify-between gap-2.5 min-w-0">
                {/* Notice Details */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Latest Notice vs Earlier Notice Badge */}
                  {isLatestNotice ? (
                    <span className="shrink-0 px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black tracking-wide uppercase shadow-xs flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                      <span>LATEST NOTICE</span>
                    </span>
                  ) : activeNotice.period === 'today' ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold tracking-tight uppercase shadow-xs flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Today</span>
                    </span>
                  ) : activeNotice.period === 'yesterday' ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-bold tracking-tight uppercase shadow-xs flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Yesterday</span>
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-600 text-white text-[10px] font-bold tracking-tight uppercase shadow-xs">
                      {activeNotice.date}
                    </span>
                  )}

                  {/* Course Pill */}
                  {activeNotice.course && (
                    <span className="hidden sm:inline-flex shrink-0 px-1.5 py-0.5 rounded-md bg-[#0056A6]/10 text-[#003B73] border border-[#0056A6]/20 text-[10px] font-bold tracking-tight uppercase">
                      {activeNotice.course}
                    </span>
                  )}

                  {/* Date Tag */}
                  {activeNotice.date && (
                    <span className="hidden md:inline-flex shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-semibold">
                      {activeNotice.date}
                    </span>
                  )}

                  {/* Notice Subject - BOLD TO LATEST NOTICE */}
                  <a
                    href={activeNotice.link || 'https://cetcell.mahacet.org/notices/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`truncate transition-colors hover:text-[#0056A6] hover:underline ${
                      isLatestNotice
                        ? 'font-extrabold text-[#0f172a] text-xs sm:text-[13px] tracking-tight'
                        : 'font-semibold text-[#1e293b] text-xs sm:text-[13px]'
                    }`}
                    title={activeNotice.subject}
                  >
                    {activeNotice.subject}
                  </a>

                  {/* Direct PDF Link */}
                  {activeNotice.link && (
                    <a
                      href={activeNotice.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase transition-colors"
                      title="Open official PDF"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      <span>PDF</span>
                      <ExternalLink className="w-2 h-2 opacity-70" />
                    </a>
                  )}
                </div>

                {/* Stepper Navigation if multiple notices */}
                {totalNotices > 1 && (
                  <div className="flex items-center gap-1 shrink-0 bg-white/90 border border-slate-200 rounded-lg px-1 py-0.5 shadow-2xs select-none">
                    <button
                      type="button"
                      onClick={handlePrevNotice}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                      title="Previous notice"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-700 px-0.5">
                      {currentIndex + 1}/{totalNotices}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextNotice}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                      title="Next notice"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* If no circular has been published yet for yesterday/today */
              <div className="flex items-center gap-2 text-xs text-[#4B5563] min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">
                  No circulars published for yesterday ({displayYesterday}) or today ({displayToday}).
                  {data?.latestDate && ` (Latest active on portal: ${data.latestDate})`}
                </span>
              </div>
            )}

            {/* Right Action Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activeNotice?.link && (
                <a
                  href={activeNotice.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0056A6] hover:bg-[#003B73] text-white text-[11px] font-semibold transition-colors shadow-xs"
                  title="Open official PDF published on CET Cell"
                >
                  <FileText className="w-3 h-3" />
                  <span className="hidden sm:inline">View PDF</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                </a>
              )}

              {/* View All Portal Notices Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowAllModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#D9E1EA] bg-white hover:bg-[#EAF4FB] text-[#0056A6] text-[11px] font-medium transition-colors cursor-pointer"
                title="Browse recent CET Cell circulars"
              >
                <Layers className="w-3 h-3 text-[#0056A6]" />
                <span className="hidden md:inline">All Notices</span>
              </button>

              {/* Live Refresh Trigger */}
              <button
                type="button"
                onClick={() => loadNotices(true)}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg border border-[#D9E1EA] bg-white hover:bg-slate-50 text-[#4B5563] hover:text-[#1F2937] transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh circulars directly from cetcell.mahacet.org"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#0056A6]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: All CET Cell Circulars Explorer */}
      <AnimatePresence>
        {showAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-[#D9E1EA] shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[#D9E1EA] flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0056A6] text-white flex items-center justify-center shadow-xs">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1F2937] leading-none">
                      CET Cell Maharashtra — Official Notices
                    </h3>
                    <p className="text-[11px] text-[#4B5563] mt-1">
                      Live portal feed from{' '}
                      <a
                        href="https://cetcell.mahacet.org/notices/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0056A6] hover:underline"
                      >
                        cetcell.mahacet.org/notices/
                      </a>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAllModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="p-3 border-b border-[#D9E1EA] bg-white flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search notice subject or course..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0056A6]"
                  />
                </div>

                {uniqueCourses.length > 0 && (
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0056A6] text-slate-700"
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

              {/* Notices List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
                {filteredAllNotices.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No matching notices found.
                  </div>
                ) : (
                  filteredAllNotices.map((n, i) => {
                    const isLatest = i === 0;
                    const isToday = n.date === displayToday;
                    const isYesterday = n.date === displayYesterday;
                    return (
                      <div
                        key={i}
                        className={`pt-2.5 first:pt-0 p-2.5 rounded-xl transition-colors ${
                          isLatest
                            ? 'bg-red-50/90 border-2 border-red-300 shadow-2xs'
                            : isToday
                            ? 'bg-red-50/70 border border-red-200/80'
                            : isYesterday
                            ? 'bg-amber-50/70 border border-amber-200/80'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isLatest && (
                                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Latest Notice</span>
                                </span>
                              )}
                              {isToday && !isLatest && (
                                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
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
                                Date: {n.date}
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
                              className="px-2.5 py-1.5 rounded-lg bg-[#0056A6] hover:bg-[#003B73] text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Download</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-[#D9E1EA] bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <span>Showing {filteredAllNotices.length} notices</span>
                <a
                  href="https://cetcell.mahacet.org/notices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0056A6] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Open Official Webpage</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
