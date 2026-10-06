import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  BookOpen,
  FileText,
  ChevronRight,
  Filter,
  RotateCcw,
  Bookmark,
  History,
  Home,
  Layers,
  Settings,
  GraduationCap,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from 'lucide-react';
import {
  CeraDocument,
  CeraChatMessage,
  CeraCitation,
  EducationSection,
} from '../../types/cera';
import { APP_ASSETS } from '../../constants/assets';
import {
  getAllCeraDocuments,
  openCeraPdfPage,
  getCeraBookmarks,
  getCeraHistory,
} from '../../services/ceraService';
import { CeraPdfViewer } from './CeraPdfViewer';
import { AskCeraPanel } from './AskCeraPanel';
import { UserProfile } from '../../types/auth';

interface CeraKnowledgeCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  initialDocumentId?: string;
}

type NavSection = 'home' | 'cet' | 'cap' | 'documents' | 'ask_cera' | 'bookmarks' | 'history' | 'settings';

const EDUCATION_SECTIONS: EducationSection[] = [
  'Technical Education',
  'Higher Education',
  'Agriculture Education',
  'Fine Art Education',
  'Medical Education',
  'Ayush Education',
];

export const CeraKnowledgeCenterModal: React.FC<CeraKnowledgeCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialDocumentId,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // hide sidebar by default
  const [isCoursesOpen, setIsCoursesOpen] = useState<boolean>(false); // dont give courses by default open
  const [activeNav, setActiveNav] = useState<NavSection>('home');
  const [activeTypeTab, setActiveTypeTab] = useState<'CET' | 'CAP'>('CET');
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(true);

  // Documents
  const allDocuments = useMemo(() => getAllCeraDocuments(), []);

  // Active Document Workspace (null by default — dont open pdf by default)
  const [selectedDoc, setSelectedDoc] = useState<CeraDocument | null>(null);
  const [activeViewerPage, setActiveViewerPage] = useState<number>(1);

  // Filters State
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // AI Chat Conversation State
  const [chatMessages, setChatMessages] = useState<CeraChatMessage[]>([]);

  // Sync initialDocumentId if provided
  useEffect(() => {
    if (initialDocumentId && isOpen) {
      const match = allDocuments.find((d) => d.id === initialDocumentId);
      if (match) {
        setSelectedDoc(match);
        setActiveTypeTab(match.type);
        setActiveViewerPage(1);
        setIsCoursesOpen(false); // keep courses closed by default
      }
    }
  }, [initialDocumentId, isOpen, allDocuments]);

  // Keyboard shortcut Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('cera-global-search-input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cascading Filter Options
  const cascadingOptions = useMemo(() => {
    let pool = allDocuments.filter((d) => {
      if (activeNav === 'cet') return d.type === 'CET';
      if (activeNav === 'cap') return d.type === 'CAP';
      return d.type === activeTypeTab;
    });

    const sections = Array.from(new Set(pool.map((d) => d.educationSection))).sort();
    if (selectedSection !== 'all') {
      pool = pool.filter((d) => d.educationSection === selectedSection);
    }

    const levels = Array.from(new Set(pool.map((d) => d.level))).sort();
    if (selectedLevel !== 'all') {
      pool = pool.filter((d) => d.level === selectedLevel);
    }

    const courses = Array.from(new Set(pool.map((d) => d.courseName))).sort();
    if (selectedCourse !== 'all') {
      pool = pool.filter((d) => d.courseName.toLowerCase() === selectedCourse.toLowerCase());
    }

    const academicYears = Array.from(new Set(pool.map((d) => d.academicYear))).sort().reverse();
    const documentTypes = Array.from(new Set(pool.map((d) => d.documentType))).sort();

    return { sections, levels, courses, academicYears, documentTypes };
  }, [allDocuments, activeNav, activeTypeTab, selectedSection, selectedLevel, selectedCourse]);

  // Filtered Document Catalogue
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      if (activeNav === 'cet' && doc.type !== 'CET') return false;
      if (activeNav === 'cap' && doc.type !== 'CAP') return false;
      if ((activeNav === 'home' || activeNav === 'documents') && doc.type !== activeTypeTab) return false;

      if (selectedSection !== 'all' && doc.educationSection !== selectedSection) return false;
      if (selectedLevel !== 'all' && doc.level !== selectedLevel) return false;
      if (selectedCourse !== 'all' && doc.courseName.toLowerCase() !== selectedCourse.toLowerCase()) return false;
      if (selectedYear !== 'all' && doc.academicYear !== selectedYear) return false;
      if (selectedDocType !== 'all' && doc.documentType !== selectedDocType) return false;

      if (globalSearchQuery.trim()) {
        const q = globalSearchQuery.toLowerCase().trim();
        const match =
          doc.courseName.toLowerCase().includes(q) ||
          doc.title.toLowerCase().includes(q) ||
          doc.educationSection.toLowerCase().includes(q) ||
          doc.academicYear.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    allDocuments,
    activeNav,
    activeTypeTab,
    selectedSection,
    selectedLevel,
    selectedCourse,
    selectedYear,
    selectedDocType,
    globalSearchQuery,
  ]);

  const handleClearFilters = () => {
    setSelectedSection('all');
    setSelectedLevel('all');
    setSelectedCourse('all');
    setSelectedYear('all');
    setSelectedDocType('all');
    setGlobalSearchQuery('');
  };

  const handleSelectDocument = (doc: CeraDocument, pageNumber: number = 1) => {
    setSelectedDoc(doc);
    setActiveViewerPage(pageNumber);
  };

  const handleJumpToCitation = (citation: CeraCitation) => {
    let target = selectedDoc;
    if (!target || target.id !== citation.documentId) {
      const match = allDocuments.find((d) => d.id === citation.documentId);
      if (match) {
        target = match;
        setSelectedDoc(match);
      }
    }
    setActiveViewerPage(citation.pageNumber || 1);
    openCeraPdfPage(citation.pdfUrl, citation.pageNumber, citation.officialSourcePageUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-2xs select-none">
      <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-2xl flex flex-col overflow-hidden max-w-[1560px] h-[95vh] max-h-[960px]">
        {/* ========================================================= */}
        {/* TOP BAR (Minimal, clean, no badges)                       */}
        {/* ========================================================= */}
        <header className="h-13 px-4 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0 select-none">
          {/* Logo & Toggles */}
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle Button (hide sidebar option, hidden by default) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`px-2 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                isSidebarOpen
                  ? 'bg-[#F0F7FF] text-[#1677FF] border-[#1677FF]/30 font-semibold'
                  : 'text-[#64748B] hover:text-[#172033] border-[#E2E8F0] hover:bg-[#F8FAFC] font-medium'
              }`}
              title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSidebarOpen ? 'Hide sidebar' : 'Sidebar'}</span>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <img src={APP_ASSETS.SIA} alt="SIA" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <span className="font-bold text-base tracking-tight text-[#172033]">
                SIA
              </span>
            </div>

            {/* Courses Toggle Button (dont give courses by default open) */}
            <button
              type="button"
              onClick={() => setIsCoursesOpen(!isCoursesOpen)}
              className={`ml-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                isCoursesOpen
                  ? 'bg-[#F0F7FF] text-[#1677FF] border-[#1677FF]/30 font-semibold'
                  : 'text-[#64748B] hover:text-[#172033] border-[#E2E8F0] hover:bg-[#F8FAFC] font-medium'
              }`}
              title={isCoursesOpen ? 'Hide courses' : 'Browse courses'}
              aria-label={isCoursesOpen ? 'Hide courses' : 'Browse courses'}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isCoursesOpen ? 'Hide courses' : 'Courses'}</span>
            </button>
          </div>

          {/* Search: "Search course, document or keyword..." (Ctrl + K) */}
          <div className="flex-1 max-w-lg relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="cera-global-search-input"
              type="text"
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  setIsCoursesOpen(true);
                }
              }}
              placeholder="Search course, document or keyword..."
              className="w-full pl-9 pr-14 py-1.5 text-xs bg-[#F8FAFC] text-[#172033] placeholder:text-[#94A3B8] border border-[#E2E8F0] rounded-lg focus:border-[#1677FF] focus:bg-[#FFFFFF] outline-none transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#94A3B8] bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#E2E8F0] pointer-events-none">
              Ctrl+K
            </span>
          </div>

          {/* Profile & Controls */}
          <div className="flex items-center gap-2 text-[#64748B]">
            <button
              type="button"
              onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isAiPanelOpen
                  ? 'bg-[#F0F7FF] text-[#1677FF] border-[#1677FF]/30'
                  : 'text-[#64748B] hover:text-[#172033] border-[#E2E8F0] hover:bg-[#F8FAFC]'
              }`}
              title={isAiPanelOpen ? 'Hide Ask CIA panel' : 'Open Ask CIA panel'}
            >
              {isAiPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
              <User className="w-3.5 h-3.5 text-[#64748B]" />
              <span className="font-medium hidden md:inline truncate max-w-[120px]">
                {currentUser?.fullName || currentUser?.username || 'User'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#172033] rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              title="Close CIA"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 4-COLUMN DESKTOP LAYOUT (Section: LAYOUT)                */}
        {/* | Sidebar | Document Library | PDF Viewer | Ask CIA |     */}
        {/* ========================================================= */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* COLUMN 1: SIDEBAR (Hidden by default, toggleable via isSidebarOpen) */}
          {isSidebarOpen && (
            <aside className="w-14 sm:w-48 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none py-2.5">
              <div>
                {/* Sidebar Header with explicit Hide sidebar option */}
                <div className="px-2.5 pb-2 mb-1.5 flex items-center justify-between border-b border-[#E2E8F0]">
                  <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider hidden sm:inline px-1">
                    Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 sm:px-2 sm:py-1 text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ml-auto"
                    title="Hide sidebar"
                    aria-label="Hide sidebar"
                  >
                    <PanelLeftClose className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hide sidebar</span>
                  </button>
                </div>

                <nav className="space-y-0.5 px-1.5 sm:px-2">
                {[
                  { id: 'home', label: 'Home', icon: Home },
                  { id: 'cet', label: 'CET', icon: GraduationCap },
                  { id: 'cap', label: 'CAP', icon: Layers },
                  { id: 'documents', label: 'Documents', icon: BookOpen },
                  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
                  { id: 'history', label: 'History', icon: History },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveNav(item.id as NavSection);
                        if (item.id === 'cet') {
                          setActiveTypeTab('CET');
                          setIsCoursesOpen(true);
                        }
                        if (item.id === 'cap') {
                          setActiveTypeTab('CAP');
                          setIsCoursesOpen(true);
                        }
                        if (item.id === 'documents') {
                          setIsCoursesOpen(true);
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'border-l-2 border-[#1677FF] bg-[#F0F7FF] text-[#1677FF] font-semibold'
                          : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1677FF]' : 'text-[#64748B]'}`} />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Settings at bottom */}
              <div className="px-1.5 sm:px-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 shrink-0 text-[#64748B]" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
              </div>
            </aside>
          )}

          {/* COLUMN 2: DOCUMENT LIBRARY (Hidden by default, toggleable via isCoursesOpen) */}
          {isCoursesOpen && (
            <section className="w-72 sm:w-80 lg:w-84 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col shrink-0 min-h-0 overflow-hidden">
              {/* CET / CAP Switcher: [CET] [CAP] segmented control */}
              <div className="p-3 border-b border-[#E2E8F0] shrink-0">
                <div className="flex rounded-lg bg-[#F1F5F9] p-0.5 border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setActiveTypeTab('CET')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      activeTypeTab === 'CET'
                        ? 'bg-[#1677FF] text-white shadow-2xs'
                        : 'text-[#64748B] hover:text-[#172033]'
                    }`}
                  >
                    CET
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTypeTab('CAP')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      activeTypeTab === 'CAP'
                        ? 'bg-[#1677FF] text-white shadow-2xs'
                        : 'text-[#64748B] hover:text-[#172033]'
                    }`}
                  >
                    CAP
                  </button>
                </div>
              </div>

              {/* Compact Filters: [Section] [Level] [Course] [Year] [Type] */}
              <div className="p-3 border-b border-[#E2E8F0] bg-[#FAFCFF] space-y-2 shrink-0">
                <div className="flex items-center justify-between text-[11px] font-medium text-[#64748B]">
                  <span className="font-semibold text-[#172033]">Filters</span>
                  {(selectedSection !== 'all' ||
                    selectedLevel !== 'all' ||
                    selectedCourse !== 'all' ||
                    selectedYear !== 'all' ||
                    selectedDocType !== 'all') && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-[#1677FF] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {/* Section Filter */}
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setSelectedCourse('all');
                    }}
                    className="w-full text-[11px] py-1 px-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-[#172033] outline-none"
                  >
                    <option value="all">Section: All</option>
                    {EDUCATION_SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>

                  {/* Level Filter */}
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full text-[11px] py-1 px-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-[#172033] outline-none"
                  >
                    <option value="all">Level: All</option>
                    {cascadingOptions.levels.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>

                  {/* Course Filter */}
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full text-[11px] py-1 px-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-[#172033] outline-none col-span-2 truncate"
                  >
                    <option value="all">Course: All Courses ({cascadingOptions.courses.length})</option>
                    {cascadingOptions.courses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Year Filter */}
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full text-[11px] py-1 px-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-[#172033] outline-none"
                  >
                    <option value="all">Year: All</option>
                    {cascadingOptions.academicYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>

                  {/* Document Type */}
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-full text-[11px] py-1 px-2 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-[#172033] outline-none"
                  >
                    <option value="all">Type: All</option>
                    {cascadingOptions.documentTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Document Library List: Title "Documents" */}
              <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-xs shrink-0">
                <span className="font-semibold text-[#172033]">
                  Documents <span className="text-[#64748B] font-normal">{filteredDocuments.length}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCoursesOpen(false)}
                  className="text-[11px] text-[#64748B] hover:text-[#172033] cursor-pointer"
                  title="Close courses panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#E2E8F0]">
                {filteredDocuments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B] space-y-2">
                    <p>No documents found for the selected filters.</p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-[#1677FF] font-medium hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  filteredDocuments.map((doc, idx) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <button
                        key={`${doc.id}-${idx}`}
                        type="button"
                        onClick={() => handleSelectDocument(doc)}
                        className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F0F7FF] border-l-2 border-[#1677FF]'
                            : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-md bg-[#F1F5F9] text-[#64748B] flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-[#172033] truncate">
                            {doc.courseName}
                          </h4>
                          <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                            {doc.documentType}
                          </div>
                          <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate">
                            {doc.academicYear} · {doc.educationSection} · {doc.level}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0 mt-2" />
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {/* COLUMN 3: MIDDLE PDF WORKSPACE (PDF Viewer) */}
          <main className="flex-1 flex flex-col min-h-0 bg-[#FFFFFF] overflow-hidden">
            {selectedDoc ? (
              <CeraPdfViewer
                document={selectedDoc}
                initialPage={activeViewerPage}
                onPageChange={(pg) => setActiveViewerPage(pg)}
                onCloseViewer={() => setSelectedDoc(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#64748B] space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#F0F7FF] border border-[#BAE0FD] flex items-center justify-center text-[#1677FF] shadow-2xs">
                  <BookOpen className="w-7 h-7 text-[#1677FF]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[#172033]">Official Document Workspace</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Select a course to view official PDF brochures, or ask CIA any question directly in the research panel.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCoursesOpen(true);
                      setActiveTypeTab('CET');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#1677FF] hover:bg-[#1677FF]/90 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Browse Courses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCoursesOpen(true);
                      setActiveTypeTab('CET');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>CET Brochures</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCoursesOpen(true);
                      setActiveTypeTab('CAP');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>CAP Guidelines</span>
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* COLUMN 4: RIGHT ASK CIA PANEL (Information Assistant) */}
          {isAiPanelOpen && (
            <aside className="w-80 sm:w-96 lg:w-[410px] shrink-0 h-full overflow-hidden">
              <AskCeraPanel
                activeDocument={selectedDoc}
                onJumpToPage={handleJumpToCitation}
                messages={chatMessages}
                setMessages={setChatMessages}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
