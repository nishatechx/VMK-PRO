import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  Video,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { OFFICIAL_CET_DOCUMENTS } from '../../data/officialCetDocuments';

interface KnowledgeBaseViewProps {
  onOpenKnowledgeCenter?: () => void;
}

const VIDEO_TUTORIALS = [
  {
    id: 'vid-01',
    title: 'How to Fill Online Option Form for Engineering & Pharmacy CAP',
    duration: '14 mins',
    channel: 'Official Admission Guidance & Rules',
    category: 'CAP Process',
    updated: 'October 2026',
    url: 'https://cetcell.mahacet.org',
  },
  {
    id: 'vid-02',
    title: 'E-Scrutiny Document Verification Steps & Resolving Discrepancies',
    duration: '10 mins',
    channel: 'Facilitation Center Staff Training',
    category: 'Scrutiny Training',
    updated: 'September 2026',
    url: 'https://cetcell.mahacet.org',
  },
  {
    id: 'vid-03',
    title: 'Caste Validity & Non-Creamy Layer (NCL) Certificate Guidelines',
    duration: '12 mins',
    channel: 'BARTI / TRTI Maharashtra Portal',
    category: 'Reservation Rules',
    updated: 'August 2026',
    url: 'https://cetcell.mahacet.org',
  },
];

const QUICK_RULE_GUIDES = [
  {
    id: 'guide-01',
    title: 'OMS (Outside Maharashtra State) Candidate Eligibility Matrix',
    subtitle: 'All India Seats vs Institutional Quota & Document Checklist',
    summary: 'Rules governing candidates passing HSC outside Maharashtra, NRI quotas, and eligibility for Government autonomous institutes.',
    category: 'Eligibility Norms',
    updatedDate: '05/10/2026',
  },
  {
    id: 'guide-02',
    title: 'TFWS (Tuition Fee Waiver Scheme) 5% Supernumerary Seats',
    subtitle: 'Family Income Criteria (< 8 Lakhs) & Choice Code Format',
    summary: 'Step-by-step instructions on selecting the "T" suffix choice code in option forms and required Tehsildar income certificate.',
    category: 'Fee Concessions',
    updatedDate: '28/09/2026',
  },
  {
    id: 'guide-03',
    title: 'Agriculture 12-Mark Additional Weightage Verification Rules',
    subtitle: '7/12 Extract, Agriculturist Certificate & Landless Labour Certificate',
    summary: 'Statutory guidelines for awarding 12 marks in B.Sc. (Hons) Agriculture admissions based on Maharashtra Agriculture Universities norms.',
    category: 'Agriculture Weightage',
    updatedDate: '15/09/2026',
  },
];

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  onOpenKnowledgeCenter,
}) => {
  const [activeSection, setActiveSection] = useState<'documents' | 'guides' | 'videos'>('documents');
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');

  const courseList = useMemo(() => {
    const list = Array.from(new Set(OFFICIAL_CET_DOCUMENTS.map((d) => d.courseName)));
    return ['All', ...list];
  }, []);

  const filteredDocs = useMemo(() => {
    return OFFICIAL_CET_DOCUMENTS.filter((d) => {
      const matchSearch =
        !searchTerm ||
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.courseName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCourse = courseFilter === 'All' || d.courseName === courseFilter;
      return matchSearch && matchCourse;
    });
  }, [searchTerm, courseFilter]);

  return (
    <div className="w-full space-y-5 pb-8 select-none font-sans">
      {/* Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]">
              Official Repository
            </span>
            <span className="text-xs text-[#62738D]">CET & CAP Rulebooks</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            Knowledge Base & Official Rulebooks
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Searchable repository of official admission information bulletins, video tutorials, and verification manuals.
          </p>
        </div>

        {onOpenKnowledgeCenter && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={onOpenKnowledgeCenter}
              className="px-4 py-2 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Launch CIA Rulebook Assistant</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl p-1.5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveSection('documents')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeSection === 'documents' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Official Rulebooks ({OFFICIAL_CET_DOCUMENTS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('guides')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeSection === 'guides' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Quick Policy Guides ({QUICK_RULE_GUIDES.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('videos')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeSection === 'videos' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Video Tutorials ({VIDEO_TUTORIALS.length})</span>
        </button>
      </div>

      {/* SECTION 1: Official Rulebooks */}
      {activeSection === 'documents' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE5F0] rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rulebook by title or course name..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
              >
                {courseList.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-[#DCE5F0] hover:border-[#0866D9]/50 rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0866D9] uppercase">
                      {doc.type} &bull; {doc.educationSection}
                    </span>
                    <span className="text-[11px] text-[#62738D] font-mono">{doc.academicYear}</span>
                  </div>

                  <h3 className="text-sm font-bold text-[#102544] leading-snug tracking-tight">
                    {doc.title}
                  </h3>

                  <div className="mt-3 space-y-1 text-xs text-[#62738D]">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#073B70]" />
                      <span className="font-semibold text-[#102544]">{doc.courseName}</span>
                    </div>
                    <div>Page Count: {doc.pageCount || 40} Verified Pages</div>
                    <div>Published: {doc.publishedDate}</div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#DCE5F0] flex items-center justify-between">
                  {doc.pdfUrl ? (
                    <a
                      href={doc.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#073B70] hover:bg-[#092744] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Open PDF</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Archived</span>
                  )}

                  {onOpenKnowledgeCenter && (
                    <button
                      type="button"
                      onClick={onOpenKnowledgeCenter}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] text-xs font-semibold cursor-pointer"
                    >
                      Ask CIA
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Policy Guides */}
      {activeSection === 'guides' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_RULE_GUIDES.map((guide) => (
            <div
              key={guide.id}
              className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] uppercase">
                  {guide.category}
                </span>
                <h3 className="text-sm font-bold text-[#102544] mt-2">
                  {guide.title}
                </h3>
                <p className="text-[11px] font-semibold text-[#073B70] mt-0.5">
                  {guide.subtitle}
                </p>
                <p className="text-xs text-[#62738D] mt-2 leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#DCE5F0] flex items-center justify-between text-xs text-[#62738D]">
                <span>Updated: {guide.updatedDate}</span>
                <span className="text-[#0866D9] font-bold cursor-pointer hover:underline">Read Policy</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 3: Video Tutorials */}
      {activeSection === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {VIDEO_TUTORIALS.map((vid) => (
            <div
              key={vid.id}
              className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                  {vid.category} &bull; {vid.duration}
                </span>
                <h3 className="text-sm font-bold text-[#102544] mt-2 leading-snug">
                  {vid.title}
                </h3>
                <p className="text-xs text-[#62738D] mt-1">
                  {vid.channel} &bull; {vid.updated}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#DCE5F0]">
                <a
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 rounded-xl bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Watch Tutorial</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
