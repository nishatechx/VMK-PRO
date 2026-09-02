import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Printer,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  Hash,
  Users,
  MessageCircle,
} from 'lucide-react';
import { getStudentRecords, getCurrentUser } from '../services/authService';
import { saveTicketRecord } from '../services/ticketService';
import { UserProfile, TicketRecord } from '../types/auth';
import { WhatsappInitialData } from './WhatsappTicketModal';

export interface TicketState {
  cetNo: string;
  capId: string;
  candidateName: string;
  dob: string;
  mobile: string;
  email: string;
  course: string;
  query: string;
}

interface TicketGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCandidate?: {
    id?: string;
    name?: string;
    mobile?: string;
    email?: string;
    course?: string;
  };
  currentUser?: UserProfile | null;
  onOpenWhatsappWithData?: (data: WhatsappInitialData) => void;
}

const COMMON_COURSES = [
  'B.E. / B.Tech (Engineering & Technology)',
  'Direct Second Year Engineering (DSE)',
  'MBA / MMS (Management Studies)',
  'MCA (Computer Applications)',
  'B.Pharmacy (Pharmacy)',
  'Direct Second Year Pharmacy (DSP)',
  'M.Pharmacy / Pharm.D',
  'Agriculture & Allied Courses',
  'LLB (3 Years / 5 Years)',
  'B.Ed / M.Ed (Teacher Education)',
  'B.HMCT / M.HMCT (Hotel Management)',
  'B.Design / Fine Arts',
  'Other MHT-CET Approved Course',
];

