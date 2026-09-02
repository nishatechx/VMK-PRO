import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Send,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  FileCheck,
} from 'lucide-react';
import { UserProfile, TicketRecord } from '../types/auth';
import { getCurrentUser } from '../services/authService';
import { saveTicketRecord } from '../services/ticketService';

export interface WhatsappInitialData {
  name?: string;
  mobile?: string;
  email?: string;
  cetRegNo?: string;
  capAppNo?: string;
  courseName?: string;
  ticketNo?: string;
  query?: string;
}

interface WhatsappFormData {
  name: string;
  mobile: string;
  email: string;
  cetRegNo: string;
  capAppNo: string;
  courseName: string;
  ticketNo: string;
  query: string;
}

interface WhatsappTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  initialTicketData?: WhatsappInitialData | null;
}

export const WhatsappTicketModal: React.FC<WhatsappTicketModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTicketData,
}) => {
  const [form, setForm] = useState<WhatsappFormData>({
    name: '',
    mobile: '',
    email: '',
    cetRegNo: '',
    capAppNo: '',
    courseName: '',
    ticketNo: '',
    query: '',
  });

  const [output, setOutput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({
    text: '',
    type: '',
  });

  // Populate data when modal opens or initialTicketData changes
  useEffect(() => {
    if (isOpen) {
      if (initialTicketData) {
        setForm({
          name: initialTicketData.name || '',
          mobile: initialTicketData.mobile || '',
          email: initialTicketData.email || '',
          cetRegNo: initialTicketData.cetRegNo || '',
          capAppNo: initialTicketData.capAppNo || '',
          courseName: initialTicketData.courseName || '',
          ticketNo: initialTicketData.ticketNo || '',
          query: initialTicketData.query || '',
        });
      } else if (!form.ticketNo) {
        // Auto-generate ticket id if brand new
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const newTicket = `WA-CAP-${new Date().getFullYear()}-${randomNum}`;
        setForm((prev) => ({ ...prev, ticketNo: newTicket }));
      }
    }
  }, [isOpen, initialTicketData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-generate ticket number
  const generateTicketNumber = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newTicket = `WA-CAP-${new Date().getFullYear()}-${randomNum}`;
    setForm((prev) => ({ ...prev, ticketNo: newTicket }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.mobile.trim()) newErrors.mobile = true;
    if (!form.courseName.trim()) newErrors.courseName = true;
    if (!form.query.trim()) newErrors.query = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setStatusMessage({
        text: 'Please fill in the required fields highlighted in red.',
        type: 'error',
      });
      return;
    }

    const assignedTicket = form.ticketNo.trim()
      ? form.ticketNo.trim()
      : `WA-CAP-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!form.ticketNo.trim()) {
      setForm((prev) => ({ ...prev, ticketNo: assignedTicket }));
    }

    // Bold formatting for WhatsApp (*Heading:*) - Cleaned without scrutiny mode
    const whatsappFormatted = `*Name:* ${form.name.trim()}
*Mobile Number:* ${form.mobile.trim()}
*Email:* ${form.email.trim() || 'N/A'}
*CET Registration No.:* ${form.cetRegNo.trim() || 'N/A'}
*CAP Application No.:* ${form.capAppNo.trim() || 'N/A'}
*Course Name:* ${form.courseName.trim()}
*Ticket No -* ${assignedTicket}

*Query -*
${form.query.trim()}`;

    setOutput(whatsappFormatted);

    // Save WhatsApp Ticket to Database (Firestore + LocalStorage)
    const activeUser = currentUser || getCurrentUser();
    const newRecord: TicketRecord = {
      id: assignedTicket,
      ticketNo: assignedTicket,
      ticketType: 'whatsapp_ticket',
      candidateName: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      cetNo: form.cetRegNo.trim().toUpperCase(),
      capId: form.capAppNo.trim().toUpperCase(),
      course: form.courseName.trim(),
      query: form.query.trim(),
      formattedText: whatsappFormatted,
      status: 'Open',
      createdBy: activeUser?.username || 'counsellor',
      creatorName: activeUser?.fullName || activeUser?.username || 'Counsellor Officer',
      creatorRole: activeUser?.role || 'counsellor',
      createdAt: new Date().toISOString(),
    };

    saveTicketRecord(newRecord);

    setStatusMessage({
      text: `WhatsApp Ticket ${assignedTicket} generated & saved to database!`,
      type: 'success',
    });
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDirectWhatsApp = () => {
    if (!output) return;
    const encoded = encodeURIComponent(output);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleReset = () => {
    setForm({
      name: '',
      mobile: '',
      email: '',
      cetRegNo: '',
      capAppNo: '',
      courseName: '',
      ticketNo: '',
      query: '',
    });
    setOutput('');
    setErrors({});
    setStatusMessage({ text: '', type: '' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="whatsapp-ticket-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#001D3D]/70 backdrop-blur-xs overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="whatsapp-ticket-modal-container"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-[#F7F9FC] text-[#1F2937] rounded-2xl shadow-2xl border border-[#D9E1EA] overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Website-Themed Navy Header */}
            <div className="bg-[#003B73] text-white px-5 sm:px-6 py-4 border-b border-[#002850] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0056A6] flex items-center justify-center text-white shadow-xs border border-white/20">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide leading-tight">
                    WhatsApp Notice Dispatcher
                  </h2>
                  <p className="text-xs text-blue-100">
                    Format and send candidate verification notices via WhatsApp
                  </p>
                </div>
              </div>

              <button
                id="close-wa-ticket-modal"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-[#1F2937] bg-[#F7F9FC]">
              {/* Status Notice */}
              {statusMessage.text && (
                <div
                  className={`p-3 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm font-medium ${
                    statusMessage.type === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  {statusMessage.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form Fields Card */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D9E1EA] shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-[#003B73] uppercase tracking-wider flex items-center gap-2 border-b border-[#D9E1EA] pb-2.5">
                    <FileCheck className="w-4 h-4 text-[#0056A6]" />
                    Candidate & Application Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#374151] mb-1">
                        Name: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Ashok Sharma"
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none transition-all ${
                          errors.name
                            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-[#D9E1EA] focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20'
                        }`}
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-bold text-[#374151] mb-1">
                        Mobile Number: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        value={form.mobile}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210"
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none transition-all ${
                          errors.mobile
                            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-[#D9E1EA] focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20'
                        }`}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-[#374151] mb-1">
                        Email:
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="e.g. candidate@example.com"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[#D9E1EA] bg-white focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 focus:outline-none transition-all"
                      />
                    </div>

                    {/* CET Registration No. */}
                    <div>
                      <label className="block text-xs font-bold text-[#374151] mb-1">
                        CET Registration No.:
                      </label>
                      <input
                        type="text"
                        name="cetRegNo"
                        value={form.cetRegNo}
                        onChange={handleChange}
                        placeholder="e.g. 2410293847"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[#D9E1EA] bg-white focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 focus:outline-none transition-all font-mono"
                      />
                    </div>

                    {/* CAP Application No. */}
                    <div>
                      <label className="block text-xs font-bold text-[#374151] mb-1">
                        CAP Application No.:
                      </label>
                      <input
                        type="text"
                        name="capAppNo"
                        value={form.capAppNo}
                        onChange={handleChange}
                        placeholder="e.g. EN24104928"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[#D9E1EA] bg-white focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 focus:outline-none transition-all font-mono uppercase"
                      />
                    </div>

                    {/* Course Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#374151] mb-1">
                        Course Name: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="courseName"
                        value={form.courseName}
                        onChange={handleChange}
                        placeholder="e.g. First Year Engineering (B.Tech / B.E.)"
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none transition-all ${
                          errors.courseName
                            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-[#D9E1EA] focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Ticket No */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#374151]">
                        Ticket No - :
                      </label>
                      <button
                        type="button"
                        onClick={generateTicketNumber}
                        className="text-[11px] font-semibold text-[#0056A6] hover:text-[#003B73] flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-[#0056A6]" />
                        Auto-generate Ticket ID
                      </button>
                    </div>
                    <input
                      type="text"
                      name="ticketNo"
                      value={form.ticketNo}
                      onChange={handleChange}
                      placeholder="e.g. WA-CAP-2026-894210 (or leave empty to auto-assign)"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#D9E1EA] bg-white focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Query */}
                  <div className="pt-1">
                    <label className="block text-xs font-bold text-[#374151] mb-1">
                      Query - : <span className="text-red-500">*</span>
                    </label>

                    <textarea
                      name="query"
                      rows={4}
                      value={form.query}
                      onChange={handleChange}
                      placeholder="Describe candidate query / discrepancy in detail..."
                      className={`w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none transition-all ${
                        errors.query
                          ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-[#D9E1EA] focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20'
                      }`}
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-white hover:bg-[#F7F9FC] text-[#4B5563] border border-[#D9E1EA] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset
                  </button>

                  <button
                    type="submit"
                    id="generate-whatsapp-ticket-btn"
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    Generate WhatsApp Notice
                  </button>
                </div>
              </form>

              {/* Copyable Data Preview for WhatsApp */}
              {output && (
                <div
                  id="whatsapp-output-card"
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-[#198754]/30 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#D9E1EA] pb-2.5">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-[#198754]" />
                      <span className="text-xs sm:text-sm font-bold text-[#1F2937]">
                        Formatted WhatsApp Notice
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direct WhatsApp Share Button */}
                      <button
                        type="button"
                        id="open-whatsapp-intent-btn"
                        onClick={handleDirectWhatsApp}
                        className="px-3 py-1.5 rounded-xl bg-[#198754] hover:bg-[#146c43] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Send via WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Open WhatsApp
                      </button>

                      {/* 1-Click Copy Button */}
                      <button
                        type="button"
                        id="copy-whatsapp-ticket-btn"
                        onClick={handleCopy}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          copied
                            ? 'bg-[#198754] text-white shadow-inner'
                            : 'bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Text
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Formatted Message Box */}
                  <div className="relative">
                    <pre className="p-3.5 bg-[#F7F9FC] rounded-xl text-xs font-mono text-[#1F2937] whitespace-pre-wrap leading-relaxed border border-[#D9E1EA]">
                      {output}
                    </pre>
                  </div>

                  <p className="text-[11px] text-[#6B7280]">
                    The <code className="text-[#0056A6] font-bold">*</code> markers around headers automatically format to bold text inside WhatsApp.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="bg-white px-5 py-3 border-t border-[#D9E1EA] flex items-center justify-between text-xs text-[#6B7280]">
              <span className="text-[11px]">Candidate Verification & Notice Desk</span>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-[#F7F9FC] hover:bg-[#EAF4FB] text-[#003B73] border border-[#D9E1EA] text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
