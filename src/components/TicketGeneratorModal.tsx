import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Trash2,
  FileText,
  Ticket,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
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
  RotateCcw,
  Loader2,
  Binary,
  Tag,
} from 'lucide-react';
import { getStudentRecords, getCurrentUser } from '../services/authService';
import { saveTicketRecord } from '../services/ticketService';
import { UserProfile, TicketRecord, TicketStatus } from '../types/auth';
import { WhatsappInitialData } from './WhatsappTicketModal';
import { DEPARTMENT_COURSES, DEFAULT_COURSE } from '../data/courses';
import { FormValidationErrorModal } from './FormValidationErrorModal';
import { APP_ASSETS } from '../constants/assets';
import { cleanCandidateName } from '../utils/ticketExtractor';
import {
  detectFirstPersonLanguage,
  convertQueryToThirdPersonFallback,
  rewriteCandidateQuery,
} from '../utils/queryRewriter';
import { deriveTicketSubject } from '../utils/ticketSubjectGenerator';
import { getMasterApiKey } from '../services/apiConfigService';

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

export interface InitialCandidateData {
  id?: string;
  name?: string;
  candidateName?: string;
  candidate_name?: string;
  candidate?: string;
  studentName?: string;
  student_name?: string;
  applicantName?: string;
  applicant_name?: string;
  fullName?: string;
  full_name?: string;
  candidatename?: string;
  CandidateName?: string;
  Candidate_Name?: string;
  mobile?: string;
  phone?: string;
  mobileNumber?: string;
  email?: string;
  emailId?: string;
  course?: string;
  courseName?: string;
  cetNo?: string;
  capId?: string;
  cetApplicationNumber?: string;
  capApplicationNumber?: string;
  cetAppNo?: string;
  capAppNo?: string;
  cetApplicationNo?: string;
  capApplicationNo?: string;
  cetRegNo?: string;
  applicationNumber?: string;
  appNo?: string;
  capIdNumber?: string;
  dob?: string;
  birthDate?: string;
  dateOfBirth?: string;
  query?: string;
  grievance?: string;
  _t?: number;
  [key: string]: any;
}

interface TicketGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCandidate?: InitialCandidateData | null;
  currentUser?: UserProfile | null;
  onOpenWhatsappWithData?: (data: WhatsappInitialData) => void;
  onSyncWhatsappData?: (data: WhatsappInitialData) => void;
}

