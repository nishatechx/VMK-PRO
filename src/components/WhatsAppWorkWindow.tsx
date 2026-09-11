import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  Send,
  Sparkles,
  QrCode,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  ChevronDown,
  Info,
} from 'lucide-react';

interface WhatsAppWorkWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppWorkWindow: React.FC<WhatsAppWorkWindowProps> = ({ isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('verification_ok');
  const [copied, setCopied] = useState<boolean>(false);

  // Template options for student / candidate interactions
  const templates: Record<string, { label: string; text: string }> = {
    verification_ok: {
      label: 'Document Verified (Success)',
      text: 'Respected Candidate, your documents for CET CAP 2026 verification have been successfully verified and confirmed by VMK College Scrutiny Center. Kindly check your official portal login for receipt.',
    },
    objection: {
      label: 'Objection Raised / Discrepancy',
      text: 'Dear Candidate, an objection has been noted during your document verification for CET CAP 2026. Please re-upload the required valid document or visit VMK College Scrutiny Center urgently.',
    },
    fee_payment: {
      label: 'Seat Allotment & Reporting',
      text: 'Greetings from VMK College. Please report to the Admission Facilitation Center with all original certificates and verification acknowledgement for completing your seat confirmation.',
    },
    custom: {
      label: 'Custom Message',
      text: '',
    },
  };

  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key);
    if (key !== 'custom') {
      setCustomText(templates[key].text);
    } else {
      setCustomText('');
    }
  };

  // Launch standalone popup window for WhatsApp Web
  const launchStandaloneWhatsApp = (withNumber = '', withMessage = '') => {
    let url = 'https://web.whatsapp.com/';
    if (withNumber) {
      const cleanPhone = withNumber.replace(/\D/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const encodedMsg = encodeURIComponent(withMessage || customText || templates[selectedTemplate]?.text || '');
      url = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedMsg}`;
    }

    // Opens as a standalone frameless application window (desktop-app style)
    const windowFeatures =
      'width=1100,height=780,left=120,top=60,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
    const win = window.open(url, 'WhatsAppWebWorkWindow', windowFeatures);
    if (!win) {
      // If popup blocker intervened, fall back to standard open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSendQuickChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    const msgToSend = selectedTemplate === 'custom' ? customText : templates[selectedTemplate]?.text || customText;
    launchStandaloneWhatsApp(phone, msgToSend);
  };

  const handleCopyMessage = () => {
    const msg = selectedTemplate === 'custom' ? customText : templates[selectedTemplate]?.text || customText;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none select-none">
      <div className="pointer-events-auto w-[92vw] sm:w-[480px] max-w-[500px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-white rounded-2xl border-2 border-[#25D366]/40 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Window Title Bar */}
          <div className="bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] text-white px-4 py-2.5 flex items-center justify-between cursor-move shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white">
                <MessageCircle className="w-4 h-4 fill-white text-[#075E54]" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold tracking-tight text-white">
                    WhatsApp Web Window
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/25 text-white font-bold uppercase tracking-wider">
                    Work Desk
                  </span>
                </div>
                <span className="text-[10px] text-emerald-100 font-medium hidden sm:inline">
                  Log in once & dispatch candidate messages
                </span>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="wa-window-popout-btn"
                onClick={() => launchStandaloneWhatsApp()}
                className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                title="Pop out standalone WhatsApp Web window (Desktop Mode)"
                aria-label="Popout window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="wa-window-minimize-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                title={isMinimized ? 'Expand window' : 'Minimize window'}
                aria-label="Minimize or expand"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                id="wa-window-close-btn"
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                title="Close WhatsApp window"
                aria-label="Close window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Window Body */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 bg-[#F0F2F5] space-y-3.5 select-text overflow-hidden"
              >
                {/* 1. Primary Action: Launch & Log In Dedicated Window */}
                <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#128C7E] flex items-center justify-center border border-emerald-200 font-bold">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Launch WhatsApp Web App Window
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Opens in a standalone window beside your dashboard
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="wa-open-app-window-primary"
                    onClick={() => launchStandaloneWhatsApp()}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0f7669] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open WhatsApp Web Window (Scan QR to Login)</span>
                  </button>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Official web.whatsapp.com
                    </span>
                    <span>Session stays saved in your browser</span>
                  </div>
                </div>

                {/* 2. Candidate Quick Message Dispatcher */}
                <form
                  onSubmit={handleSendQuickChat}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Send Notice to Candidate Phone</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Direct Chat</span>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Candidate 10-digit WhatsApp Mobile
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                        +91
                      </span>
                      <input
                        type="tel"
                        id="wa-quick-phone-input"
                        placeholder="9876543210"
                        value={phone}
                        maxLength={10}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Template Picker */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Notice / Message Template
                    </label>
                    <div className="relative">
                      <select
                        id="wa-template-select"
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50/50 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {Object.entries(templates).map(([key, t]) => (
                          <option key={key} value={key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Message Body preview/edit */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">
                        Message Content
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="text-[10px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>
                    </div>

                    <textarea
                      id="wa-message-textarea"
                      rows={3}
                      value={selectedTemplate === 'custom' ? customText : templates[selectedTemplate]?.text}
                      onChange={(e) => {
                        setSelectedTemplate('custom');
                        setCustomText(e.target.value);
                      }}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 bg-slate-50/50 resize-none font-sans"
                      placeholder="Type your message here..."
                    />
                  </div>

                  {/* Dispatch Button */}
                  <button
                    type="submit"
                    id="wa-send-quick-chat-btn"
                    disabled={!phone}
                    className="w-full py-2 px-3 rounded-xl bg-[#075E54] hover:bg-[#128C7E] disabled:bg-slate-300 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send Message via WhatsApp Window</span>
                  </button>
                </form>

                {/* Helpful Note regarding WhatsApp Security */}
                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-tight">
                    <strong>Note:</strong> Meta requires WhatsApp Web to operate in its own browser window to protect your end-to-end encryption. Once opened, you can keep the WhatsApp window snapped alongside this dashboard.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
