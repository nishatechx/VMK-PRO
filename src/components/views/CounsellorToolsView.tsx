import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Search,
  BookOpen,
  FileText,
  HelpCircle,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  X,
  Phone,
  MessageCircle,
  FileDown,
} from 'lucide-react';
import { UserProfile } from '../../types/auth';

interface CounsellingRecord {
  id: string;
  candidateName: string;
  mobile: string;
  cetScoreOrRank: string;
  courseStream: string;
  category: string;
  inquiryTopic: string;
  recommendedColleges: string;
  counsellorName: string;
  sessionDate: string;
  status: 'Completed' | 'Follow-up Required' | 'Resolved';
  actionNotes?: string;
}

const DEFAULT_COUNSELLING_RECORDS: CounsellingRecord[] = [
  {
    id: 'cns-01',
    candidateName: 'Aditya Ramesh Patil',
    mobile: '98221 44521',
    cetScoreOrRank: '94.62 Percentile (Rank 8,412)',
    courseStream: 'B.E. Computer Engineering',
    category: 'OBC',
    inquiryTopic: 'TFWS vs CAP Round 1 Choice Filling Priority Order',
    recommendedColleges: 'GCOE Amravati, COEP Pune (Spot), SGGS Nanded, VIT Pune',
    counsellorName: 'Pooja Deshmukh',
    sessionDate: '2026-10-11',
    status: 'Completed',
    actionNotes: 'Recommended putting TFWS choice codes first, followed by OBC category choices.',
  },
  {
    id: 'cns-02',
    candidateName: 'Snehal V. Kulkarni',
    mobile: '94231 88765',
    cetScoreOrRank: '91.15 Percentile (PCB)',
    courseStream: 'B. Pharmacy',
    category: 'OPEN / EWS',
    inquiryTopic: 'EWS Eligibility & Government College Cutoffs in Vidarbha',
    recommendedColleges: 'Govt. College of Pharmacy Amravati, Anuradha College Chikhli',
    counsellorName: 'Shrinath (DNO)',
    sessionDate: '2026-10-10',
    status: 'Resolved',
    actionNotes: 'EWS certificate valid up to March 2027 confirmed. Option form drafted.',
  },
  {
    id: 'cns-03',
    candidateName: 'Pranay Gajanan Rathod',
    mobile: '97654 33210',
    cetScoreOrRank: '78.40 Percentile',
    courseStream: 'Direct Second Year Engineering (DSE)',
    category: 'VJ/NT-A',
    inquiryTopic: 'Diploma to Degree Branch Transfer from Electrical to IT',
    recommendedColleges: 'Govt. Polytechnic / Private Autonomous Colleges in Akola/Washim',
    counsellorName: 'Pooja Deshmukh',
    sessionDate: '2026-10-09',
    status: 'Follow-up Required',
    actionNotes: 'Waiting for final semester marksheet submission before CAP Round 2 choices.',
  },
];

const GUIDANCE_MATERIALS = [
  {
    id: 'mat-01',
    title: 'Maharashtra CAP 2026 Option Form Priority Strategy Guide',
    type: 'PDF Document',
    size: '1.4 MB',
    pages: '18 Pages',
    category: 'Strategy & Choice Codes',
    url: 'https://cetcell.mahacet.org',
  },
  {
    id: 'mat-02',
    title: 'Reserved Category Document Checklist & Validity Proforma Guide',
    type: 'Official Circular',
    size: '860 KB',
    pages: '12 Pages',
    category: 'Verification & Validity',
    url: 'https://cetcell.mahacet.org',
  },
  {
    id: 'mat-03',
    title: 'Tuition Fee Waiver Scheme (TFWS) & EWS Quota Admission Norms',
    type: 'Policy Circular',
    size: '640 KB',
    pages: '8 Pages',
    category: 'Fee Concessions',
    url: 'https://cetcell.mahacet.org',
  },
  {
    id: 'mat-04',
    title: 'Agriculture Additional Weightage (7/12 & Farm Labour) Calculation Table',
    type: 'Reference Matrix',
    size: '520 KB',
    pages: '6 Pages',
    category: 'Agriculture Weightage',
    url: 'https://cetcell.mahacet.org',
  },
];

const FORM_TEMPLATES = [
  {
    id: 'tmpl-01',
    title: 'Candidate Grievance & Discrepancy Rectification Undertaking (Format-H)',
    description: 'Required when candidate promises to submit caste validity / NCL within stipulated CAP window.',
    format: 'DOCX / PDF',
  },
  {
    id: 'tmpl-02',
    title: 'CAP Round Seat Cancellation & Document Retrieval Form',
    description: 'Standardized undertaking for surrender of allotted seat during institute round.',
    format: 'PDF Printable',
  },
  {
    id: 'tmpl-03',
    title: 'Counselling Guidance Note & Option Code Mock Worksheet',
    description: 'Worksheet provided to candidates to fill mock preference numbers before online submission.',
    format: 'XLSX / PDF',
  },
];