export const TicketGeneratorModal: React.FC<TicketGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialCandidate,
  currentUser,
  onOpenWhatsappWithData,
  onSyncWhatsappData,
}) => {
  // 8 Mandatory Ticket Fields
  const [ticketForm, setTicketForm] = useState<TicketState>({
    cetNo: '',
    capId: '',
    candidateName: '',
    dob: '',
    mobile: '',
    email: '',
    course: DEFAULT_COURSE,
    query: '',
  });

  const [ticketOutput, setTicketOutput] = useState<string>('');
  const [ticketStatus, setTicketStatus] = useState<{ message: string; type: 'ok' | 'bad' | 'neutral' }>({
    message: 'Fill all 8 mandatory fields to generate an official candidate ticket note.',
    type: 'neutral',
  });
  const [ticketCopied, setTicketCopied] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generatedTicketNo, setGeneratedTicketNo] = useState<string>('');
  const [editingTicketInfo, setEditingTicketInfo] = useState<{
    id: string;
    ticketNo: string;
    status?: TicketStatus;
    createdAt?: string;
    createdBy?: string;
    creatorName?: string;
    creatorRole?: string;
    district?: string;
  } | null>(null);
  const [isSavedToDb, setIsSavedToDb] = useState<boolean>(false);

  // Ticket Subject State (Auto-derived from query nature, provided separately per requirement)
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [isSubjectManual, setIsSubjectManual] = useState<boolean>(false);
  const [subjectCopied, setSubjectCopied] = useState<boolean>(false);

  // Automatically derive subject from query nature whenever query or course changes (unless user manually customized it)
  useEffect(() => {
    if (!isSubjectManual) {
      const derived = deriveTicketSubject(ticketForm.query, ticketForm.course);
      setTicketSubject(derived);
    }
  }, [ticketForm.query, ticketForm.course, isSubjectManual]);

  const handleCopySubject = async () => {
    const textToCopy = (ticketSubject || deriveTicketSubject(ticketForm.query, ticketForm.course)).trim();
    if (!textToCopy) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setSubjectCopied(true);
      setTimeout(() => setSubjectCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy ticket subject:', err);
    }
  };

  const handleResetSubjectToAuto = () => {
    setIsSubjectManual(false);
    const derived = deriveTicketSubject(ticketForm.query, ticketForm.course);
    setTicketSubject(derived);
  };

  // Query 3rd-person rewrite states & Binary text animation
  const [isRewritingQuery, setIsRewritingQuery] = useState<boolean>(false);
  const [originalQueryHistory, setOriginalQueryHistory] = useState<string | null>(null);
  const [binaryStreamText, setBinaryStreamText] = useState<string>('');
  const binaryAnimationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (binaryAnimationTimerRef.current) {
        clearInterval(binaryAnimationTimerRef.current);
      }
    };
  }, []);

  const generateBinaryChunk = (len = 160) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      if (i > 0 && i % 8 === 0) result += ' ';
      result += Math.random() > 0.5 ? '1' : '0';
    }
    return result;
  };

  const handleRewriteQuery = async () => {
    const currentQuery = ticketForm.query.trim();
    if (!currentQuery || isRewritingQuery) return;

    setIsRewritingQuery(true);
    setBinaryStreamText(generateBinaryChunk());

    // Start rapid binary stream animation
    if (binaryAnimationTimerRef.current) {
      clearInterval(binaryAnimationTimerRef.current);
    }
    binaryAnimationTimerRef.current = setInterval(() => {
      setBinaryStreamText(generateBinaryChunk());
    }, 45);

    try {
      const masterKey = await getMasterApiKey();
      const res = await rewriteCandidateQuery(currentQuery, masterKey);
      const converted = (res?.convertedQuery && res.convertedQuery.trim()) || convertQueryToThirdPersonFallback(currentQuery);

      if (converted) {
        // Binary matrix decode reveal animation
        const steps = 6;
        let step = 0;
        const decodeInterval = setInterval(() => {
          step++;
          const progress = step / steps;
          const revealedLen = Math.floor(converted.length * progress);
          const revealedStr = converted.slice(0, revealedLen);
          const remainderCount = Math.min(24, Math.max(0, converted.length - revealedLen));
          let remainderBinary = '';
          for (let i = 0; i < remainderCount; i++) {
            remainderBinary += Math.random() > 0.5 ? '1' : '0';
          }
          setBinaryStreamText(revealedStr + (remainderBinary ? ' ' + remainderBinary : ''));

          if (step >= steps) {
            clearInterval(decodeInterval);
            if (binaryAnimationTimerRef.current) {
              clearInterval(binaryAnimationTimerRef.current);
              binaryAnimationTimerRef.current = null;
            }
            setOriginalQueryHistory(currentQuery);
            setTicketForm((prev) => ({
              ...prev,
              query: converted,
            }));
            setIsRewritingQuery(false);
          }
        }, 50);
      } else {
        if (binaryAnimationTimerRef.current) {
          clearInterval(binaryAnimationTimerRef.current);
          binaryAnimationTimerRef.current = null;
        }
        setIsRewritingQuery(false);
      }
    } catch (err: any) {
      console.warn('Error rewriting query:', err);
      const fallback = convertQueryToThirdPersonFallback(currentQuery);
      if (fallback) {
        setOriginalQueryHistory(currentQuery);
        setTicketForm((prev) => ({
          ...prev,
          query: fallback,
        }));
      }
      if (binaryAnimationTimerRef.current) {
        clearInterval(binaryAnimationTimerRef.current);
        binaryAnimationTimerRef.current = null;
      }
      setIsRewritingQuery(false);
    }
  };

  const handleUndoQueryRewrite = () => {
    if (originalQueryHistory !== null) {
      setTicketForm((prev) => ({
        ...prev,
        query: originalQueryHistory,
      }));
      setOriginalQueryHistory(null);
    }
  };

  const handleCopyField = async (fieldKey: string, value: string) => {
    try {
      const textToCopy = value !== undefined && value !== null ? String(value).trim() : '';
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(fieldKey);
      setTimeout(() => {
        setCopiedField((curr) => (curr === fieldKey ? null : curr));
      }, 1500);
    } catch (err) {
      console.error('Failed to copy field value:', err);
    }
  };

  const renderFieldCopyBtn = (fieldKey: string, value: string, fieldLabel: string) => {
    const isCopied = copiedField === fieldKey;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCopyField(fieldKey, value);
        }}
        title={`Copy ${fieldLabel}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer active:scale-95 select-none ${
          isCopied
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400/20'
            : 'bg-white hover:bg-[#EAF4FB] text-slate-600 hover:text-[#0056A6] border-slate-200 hover:border-[#0056A6]/40 shadow-2xs'
        }`}
      >
        {isCopied ? (
          <>
            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="text-[10px] text-emerald-700">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[10px]">Copy</span>
          </>
        )}
      </button>
    );
  };

  // Validation Popup Modal State
  const [validationPopup, setValidationPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    missingFields?: string[];
  } | null>(null);

  // Quick Pick candidates from state
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const studs = getStudentRecords();
      setAvailableStudents(studs);

      if (initialCandidate) {
        const rawCetNo =
          initialCandidate.cetNo ||
          initialCandidate.cetApplicationNumber ||
          initialCandidate.cetAppNo ||
          initialCandidate.cetApplicationNo ||
          initialCandidate.cetRegNo ||
          initialCandidate.applicationNumber ||
          initialCandidate.appNo ||
          '';

        const rawCapId =
          initialCandidate.capId ||
          initialCandidate.capNo ||
          initialCandidate.capApplicationNumber ||
          initialCandidate.capAppNo ||
          initialCandidate.capApplicationNo ||
          initialCandidate.capIdNumber ||
          '';

        const isCapPrefix = (val: string) =>
          /^(?:EN|MB|MC|PH|AR|HM|DS|DSE|DSP|TE|CO|PL|BS|AG|LA|ED|MP|NU)\d{6,10}$/i.test(val.trim());

        let finalCapId = rawCapId;
        let finalCetNo = rawCetNo;

        if (!finalCapId && isCapPrefix(finalCetNo)) {
          finalCapId = finalCetNo;
        }

        // In SAC Ticket Generator, CET Application Number is required (*).
        // If finalCetNo is empty but finalCapId is present, ensure CET Application Number is populated with the ID
        if (!finalCetNo && finalCapId) {
          finalCetNo = finalCapId;
        }

        // Robust Candidate Name resolution from all possible aliases
        const rawCandidateName =
          initialCandidate.candidateName ||
          initialCandidate['Candidate Name'] ||
          initialCandidate['Candidate name'] ||
          initialCandidate['candidate name'] ||
          initialCandidate.name ||
          initialCandidate.Name ||
          initialCandidate.candidate_name ||
          initialCandidate.candidate ||
          initialCandidate.Candidate ||
          initialCandidate.studentName ||
          initialCandidate['Student Name'] ||
          initialCandidate.student_name ||
          initialCandidate.applicantName ||
          initialCandidate['Applicant Name'] ||
          initialCandidate.applicant_name ||
          initialCandidate.fullName ||
          initialCandidate['Full Name'] ||
          initialCandidate.FullName ||
          initialCandidate.full_name ||
          initialCandidate.candidatename ||
          initialCandidate.CandidateName ||
          initialCandidate.Candidate_Name ||
          initialCandidate['उमेदवाराचे नाव'] ||
          initialCandidate['नाव'] ||
          '';

        const cleanedCandidateName = cleanCandidateName(String(rawCandidateName));
        const finalCandidateName = (cleanedCandidateName || String(rawCandidateName)).trim();

        // Robust Course resolution
        const rawCourse =
          initialCandidate.course ||
          initialCandidate.courseName ||
          DEFAULT_COURSE;

        // Robust Mobile resolution
        const rawMobile =
          initialCandidate.mobile ||
          initialCandidate.phone ||
          initialCandidate.mobileNumber ||
          '';

        // Robust Email resolution
        const rawEmail =
          initialCandidate.email ||
          initialCandidate.emailId ||
          '';

        // Robust DOB resolution
        let rawDob =
          initialCandidate.dob ||
          initialCandidate.birthDate ||
          initialCandidate.dateOfBirth ||
          '';

        // If DOB is in DD/MM/YYYY format, convert to YYYY-MM-DD for date input compatibility
        if (rawDob && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDob.trim())) {
          const [d, m, y] = rawDob.trim().split('/');
          rawDob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        // Robust Query resolution
        const rawQuery =
          initialCandidate.queryGrievanceDetails ||
          initialCandidate.query ||
          initialCandidate.grievance ||
          '';

        const isEditingTicket = Boolean(initialCandidate.editingTicketId || initialCandidate.ticketNo);
        if (isEditingTicket) {
          setEditingTicketInfo({
            id: initialCandidate.editingTicketId || initialCandidate.id || initialCandidate.ticketNo,
            ticketNo: initialCandidate.ticketNo,
            status: initialCandidate.status,
            createdAt: initialCandidate.createdAt,
            createdBy: initialCandidate.createdBy,
            creatorName: initialCandidate.creatorName,
            creatorRole: initialCandidate.creatorRole,
            district: initialCandidate.district,
          });
          setGeneratedTicketNo(initialCandidate.ticketNo);
        } else {
          setEditingTicketInfo(null);
        }

        let initialFinalQuery = rawQuery;
        if (rawQuery && !isEditingTicket && detectFirstPersonLanguage(rawQuery)) {
          initialFinalQuery = convertQueryToThirdPersonFallback(rawQuery);
          setOriginalQueryHistory(rawQuery);
        }

        setTicketForm({
          cetNo: finalCetNo.toUpperCase().trim(),
          capId: finalCapId.toUpperCase().trim(),
          candidateName: finalCandidateName,
          dob: rawDob,
          mobile: rawMobile,
          email: rawEmail,
          course: rawCourse || DEFAULT_COURSE,
          query: initialFinalQuery,
        });

        if (initialCandidate.subject && initialCandidate.subject.trim()) {
          setTicketSubject(initialCandidate.subject.trim());
          setIsSubjectManual(true);
        } else {
          setIsSubjectManual(false);
          setTicketSubject(deriveTicketSubject(initialFinalQuery, rawCourse || DEFAULT_COURSE));
        }

        if (isEditingTicket) {
          setTicketStatus({
            message: `Loaded ticket ${initialCandidate.ticketNo} for editing. Modify any of the 8 fields and click 'Update Ticket Note'.`,
            type: 'ok',
          });
        } else if (
          finalCandidateName ||
          finalCetNo ||
          finalCapId ||
          rawMobile ||
          rawQuery ||
          rawDob ||
          rawEmail
        ) {
          setTicketStatus({
            message:
              'All 8 fields successfully transferred to respective fields: Candidate Name, CET Application Number, CAP Application Number, DOB, Mobile Number, Email ID, Course Name, and Query.',
            type: 'ok',
          });
        }
      } else {
        setEditingTicketInfo(null);
        setIsSubjectManual(false);
        setTicketSubject(deriveTicketSubject('', DEFAULT_COURSE));
      }
    }
  }, [isOpen, initialCandidate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (validationPopup?.isOpen) {
          setValidationPopup(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, validationPopup]);

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

    // 1. Check for empty fields (The 7 mandatory ticket details)
    const missing: string[] = [];
    if (!candidateName.trim()) missing.push('Candidate Name');
    if (!mobile.trim()) missing.push('Mobile Number');
    if (!email.trim()) missing.push('Email Address');
    if (!dob.trim()) missing.push('DOB (Date of Birth)');
    if (!cetNo.trim()) missing.push('CET Application Number');
    if (!course.trim()) missing.push('Course Name');
    if (!query.trim()) missing.push('Query');

    if (missing.length > 0) {
      setValidationPopup({
        isOpen: true,
        title: 'Mandatory Fields Missing',
        message: 'Please fill in the following required candidate details before generating the ticket note:',
        missingFields: missing,
      });
      setTicketStatus({
        message: `Validation Error: Please fill all required fields (${missing.length} missing).`,
        type: 'bad',
      });
      return;
    }

    // 2. Validate Mobile Number (Strict 10 digits)
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setValidationPopup({
        isOpen: true,
        title: 'Invalid Mobile Number',
        message:
          'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9822123456). Current entry has ' +
          cleanMobile.length +
          ' digits.',
      });
      setTicketStatus({
        message: 'Validation Error: Mobile number must be a valid 10-digit number.',
        type: 'bad',
      });
      return;
    }

    // 3. Validate Email ID
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationPopup({
        isOpen: true,
        title: 'Invalid Email Address',
        message: 'Please enter a valid email address with proper format (e.g. student@gmail.com).',
      });
      setTicketStatus({
        message: 'Validation Error: Invalid email address format.',
        type: 'bad',
      });
      return;
    }

    // Format Ticket Number
    let ticketNo = editingTicketInfo?.ticketNo;
    let recordId = editingTicketInfo?.id;
    if (!ticketNo) {
      const timestamp = new Date();
      const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      ticketNo = `TC-FC1102-${dateStr}-${randomSuffix}`;
      recordId = ticketNo;
    }
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

    const finalSubject = (ticketSubject.trim() || deriveTicketSubject(query, course)).trim();

    // STRICT USER REQUIREMENT:
    // "in sac ticket generator give subject automatically from the nature of query. dont give subject in generated ticket note. give it seperate"
    // Output text strictly contains candidate details and query ONLY. No subject line.
    const outputText = `Candidate Name: ${candidateName.trim()}
Mobile Number: ${cleanMobile}
Email Address: ${email.trim()}
DOB (Date of Birth): ${formattedDob}
CET Application Number: ${cetNo.trim().toUpperCase()}
${capId.trim() ? `CAP Application ID: ${capId.trim().toUpperCase()}\n` : ''}Course Name: ${course.trim()}
Query: ${query.trim()}`;

    setTicketOutput(outputText);
    setIsSavedToDb(true);

    // Save ticket to Database (Firestore + LocalStorage)
    const activeUser = currentUser || getCurrentUser();
    const newRecord: TicketRecord = {
      id: recordId || ticketNo,
      ticketNo,
      ticketType: 'candidate_ticket',
      subject: finalSubject,
      candidateName: candidateName.trim(),
      cetNo: cetNo.trim().toUpperCase(),
      capId: capId.trim().toUpperCase(),
      dob: formattedDob,
      mobile: cleanMobile,
      email: email.trim(),
      course: course.trim(),
      query: query.trim(),
      formattedText: outputText,
      status: editingTicketInfo?.status || 'Open',
      createdBy: editingTicketInfo?.createdBy || activeUser?.username || 'counsellor',
      creatorName: editingTicketInfo?.creatorName || activeUser?.fullName || activeUser?.username || 'Counsellor Officer',
      creatorRole: editingTicketInfo?.creatorRole || activeUser?.role || 'counsellor',
      district: editingTicketInfo?.district || activeUser?.district || 'Washim',
      createdAt: editingTicketInfo?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveTicketRecord(newRecord);

    // Automatically send data to WhatsApp tool without popping up the modal
    // Note: Ticket ID is left blank per user requirement ("dont ad prefill ticket no it will be ad by user")
    onSyncWhatsappData?.({
      name: candidateName.trim(),
      mobile: cleanMobile,
      email: email.trim(),
      cetRegNo: cetNo.trim().toUpperCase(),
      capAppNo: capId.trim().toUpperCase(),
      courseName: course.trim(),
      ticketNo: '',
      query: query.trim(),
    });

    setTicketStatus({
      message: editingTicketInfo
        ? `Ticket ${ticketNo} updated & saved to database successfully.`
        : `Ticket ${ticketNo} generated & saved to database successfully.`,
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
      course: DEFAULT_COURSE,
      query: '',
    });
    setOriginalQueryHistory(null);
    setTicketOutput('');
    setGeneratedTicketNo('');
    setEditingTicketInfo(null);
    setIsSubjectManual(false);
    setTicketSubject(deriveTicketSubject('', DEFAULT_COURSE));
    setSubjectCopied(false);
    setTicketStatus({
      message: 'Fill all 8 mandatory fields to generate an official candidate ticket note.',
      type: 'neutral',
    });
  };

  const handlePrintSlip = () => {
    if (!ticketOutput) return;
    const finalSubject = (ticketSubject.trim() || deriveTicketSubject(ticketForm.query, ticketForm.course)).trim();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket - ${ticketForm.cetNo || 'Print'}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 13px;
                line-height: 1.6;
                padding: 24px;
                color: #0f172a;
                background: #fff;
              }
              .subject-box {
                margin-bottom: 16px;
                padding: 12px 14px;
                background: #f0f7ff;
                border-radius: 8px;
                border: 1px solid #bae0fd;
                color: #003b73;
              }
              .subject-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: bold;
                color: #0056a6;
                margin-bottom: 3px;
              }
              .subject-text {
                font-size: 14px;
                font-weight: 700;
              }
              .note-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: bold;
                color: #64748b;
                margin-bottom: 6px;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: Consolas, monospace;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 14px;
                border-radius: 8px;
                font-size: 12px;
                color: #1e293b;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="subject-box">
              <div class="subject-label">Official SAC Ticket Subject (Separate Field)</div>
              <div class="subject-text">${finalSubject}</div>
            </div>
            <div class="note-label">Candidate Ticket Note (Description)</div>
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

  const handleSendToWhatsapp = () => {
    if (onOpenWhatsappWithData) {
      onOpenWhatsappWithData({
        name: ticketForm.candidateName.trim(),
        mobile: ticketForm.mobile.trim(),
        email: ticketForm.email.trim(),
        cetRegNo: ticketForm.cetNo.trim().toUpperCase(),
        capAppNo: ticketForm.capId.trim().toUpperCase(),
        courseName: ticketForm.course.trim(),
        ticketNo: '', // Don't prefill ticket no: must be added by user
        query: ticketForm.query.trim(),
      });
    }
    // Close ticket generator automatically when sending to WhatsApp
    onClose();
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
                <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md border border-white/40 overflow-hidden">
                  <img src={APP_ASSETS.SAC_TICKET_GENERATOR} alt="SAC Ticket" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-wide leading-tight flex items-center gap-2">
                    <span>SAC Ticket Generator</span>
                    {editingTicketInfo && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 border border-amber-300">
                        Editing: {editingTicketInfo.ticketNo}
                      </span>
                    )}
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
                        {/* 1. CET Application Number */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor="cetNo" className="text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer">
                              <Hash className="w-3.5 h-3.5 text-[#0056A6]" />
                              <span>CET Application Number</span>
                              <span className="text-rose-600">*</span>
                            </label>
                            {renderFieldCopyBtn('cetNo', ticketForm.cetNo, 'CET Application Number')}
                          </div>
                          <input
                            id="cetNo"
                            name="cetNo"
                            type="text"
                            required
                            value={ticketForm.cetNo}
                            onChange={handleTicketChange}
                            placeholder="e.g. CET20261084291 / 24108892"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal"
                          />
                        </div>

                        {/* 2. CAP Application Number (Optional) */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor="capId" className="text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer">
                              <Hash className="w-3.5 h-3.5 text-[#0056A6]" />
                              <span>CAP Application Number</span>
                              <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
                            </label>
                            {renderFieldCopyBtn('capId', ticketForm.capId, 'CAP Application Number')}
                          </div>
                          <input
                            id="capId"
                            name="capId"
                            type="text"
                            value={ticketForm.capId}
                            onChange={handleTicketChange}
                            placeholder="Optional: e.g. EN26105432"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal"
                          />
                        </div>

                        {/* 3. Candidate Name */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <label htmlFor="candidateName" className="text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer">
                              <span>Candidate Name</span>
                              <span className="text-rose-600">*</span>
                            </label>
                            {renderFieldCopyBtn('candidateName', ticketForm.candidateName, 'Candidate Name')}
                          </div>
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
                          <div className="flex items-center justify-between">
                            <label htmlFor="dob" className="text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer">
                              <Calendar className="w-3.5 h-3.5 text-[#0056A6]" />
                              <span>DOB (Date of Birth)</span>
                              <span className="text-rose-600">*</span>
                            </label>
                            {renderFieldCopyBtn('dob', ticketForm.dob, 'Date of Birth')}
                          </div>
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
                          <div className="flex items-center justify-between">
                            <label htmlFor="mobile" className="text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer">
                              <Phone className="w-3.5 h-3.5 text-[#0056A6]" />
                              <span>Mobile Number (10 digits)</span>
                              <span className="text-rose-600">*</span>
                            </label>
                            {renderFieldCopyBtn('mobile', ticketForm.mobile, 'Mobile Number')}
                          </div>
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
                              placeholder="9822XXXXXX"
                              className="w-full pl-12 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white font-mono text-slate-900 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* 6. Email ID */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor="email" className="text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer">
                              <Mail className="w-3.5 h-3.5 text-[#0056A6]" />
                              <span>Email ID</span>
                              <span className="text-rose-600">*</span>
                            </label>
                            {renderFieldCopyBtn('email', ticketForm.email, 'Email ID')}
                          </div>
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

                        {/* 7. Course Name - Organized Department-wise */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor="course" className="text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer">
                              <GraduationCap className="w-3.5 h-3.5 text-[#0056A6]" />
                              <span>Course Name (Department-wise)</span>
                              <span className="text-rose-600">*</span>
                            </label>
                            {renderFieldCopyBtn('course', ticketForm.course, 'Course Name')}
                          </div>
                          <select
                            id="course"
                            name="course"
                            required
                            value={ticketForm.course}
                            onChange={handleTicketChange}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white text-slate-900"
                          >
                            {DEPARTMENT_COURSES.map((group, idx) => (
                              <optgroup
                                key={idx}
                                label={`${group.department}${group.subCategory ? ` — ${group.subCategory}` : ''}`}
                              >
                                {group.courses.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        {/* Separate Ticket Subject (Auto-derived from query nature) */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2 bg-[#F0F7FF] p-3.5 rounded-xl border border-[#BAE0FD]/90 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <label htmlFor="ticket-subject" className="text-xs font-bold text-[#003B73] flex items-center gap-1.5 cursor-pointer">
                              <Tag className="w-3.5 h-3.5 text-[#0056A6]" />
                              <span>Ticket Subject</span>
                              <span className="text-[11px] font-normal text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300/70 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Auto from Nature of Query
                              </span>
                            </label>

                            <div className="flex items-center gap-2">
                              {isSubjectManual && (
                                <button
                                  type="button"
                                  onClick={handleResetSubjectToAuto}
                                  title="Re-detect subject automatically from query keywords"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border border-[#BAE0FD] bg-white hover:bg-slate-50 text-[#0056A6] transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <RotateCcw className="w-3 h-3 text-[#0056A6]" />
                                  <span>Auto-derive</span>
                                </button>
                              )}
                              <button
                                type="button"
                                id="copy-subject-field-btn"
                                onClick={handleCopySubject}
                                title="Copy Subject to paste into SAC Portal Subject field"
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer active:scale-95 select-none ${
                                  subjectCopied
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400/20'
                                    : 'bg-white hover:bg-[#EAF4FB] text-[#0056A6] border-[#0056A6]/30 shadow-2xs'
                                }`}
                              >
                                {subjectCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="text-[10px] text-emerald-700">Subject Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-[#0056A6] shrink-0" />
                                    <span className="text-[10px]">Copy Subject</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="relative">
                            <input
                              id="ticket-subject"
                              type="text"
                              value={ticketSubject}
                              onChange={(e) => {
                                setTicketSubject(e.target.value);
                                setIsSubjectManual(true);
                              }}
                              placeholder="Automatic Subject derived from candidate query..."
                              className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold border border-[#BAE0FD] rounded-lg focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/15 outline-none bg-white text-[#003B73] placeholder:text-slate-400 shadow-2xs"
                            />
                          </div>
                          <p className="text-[11px] text-[#0056A6]/80 flex items-center gap-1">
                            <Info className="w-3 h-3 text-[#0056A6] shrink-0" />
                            <span>In the SAC portal, paste this Subject in the <strong>'Subject'</strong> field. The generated ticket note goes separately into the <strong>'Description'</strong> area.</span>
                          </p>
                        </div>

                        {/* 8. Query Input Box with Binary Conversion Animation */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <div className="flex items-center justify-between gap-2">
                            <label htmlFor="query" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                              <span>Query / Grievance Details</span>
                              <span className="text-rose-600">*</span>
                            </label>

                            <div className="flex items-center gap-2 ml-auto">
                              {originalQueryHistory !== null && !isRewritingQuery && (
                                <button
                                  type="button"
                                  onClick={handleUndoQueryRewrite}
                                  title="Revert back to original wording"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Undo</span>
                                </button>
                              )}

                              <button
                                type="button"
                                id="convert-query-btn"
                                onClick={handleRewriteQuery}
                                disabled={isRewritingQuery || !ticketForm.query.trim()}
                                title="Convert candidate query into counsellor/agent statement"
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer active:scale-95 select-none ${
                                  isRewritingQuery
                                    ? 'bg-slate-950 text-emerald-400 border-emerald-500/60 shadow-xs cursor-wait font-mono'
                                    : !ticketForm.query.trim()
                                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                    : 'bg-[#0056A6] hover:bg-[#003B73] text-white border-[#0056A6] shadow-xs'
                                }`}
                              >
                                <Binary className={`w-3.5 h-3.5 shrink-0 ${isRewritingQuery ? 'animate-spin text-emerald-400' : 'text-current'}`} />
                                <span>{isRewritingQuery ? 'Converting...' : 'Convert'}</span>
                              </button>

                              {renderFieldCopyBtn('query', ticketForm.query, 'Query / Grievance Details')}
                            </div>
                          </div>

                          <div className="relative w-full">
                            <textarea
                              id="query"
                              name="query"
                              required
                              rows={4}
                              value={ticketForm.query}
                              onChange={handleTicketChange}
                              placeholder="State the candidate issue in third person (e.g., 'The candidate has entered the wrong mobile number by mistake.')..."
                              className="w-full p-3.5 text-xs sm:text-sm border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-3 focus:ring-[#0056A6]/15 outline-none bg-white text-slate-900 placeholder:text-slate-400 leading-relaxed font-sans"
                            />

                            {/* Binary Text Animation Overlay */}
                            {isRewritingQuery && (
                              <div className="absolute inset-0 z-10 bg-slate-950/92 rounded-xl p-3.5 flex flex-col justify-between overflow-hidden border border-emerald-500/50 shadow-inner font-mono select-none animate-in fade-in duration-150 text-emerald-400">
                                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5 text-[11px] font-bold">
                                  <span className="flex items-center gap-1.5 tracking-wider uppercase">
                                    <Binary className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                    <span>CONVERTING QUERY (BINARY STREAM)</span>
                                  </span>
                                  <span className="text-[10px] text-emerald-400/80 font-mono tracking-widest animate-pulse">
                                    [01010101]
                                  </span>
                                </div>
                                <div className="my-auto py-2 text-xs font-mono text-emerald-400 tracking-wider break-all leading-relaxed opacity-95 line-clamp-3 select-none">
                                  {binaryStreamText}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-emerald-400/70 border-t border-emerald-500/25 pt-1">
                                  <span>Translating to professional agent language</span>
                                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                </div>
                              </div>
                            )}
                          </div>
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
                      <span>{editingTicketInfo ? 'Update Ticket Note' : 'Generate Ticket Note'}</span>
                    </button>

                    {onOpenWhatsappWithData && (
                      <button
                        id="forward-to-whatsapp-btn"
                        type="button"
                        onClick={handleSendToWhatsapp}
                        className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Send candidate details to WhatsApp notice and close Ticket Generator"
                      >
                        <MessageCircle className="w-4 h-4 text-white" />
                        <span>Send to WhatsApp</span>
                      </button>
                    )}

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

                {/* Right Column: Generated Ticket Note Preview & Separate Subject */}
                <aside className="lg:sticky lg:top-0 space-y-3.5">
                  {/* SEPARATE SAC PORTAL TICKET SUBJECT CARD */}
                  <div className="bg-white border border-[#BAE0FD] rounded-2xl shadow-xs overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-[#003B73] text-white border-b border-[#002850] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                          SAC Portal Subject (Separate Field)
                        </span>
                      </div>
                      <button
                        type="button"
                        id="preview-copy-subject-btn"
                        onClick={handleCopySubject}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                          subjectCopied
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-white/15 hover:bg-white/25 text-white border-white/20 shadow-2xs'
                        }`}
                        title="Copy Subject to paste into SAC Portal Subject field"
                      >
                        {subjectCopied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-amber-300" />}
                        <span>{subjectCopied ? 'Subject Copied!' : 'Copy Subject'}</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-gradient-to-br from-[#F0F7FF] to-blue-50/40">
                      <p className="text-xs sm:text-sm font-bold text-[#003B73] leading-snug">
                        {ticketSubject || deriveTicketSubject(ticketForm.query, ticketForm.course)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[#BAE0FD]/60 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Auto-derived from Query Nature
                        </span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-[#0056A6] font-medium">Paste in SAC 'Subject' input</span>
                      </div>
                    </div>
                  </div>

                  {/* GENERATED TICKET NOTE PREVIEW (NOTE ONLY, NO SUBJECT) */}
                  <div className="bg-white border border-[#D9E1EA] rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
                    <div className="px-5 py-3.5 bg-[#003B73] text-white border-b border-[#002850] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                          Generated Ticket Note
                        </h2>
                      </div>
                      {ticketOutput && (
                        <div className="flex items-center gap-1.5">
                          {onOpenWhatsappWithData && (
                            <button
                              id="header-send-to-whatsapp-btn"
                              type="button"
                              onClick={handleSendToWhatsapp}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Send to WhatsApp and close Ticket Generator"
                            >
                              <MessageCircle className="w-3 h-3 text-white" />
                              <span>Send to WhatsApp</span>
                            </button>
                          )}
                          <button
                            onClick={copyTicket}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[#EAF4FB] border border-white/20 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {ticketCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                            <span>{ticketCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
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

          {/* Validation Alert Popup Modal */}
          <FormValidationErrorModal
            isOpen={!!validationPopup?.isOpen}
            onClose={() => setValidationPopup(null)}
            title={validationPopup?.title || 'Required Fields Missing'}
            description={validationPopup?.message || 'Please fill in all mandatory fields before proceeding.'}
            missingFields={validationPopup?.missingFields}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
