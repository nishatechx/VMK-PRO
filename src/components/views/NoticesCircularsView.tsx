import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Search,
  Filter,
  FileText,
  ExternalLink,
  Download,
  Calendar,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  X,
  FileCheck,
} from 'lucide-react';
import { cetNoticeService } from '../../services/cetNoticeService';
import { CetNotice, CetNoticesResponse } from '../../types/cetNotice';
import { OFFICIAL_CET_DOCUMENTS } from '../../data/officialCetDocuments';
import { DashboardNoticeBar } from '../DashboardNoticeBar';

export const NoticesCircularsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'combined' | 'admission_notices' | 'circulars_archive'>('combined');
  const [noticesData, setNoticesData] = useState<CetNoticesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedImportance, setSelectedImportance] = useState<'All' | 'Latest' | 'Important'>('All');
  const [selectedNoticeForPreview, setSelectedNoticeForPreview] = useState<CetNotice | null>(null);

  const loadNotices = async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      const res = await cetNoticeService.getNotices(force);
      setNoticesData(res);
    } catch (err) {
      console.error('Failed to load notices', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const allNotices: CetNotice[] = useMemo(() => {
    return noticesData?.notices || [];
  }, [noticesData]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(allNotices.map((n) => n.course).filter(Boolean)));
    return ['All', ...list];
  }, [allNotices]);

  const filteredNotices = useMemo(() => {
    return allNotices.filter((n) => {
      const matchSearch =
        !searchTerm ||
        n.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.course && n.course.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (n.date && n.date.includes(searchTerm));
      const matchCategory = selectedCategory === 'All' || n.course === selectedCategory;
      const matchImportance =
        selectedImportance === 'All' ||
        (selectedImportance === 'Latest' && (n.period === 'today' || n.period === 'yesterday')) ||
        (selectedImportance === 'Important' &&
          (n.period === 'today' ||
            n.subject.toLowerCase().includes('important') ||
            n.subject.toLowerCase().includes('urgent') ||
            n.subject.toLowerCase().includes('schedule')));

      return matchSearch && matchCategory && matchImportance;
    });
  }, [allNotices, searchTerm, selectedCategory, selectedImportance]);

  return (
    <div className="w-full space-y-5 pb-8 select-none font-sans">
      {/* Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]">
              Official Circulars
            </span>
            <span className="text-xs text-[#62738D]">
              Source: cetcell.mahacet.org &bull; Live Feed
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            Government Notices & Circulars
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Real-time feed of official admission orders, exam dates, syllabus updates, and CAP schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Section Mode Toggle */}
          <div className="inline-flex items-center bg-[#F4F7FB] p-1 rounded-xl border border-[#DCE5F0] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSection('combined')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSection === 'combined'
                  ? 'bg-white text-[#0866D9] shadow-2xs'
                  : 'text-[#62738D] hover:text-[#102544]'
              }`}
            >
              Dual View
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admission_notices')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'admission_notices'
                  ? 'bg-white text-[#0866D9] shadow-2xs'
                  : 'text-[#62738D] hover:text-[#102544]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Admission Notices</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('circulars_archive')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSection === 'circulars_archive'
                  ? 'bg-white text-[#0866D9] shadow-2xs'
                  : 'text-[#62738D] hover:text-[#102544]'
              }`}
            >
              Circulars Archive
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadNotices(true)}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl bg-white hover:bg-[#F4F7FB] text-[#102544] border border-[#DCE5F0] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0866D9]' : 'text-[#62738D]'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* View Mode 1: Admission Notices Only (Full Width) */}
      {activeSection === 'admission_notices' && (
        <div className="w-full">
          <DashboardNoticeBar className="h-[780px] w-full" />
        </div>
      )}

      {/* View Mode 2: Dual View (Circulars Table + Admission Notices Sidebar) */}
      {activeSection === 'combined' && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left Column: Filter Toolbar & Circulars Feed */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search circulars by keyword, course, or date..."
                    className="w-full text-xs pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-lg text-[#102544] placeholder:text-[#62738D] focus:border-[#0866D9] focus:bg-white outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-[#62738D]" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none max-w-[150px] truncate"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={selectedImportance}
                    onChange={(e) => setSelectedImportance(e.target.value as any)}
                    className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
                  >
                    <option value="All">All Notices</option>
                    <option value="Latest">Latest</option>
                    <option value="Important">Important</option>
                  </select>
                </div>
              </div>

              <span className="text-xs text-[#62738D]">
                Showing <strong>{filteredNotices.length}</strong> circulars
              </span>
            </div>

            {/* Notices List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-[#DCE5F0]">
                  <RefreshCw className="w-8 h-8 text-[#0866D9] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-[#102544]">Synchronizing official circular feed...</p>
                </div>
              ) : filteredNotices.length === 0 ? (
                <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-[#DCE5F0]">
                  <Bell className="w-8 h-8 text-[#62738D] mx-auto opacity-40" />
                  <p className="text-xs font-semibold text-[#102544]">No notices found matching your query</p>
                </div>
              ) : (
                filteredNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      notice.isPinned
                        ? 'border-l-4 border-l-[#0866D9] border-[#DCE5F0] bg-gradient-to-r from-[#EBF3FC]/30 to-white'
                        : 'border-[#DCE5F0]'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {notice.isPinned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#073B70] text-white">
                            PINNED
                          </span>
                        )}
                        {notice.isNew && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#079669] text-white animate-pulse">
                            NEW
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F4F7FB] text-[#073B70] border border-[#DCE5F0]">
                          {notice.course || 'CET Cell General'}
                        </span>
                        <span className="text-xs text-[#62738D] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#62738D]" />
                          <span>{notice.date}</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#102544] leading-snug">
                        {notice.subject}
                      </h3>

                      {notice.description && (
                        <p className="text-xs text-[#62738D] line-clamp-2">
                          {notice.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {notice.pdfUrl && (
                        <a
                          href={notice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <span>View PDF</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedNoticeForPreview(notice)}
                        className="px-3 py-2 rounded-xl bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0] text-xs font-semibold cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Admission Notices Live Feed */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-4">
            <DashboardNoticeBar className="h-[750px]" />
          </div>
        </div>
      )}

      {/* View Mode 3: Circulars Archive Only (Full Width) */}
      {activeSection === 'circulars_archive' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search circulars by keyword, course, or date..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-lg text-[#102544] placeholder:text-[#62738D] focus:border-[#0866D9] focus:bg-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#62738D]" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none max-w-[160px] truncate"
                >
                  {categories.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedImportance}
                  onChange={(e) => setSelectedImportance(e.target.value as any)}
                  className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
                >
                  <option value="All">All Notices</option>
                  <option value="Latest">Latest & Pinned</option>
                  <option value="Important">Important Only</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-[#62738D]">
              Showing <strong>{filteredNotices.length}</strong> circulars
            </span>
          </div>

          {/* Notices List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-[#DCE5F0]">
                <RefreshCw className="w-8 h-8 text-[#0866D9] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#102544]">Synchronizing official circular feed...</p>
              </div>
            ) : filteredNotices.length === 0 ? (
              <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-[#DCE5F0]">
                <Bell className="w-8 h-8 text-[#62738D] mx-auto opacity-40" />
                <p className="text-xs font-semibold text-[#102544]">No notices found matching your query</p>
              </div>
            ) : (
              filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    notice.isPinned
                      ? 'border-l-4 border-l-[#0866D9] border-[#DCE5F0] bg-gradient-to-r from-[#EBF3FC]/30 to-white'
                      : 'border-[#DCE5F0]'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {notice.isPinned && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#073B70] text-white">
                          PINNED
                        </span>
                      )}
                      {notice.isNew && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#079669] text-white animate-pulse">
                          NEW
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F4F7FB] text-[#073B70] border border-[#DCE5F0]">
                        {notice.course || 'CET Cell General'}
                      </span>
                      <span className="text-xs text-[#62738D] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#62738D]" />
                        <span>{notice.date}</span>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#102544] leading-snug">
                      {notice.subject}
                    </h3>

                    {notice.description && (
                      <p className="text-xs text-[#62738D] line-clamp-2">
                        {notice.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {notice.pdfUrl && (
                      <a
                        href={notice.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <span>View PDF</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedNoticeForPreview(notice)}
                      className="px-3 py-2 rounded-xl bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0] text-xs font-semibold cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notice Detail Modal */}
      {selectedNoticeForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-lg w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9]">
                  {selectedNoticeForPreview.course || 'General'}
                </span>
                <span className="text-xs text-[#62738D]">{selectedNoticeForPreview.date}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoticeForPreview(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#102544] leading-snug">
                {selectedNoticeForPreview.subject}
              </h3>

              {selectedNoticeForPreview.description && (
                <div className="p-3 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] text-xs text-slate-700 leading-relaxed">
                  {selectedNoticeForPreview.description}
                </div>
              )}

              {selectedNoticeForPreview.pdfUrl && (
                <div className="pt-2">
                  <a
                    href={selectedNoticeForPreview.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Open Official Document PDF</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedNoticeForPreview(null)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