export const TicketGeneratorModal: React.FC<TicketGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialCandidate,
  currentUser,
  onOpenWhatsappWithData,
}) => {
  // 8 Mandatory Ticket Fields
  const [ticketForm, setTicketForm] = useState<TicketState>({
    cetNo: '',
    capId: '',
    candidateName: '',
    dob: '',
    mobile: '',
    email: '',
    course: 'B.E. / B.Tech (Engineering & Technology)',
    query: '',
  });

  const [ticketOutput, setTicketOutput] = useState<string>('');
  const [ticketStatus, setTicketStatus] = useState<{ message: string; type: 'ok' | 'bad' | 'neutral' }>({
    message: 'Fill all 8 mandatory fields to generate an official candidate ticket note.',
    type: 'neutral',
  });
  const [ticketCopied, setTicketCopied] = useState<boolean>(false);
  const [generatedTicketNo, setGeneratedTicketNo] = useState<string>('');
  const [isSavedToDb, setIsSavedToDb] = useState<boolean>(false);

  // Quick Pick candidates from state
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const studs = getStudentRecords();
      setAvailableStudents(studs);

      if (initialCandidate) {
        setTicketForm((prev) => ({
          ...prev,
          cetNo: initialCandidate.id || prev.cetNo,
          capId: prev.capId || (initialCandidate.id ? `EN26${initialCandidate.id.replace(/\D/g, '').slice(-6)}` : ''),
          candidateName: initialCandidate.name || prev.candidateName,
          mobile: initialCandidate.mobile || prev.mobile,
          email: initialCandidate.email || prev.email,
          course: initialCandidate.course || prev.course,
        }));
      }
    }
  }, [isOpen, initialCandidate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTicketChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTicketForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreFillCandidate = (studentId: string) => {
    const found = availableStudents.find((s) => s.id === studentId);
    if (found) {
      setTicketForm((prev) => ({
        ...prev,
        cetNo: found.id,
        capId: prev.capId || `EN26${found.id.replace(/\D/g, '').slice(-6) || '102948'}`,
        candidateName: found.name,
        mobile: found.mobile,
        email: found.email || `${found.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        course: found.course || prev.course,
      }));
    }
  };

  const generateTicket = () => {
    const { cetNo, capId, candidateName, dob, mobile, email, course, query } = ticketForm;

    // Validate all 8 mandatory fields
    if (
      !cetNo.trim() ||
      !capId.trim() ||
      !candidateName.trim() ||
      !dob.trim() ||
      !mobile.trim() ||
      !email.trim() ||
      !course.trim() ||
      !query.trim()
    ) {
      setTicketStatus({
        message: 'Please fill in all 8 mandatory fields to generate the ticket.',
        type: 'bad',
      });
      return;
    }

    // Format Ticket Number
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNo = `TC-FC1102-${dateStr}-${randomSuffix}`;
    setGeneratedTicketNo(ticketNo);

    // Format DOB for display
    let formattedDob = dob;
    try {
      if (dob.includes('-')) {
        const [yyyy, mm, dd] = dob.split('-');
        formattedDob = `${dd}/${mm}/${yyyy}`;
      }
    } catch {
      formattedDob = dob;
    }

    const currentFormattedDate = timestamp.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const outputText = `CET Application No: ${cetNo.trim().toUpperCase()}
CAP Application ID: ${capId.trim().toUpperCase()}
Candidate Name: ${candidateName.trim()}
DOB: ${formattedDob}
Mobile Number: ${mobile.trim()}
Email ID: ${email.trim()}
Course Name: ${course.trim()}
Query: ${query.trim()}`;

    setTicketOutput(outputText);
    setIsSavedToDb(true);

    // Save ticket to Database (Firestore + LocalStorage)
    const activeUser = currentUser || getCurrentUser();
    const newRecord: TicketRecord = {
      id: ticketNo,
      ticketNo,
      ticketType: 'candidate_ticket',
      candidateName: candidateName.trim(),
      cetNo: cetNo.trim().toUpperCase(),
      capId: capId.trim().toUpperCase(),
      dob: formattedDob,
      mobile: mobile.trim(),
      email: email.trim(),
      course: course.trim(),
      query: query.trim(),
      formattedText: outputText,
      status: 'Open',
      createdBy: activeUser?.username || 'counsellor',
      creatorName: activeUser?.fullName || activeUser?.username || 'Counsellor Officer',
      creatorRole: activeUser?.role || 'counsellor',
      createdAt: new Date().toISOString(),
    };

    saveTicketRecord(newRecord);

    setTicketStatus({
      message: `Ticket ${ticketNo} generated & saved to database successfully.`,
      type: 'ok',
    });
  };

  const copyTicket = async () => {
    if (!ticketOutput) return;
    try {
      await navigator.clipboard.writeText(ticketOutput);
      setTicketCopied(true);
      setTimeout(() => setTicketCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const clearTicket = () => {
    setTicketForm({
      cetNo: '',
      capId: '',
      candidateName: '',
      dob: '',
      mobile: '',
      email: '',
      course: 'B.E. / B.Tech (Engineering & Technology)',
      query: '',
    });
    setTicketOutput('');
    setGeneratedTicketNo('');
    setTicketStatus({
      message: 'Fill all 8 mandatory fields to generate an official candidate ticket note.',
      type: 'neutral',
    });
  };

  const handlePrintSlip = () => {
    if (!ticketOutput) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket - ${ticketForm.cetNo || 'Print'}</title>
            <style>
              body {
                font-family: monospace;
                font-size: 12px;
                line-height: 1.5;
                padding: 24px;
                color: #000;
                background: #fff;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <pre>${ticketOutput}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); }
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="ticket-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#001D3D]/70 backdrop-blur-xs overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="ticket-modal-container"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-6xl bg-[#F7F9FC] text-slate-900 rounded-2xl shadow-2xl border border-[#D9E1EA] overflow-hidden my-auto max-h-[94vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navy Header */}
            <div className="bg-[#003B73] text-white px-5 sm:px-8 py-4 border-b border-[#002850] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0056A6] flex items-center justify-center text-white shadow-xs border border-white/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-wide leading-tight">
                    Candidate Grievance / Query Ticket Desk
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  id="close-ticket-modal"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
              <div id="ticket-creation-view" className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
                {/* Left Column: 8 Input Fields Form Card */}
                <div className="space-y-5">
                  <div className="bg-white border border-[#D9E1EA] rounded-2xl shadow-xs overflow-hidden">
                    {/* Form Header with Quick Candidate Picker */}
                    <div className="px-5 py-3.5 bg-[#EAF4FB]/70 border-b border-[#D9E1EA] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0056A6]" />
                        <h2 className="text-xs sm:text-sm font-bold text-[#003B73] uppercase tracking-wide">
                          Candidate & Case Information
                        </h2>
                      </div>

                      {availableStudents.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-[#0056A6]" />
                          <select
                            onChange={(e) => {
                              if (e.target.value) handlePreFillCandidate(e.target.value);
                            }}
                            defaultValue=""
                            className="px-2.5 py-1 text-xs bg-white border border-[#0056A6]/30 text-[#003B73] font-medium rounded-lg outline-none cursor-pointer hover:border-[#0056A6]"
                          >
                            <option value="">⚡ Quick fill from registered candidate...</option>
                            {availableStudents.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.id} — {st.name} ({st.course})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 1. CET Application No */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="cetNo" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5 text-[#0056A6]" />
                            <span>CET Application No</span>
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="cetNo"
                            name="cetNo"
                            type="text"
                            required
                            value={ticketForm.cetNo}
                            onChange={handleTicketChange}
                            placeholder="e.g. CET20261084291"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal"
                          />
                        </div>

                        {/* 2. CAP Application ID */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="capId" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5 text-[#0056A6]" />
                            <span>CAP Application ID</span>
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="capId"
                            name="capId"
                            type="text"
                            required
                            value={ticketForm.capId}
                            onChange={handleTicketChange}
                            placeholder="e.g. EN26105432 / MB261984"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal"
                          />
                        </div>

                        {/* 3. Candidate Name */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label htmlFor="candidateName" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span>Candidate Name</span>
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="candidateName"
                            name="candidateName"
                            type="text"
                            required
                            value={ticketForm.candidateName}
                            onChange={handleTicketChange}
                            placeholder="Full Name as per official CET application form"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white text-slate-900 placeholder:text-slate-400"
                          />
                        </div>

                        {/* 4. DOB (Date of Birth) */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="dob" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#0056A6]" />
                            <span>DOB (Date of Birth)</span>
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="dob"
                            name="dob"
                            type="date"
                            required
                            value={ticketForm.dob}
                            onChange={handleTicketChange}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white text-slate-900"
                          />
                        </div>

                        {/* 5. Mobile Number */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="mobile" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-[#0056A6]" />
                            <span>Mobile Number</span>
                            <span className="text-rose-600">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                              +91
                            </span>
                            <input
                              id="mobile"
                              name="mobile"
                              type="tel"
                              maxLength={10}
                              required
                              value={ticketForm.mobile}
                              onChange={handleTicketChange}
                              placeholder="9822XXXXXX (10 digits)"
                              className="w-full pl-12 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white font-mono text-slate-900 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* 6. Email ID */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="email" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-[#0056A6]" />
                            <span>Email ID</span>
                            <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={ticketForm.email}
                            onChange={handleTicketChange}
                            placeholder="candidate@example.com"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white text-slate-900 placeholder:text-slate-400"
                          />
                        </div>

                        {/* 7. Course Name */}
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="course" className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-[#0056A6]" />
                            <span>Course Name</span>
                            <span className="text-rose-600">*</span>
                          </label>
                          <select
                            id="course"
                            name="course"
                            required
                            value={ticketForm.course}
                            onChange={handleTicketChange}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white text-slate-900"
                          >
                            {COMMON_COURSES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 8. Query */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label htmlFor="query" className="text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span>Query / Grievance Details</span>
                              <span className="text-rose-600">*</span>
                            </span>
                            <span className="text-[11px] font-normal text-slate-500">
                              Describe the query or discrepancy in detail
                            </span>
                          </label>
                          <textarea
                            id="query"
                            name="query"
                            required
                            rows={4}
                            value={ticketForm.query}
                            onChange={handleTicketChange}
                            placeholder="Describe the candidate query, missing document discrepancy, or portal issue in detail..."
                            className="w-full p-3.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white text-slate-900 placeholder:text-slate-400 leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      id="generate-ticket-btn"
                      onClick={generateTicket}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#0056A6] hover:bg-[#003B73] text-white shadow-sm transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Generate Ticket Note</span>
                    </button>

                    {ticketOutput && (
                      <>
                        <button
                          id="copy-ticket-btn"
                          onClick={copyTicket}
                          className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#198754] hover:bg-[#146c43] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          {ticketCopied ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <Copy className="w-4 h-4 text-white" />
                          )}
                          <span>{ticketCopied ? 'Copied!' : 'Copy Ticket'}</span>
                        </button>

                        <button
                          id="print-ticket-btn"
                          onClick={handlePrintSlip}
                          className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white hover:bg-slate-100 text-slate-800 border border-[#D9E1EA] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer className="w-4 h-4 text-[#0056A6]" />
                          <span>Print Slip</span>
                        </button>

                        {onOpenWhatsappWithData && (
                          <button
                            id="forward-to-whatsapp-btn"
                            type="button"
                            onClick={() => {
                              onOpenWhatsappWithData({
                                name: ticketForm.candidateName.trim(),
                                mobile: ticketForm.mobile.trim(),
                                email: ticketForm.email.trim(),
                                cetRegNo: ticketForm.cetNo.trim().toUpperCase(),
                                capAppNo: ticketForm.capId.trim().toUpperCase(),
                                courseName: ticketForm.course.trim(),
                                ticketNo: generatedTicketNo || undefined,
                                query: ticketForm.query.trim(),
                              });
                            }}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                            title="Reflect this created ticket data into WhatsApp notice"
                          >
                            <MessageCircle className="w-4 h-4 text-white" />
                            <span>Dispatch to WhatsApp</span>
                          </button>
                        )}
                      </>
                    )}

                    <button
                      id="clear-ticket-btn"
                      onClick={clearTicket}
                      className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Reset Form</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Generated Ticket Note Preview */}
                <aside className="lg:sticky lg:top-0 space-y-4">
                  <div className="bg-white border border-[#D9E1EA] rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
                    <div className="px-5 py-3.5 bg-[#003B73] text-white border-b border-[#002850] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                          Generated Ticket Note
                        </h2>
                      </div>
                      {ticketOutput && (
                        <button
                          onClick={copyTicket}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[#EAF4FB] border border-white/20 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {ticketCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                          <span>{ticketCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>

                    <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
                      <div
                        id="ticket-status-box"
                        className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                          ticketStatus.type === 'ok'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : ticketStatus.type === 'bad'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {ticketStatus.type === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {ticketStatus.type === 'bad' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        {ticketStatus.type === 'neutral' && <Info className="w-4 h-4 text-[#0056A6] shrink-0" />}
                        <span>{ticketStatus.message}</span>
                      </div>

                      <textarea
                        id="ticket-output-text"
                        readOnly
                        value={ticketOutput}
                        placeholder="Generated official ticket slip will appear here upon clicking Generate Ticket Note..."
                        className="w-full flex-1 min-h-[440px] p-4 bg-[#001D3D] text-emerald-400 font-mono text-xs sm:text-sm leading-relaxed rounded-xl border border-[#002850] outline-none resize-none selection:bg-[#0056A6] selection:text-white"
                      />
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