const FREQUENT_FAQS = [
  {
    q: 'Can a candidate change reservation category after provisional merit list?',
    a: 'Yes, during the Grievance Period (usually 2-3 days following the provisional merit list), candidates can raise an official online grievance with valid supporting documents.',
  },
  {
    q: 'What is the freeze vs betterment rule in CAP rounds?',
    a: 'If a candidate is allotted their 1st preference choice, it is Auto-Freezed and mandatory to accept. For 2nd to 300th choices, candidates can choose Betterment to retain the seat while trying for higher options in subsequent rounds.',
  },
  {
    q: 'Is non-creamy layer (NCL) certificate mandatory for SC and ST candidates?',
    a: 'No. Non-Creamy Layer (NCL) certificate is NOT required for SC and ST candidates. It is mandatory only for VJ/NT, OBC, and SBC categories.',
  },
  {
    q: 'What if a candidate does not have a caste validity certificate at the time of scrutiny?',
    a: 'Candidates can upload the official Caste Validity Application Receipt / Token along with a self-undertaking, with validity submission required before the cutoff date.',
  },
];

interface CounsellorToolsViewProps {
  currentUser?: UserProfile | null;
  onOpenWhatsappTool?: () => void;
  onOpenTicketTool?: () => void;
}

export const CounsellorToolsView: React.FC<CounsellorToolsViewProps> = ({
  currentUser,
  onOpenWhatsappTool,
  onOpenTicketTool,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'materials' | 'templates' | 'faqs'>('records');
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<CounsellingRecord[]>(DEFAULT_COUNSELLING_RECORDS);
  const [selectedRecord, setSelectedRecord] = useState<CounsellingRecord | null>(null);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);

  // New record form
  const [cName, setCName] = useState('');
  const [cMobile, setCMobile] = useState('');
  const [cScore, setCScore] = useState('');
  const [cCourse, setCCourse] = useState('B.E. Computer Engineering');
  const [cCategory, setCCategory] = useState('OPEN');
  const [cTopic, setCTopic] = useState('');
  const [cColleges, setCColleges] = useState('');
  const [cNotes, setCNotes] = useState('');

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      return (
        r.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.mobile.includes(searchTerm) ||
        r.courseStream.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.inquiryTopic.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [records, searchTerm]);

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cMobile.trim()) return;

    const newRec: CounsellingRecord = {
      id: `cns-${Date.now()}`,
      candidateName: cName.trim(),
      mobile: cMobile.trim(),
      cetScoreOrRank: cScore.trim() || 'N/A',
      courseStream: cCourse,
      category: cCategory,
      inquiryTopic: cTopic.trim() || 'General Guidance',
      recommendedColleges: cColleges.trim() || 'Choice list provided',
      counsellorName: currentUser?.fullName || currentUser?.username || 'Counsellor',
      sessionDate: new Date().toISOString().split('T')[0],
      status: 'Completed',
      actionNotes: cNotes.trim() || undefined,
    };

    setRecords((prev) => [newRec, ...prev]);
    setIsAddRecordModalOpen(false);
    setCName('');
    setCMobile('');
    setCScore('');
    setCTopic('');
    setCColleges('');
    setCNotes('');
  };

  return (
    <div className="w-full space-y-5 pb-8 select-none font-sans">
      {/* Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]">
              Admission Guidance Desk
            </span>
            <span className="text-xs text-[#62738D]">Center FC-1102 &bull; Student Counselling</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            Counsellor Desk & Guidance Suite
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Log student counselling sessions, access CAP priority guidelines, download official undertaking templates, and query verification FAQs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsAddRecordModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Log Counselling Session</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl p-1.5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'records'
              ? 'bg-[#073B70] text-white shadow-xs'
              : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Counselling Records ({records.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'materials'
              ? 'bg-[#073B70] text-white shadow-xs'
              : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Guidance Materials ({GUIDANCE_MATERIALS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-[#073B70] text-white shadow-xs'
              : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Official Templates ({FORM_TEMPLATES.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'faqs'
              ? 'bg-[#073B70] text-white shadow-xs'
              : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Counsellor FAQs ({FREQUENT_FAQS.length})</span>
        </button>
      </div>

      {/* TAB 1: Counselling Records */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#DCE5F0] rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidate name, mobile, score, or topic..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
              />
            </div>
            <span className="text-xs text-[#62738D]">
              <strong>{filteredRecords.length}</strong> logged sessions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white border border-[#DCE5F0] hover:border-[#0866D9]/50 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0866D9] border border-blue-200">
                      {rec.category} &bull; {rec.courseStream.split(' ')[0]}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rec.status === 'Completed' ? 'bg-emerald-50 text-[#079669]' : 'bg-amber-50 text-[#D99100]'
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#102544] tracking-tight">
                    {rec.candidateName}
                  </h3>
                  <p className="text-[11px] text-[#62738D] font-mono mt-0.5">
                    {rec.mobile} &bull; {rec.cetScoreOrRank}
                  </p>

                  <div className="p-2.5 rounded-xl bg-[#F4F7FB] border border-[#DCE5F0] mt-3 space-y-1 text-xs">
                    <span className="font-semibold text-[#073B70] block text-[11px]">Inquiry Topic:</span>
                    <p className="text-slate-700 leading-relaxed text-[11px]">{rec.inquiryTopic}</p>
                  </div>
                </div>

                <div className="pt-3.5 mt-3 border-t border-[#DCE5F0] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#62738D]">
                    {rec.sessionDate} &bull; <strong>{rec.counsellorName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(rec)}
                    className="px-2.5 py-1 rounded-lg bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] text-[11px] font-bold cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Guidance Materials */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDANCE_MATERIALS.map((mat) => (
            <div
              key={mat.id}
              className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9]">
                    {mat.category}
                  </span>
                  <span className="text-xs text-[#62738D]">{mat.pages}</span>
                </div>
                <h3 className="text-sm font-bold text-[#102544]">
                  {mat.title}
                </h3>
                <p className="text-xs text-[#62738D] mt-1">
                  Official guideline published by Admission Regulatory Authority, Maharashtra.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#DCE5F0] flex items-center justify-between">
                <span className="text-xs font-mono text-[#62738D]">{mat.size} &bull; {mat.type}</span>
                <a
                  href={mat.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#073B70] hover:bg-[#092744] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Open Brochure</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Official Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FORM_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0866D9] flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#102544]">
                  {tmpl.title}
                </h3>
                <p className="text-xs text-[#62738D] mt-2 leading-relaxed">
                  {tmpl.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#DCE5F0] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#073B70] font-semibold">{tmpl.format}</span>
                <button
                  type="button"
                  onClick={() => alert(`Official Template "${tmpl.title}" downloaded for printing.`)}
                  className="px-3 py-1.5 rounded-lg bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Counsellor FAQs */}
      {activeTab === 'faqs' && (
        <div className="space-y-3">
          {FREQUENT_FAQS.map((faq, idx) => (
            <div key={idx} className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-2">
              <h3 className="text-sm font-bold text-[#073B70] flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0866D9] flex items-center justify-center text-xs shrink-0 mt-0.5">Q</span>
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-[#102544] leading-relaxed pl-7">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Session Modal */}
      {isAddRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-lg w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0866D9]" />
                <h3 className="font-bold text-sm text-[#102544]">Log Student Guidance Session</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Candidate Name *</label>
                  <input
                    type="text"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="e.g. Aditya Patil"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Mobile Contact *</label>
                  <input
                    type="tel"
                    value={cMobile}
                    onChange={(e) => setCMobile(e.target.value)}
                    placeholder="e.g. 98221 44521"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg font-mono outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">CET Score / Rank</label>
                  <input
                    type="text"
                    value={cScore}
                    onChange={(e) => setCScore(e.target.value)}
                    placeholder="e.g. 94.62 %ile (Rank 8412)"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Category</label>
                  <select
                    value={cCategory}
                    onChange={(e) => setCCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg bg-white outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                    <option value="VJ/NT">VJ/NT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#102544] mb-1">Inquiry Topic</label>
                <input
                  type="text"
                  value={cTopic}
                  onChange={(e) => setCTopic(e.target.value)}
                  placeholder="e.g. TFWS choice filling priority order / EWS eligibility"
                  className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#102544] mb-1">Colleges & Options Recommended</label>
                <input
                  type="text"
                  value={cColleges}
                  onChange={(e) => setCColleges(e.target.value)}
                  placeholder="e.g. GCOE Amravati, COEP, SGGS Nanded"
                  className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#102544] mb-1">Session Action Notes</label>
                <textarea
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  rows={2}
                  placeholder="Specific instructions provided to student..."
                  className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#DCE5F0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddRecordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0866D9] hover:bg-[#073B70] text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Detail Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-lg w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div>
                <span className="text-[10px] font-bold text-[#0866D9] uppercase">{selectedRecord.category}</span>
                <h3 className="font-bold text-sm text-[#102544]">{selectedRecord.candidateName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Contact:</span>
                <span className="font-mono text-[#102544]">{selectedRecord.mobile}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Score / Rank:</span>
                <span className="font-semibold text-[#073B70]">{selectedRecord.cetScoreOrRank}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Course Stream:</span>
                <span className="font-medium text-[#102544]">{selectedRecord.courseStream}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Counsellor:</span>
                <span className="text-[#102544]">{selectedRecord.counsellorName} ({selectedRecord.sessionDate})</span>
              </div>
              <div className="pt-1">
                <span className="font-semibold text-[#073B70] block mb-0.5">Colleges Recommended:</span>
                <p className="text-slate-700 bg-white p-2 rounded border border-[#DCE5F0]">{selectedRecord.recommendedColleges}</p>
              </div>
              {selectedRecord.actionNotes && (
                <div className="pt-1">
                  <span className="font-semibold text-[#102544] block mb-0.5">Session Action Notes:</span>
                  <p className="text-slate-700 bg-white p-2 rounded border border-[#DCE5F0]">{selectedRecord.actionNotes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              {onOpenWhatsappTool && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRecord(null);
                    onOpenWhatsappTool();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send Ticket Note on WhatsApp</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
