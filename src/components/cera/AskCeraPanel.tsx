import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  BookOpen,
  ExternalLink,
  Info,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  FileText,
  Search,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  CeraDocument,
  CeraChatMessage,
  CeraCitation,
} from '../../types/cera';
import { askCera } from '../../services/ceraService';
import { APP_ASSETS } from '../../constants/assets';

interface AskCeraPanelProps {
  activeDocument?: CeraDocument | null;
  onJumpToPage: (citation: CeraCitation) => void;
  messages: CeraChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<CeraChatMessage[]>>;
}

const CONTEXTUAL_CHIPS = [
  'Eligibility criteria',
  'Required documents',
  'Application fee',
  'Important dates & schedule',
  'Reservation & quota rules',
  'CAP round options process',
];

const SCAN_STAGES = [
  {
    title: 'Accessing official CET Information Bulletin & Rules...',
    detail: 'Loading official government circular and verified guidelines',
  },
  {
    title: 'Scanning clauses, eligibility criteria & reservation norms...',
    detail: 'Parsing official clauses, caste validity and OMS guidelines',
  },
  {
    title: 'Analyzing fee structures, seat matrix & document checklists...',
    detail: 'Correlating official tables, schedules and verification rules',
  },
  {
    title: 'Cross-referencing verified page citations & synthesizing...',
    detail: 'Formatting authoritative answer with verified source pages',
  },
];

export const AskCeraPanel: React.FC<AskCeraPanelProps> = ({
  activeDocument,
  onJumpToPage,
  messages,
  setMessages,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanStageIndex, setScanStageIndex] = useState<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevIsAskingRef = useRef<boolean>(false);

  // Rotate through scan stages while asking/analyzing
  useEffect(() => {
    if (!isAsking) {
      setScanStageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setScanStageIndex((prev) => (prev + 1) % SCAN_STAGES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [isAsking]);

  // Handle precise scrolling:
  // - When asking / loading: keep bottom visible to show live thinking & PDF analysis animation
  // - When answer arrives: show answer from START (scroll smoothly to the top of the CIA response)
  useEffect(() => {
    if (isAsking) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    } else if (prevIsAskingRef.current && !isAsking) {
      // CIA has finished answering! Find the newest CIA message and scroll to its START
      const lastCeraMsg = [...messages].reverse().find((m) => m.role === 'cera' && !m.isLoading);
      if (lastCeraMsg && messageRefs.current[lastCeraMsg.id]) {
        // Small delay to ensure DOM render has completed
        setTimeout(() => {
          const el = messageRefs.current[lastCeraMsg.id];
          if (el && scrollContainerRef.current) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }, 80);
      }
    }
    prevIsAskingRef.current = isAsking;
  }, [messages, isAsking]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputValue).trim();
    if (!q || isAsking) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: CeraChatMessage = {
      id: userMsgId,
      role: 'user',
      question: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activeDocContext: activeDocument
        ? {
            documentId: activeDocument.id,
            courseName: activeDocument.courseName,
            academicYear: activeDocument.academicYear,
          }
        : undefined,
    };

    const tempLoadingId = `cera-loading-${Date.now()}`;
    const loadingMessage: CeraChatMessage = {
      id: tempLoadingId,
      role: 'cera',
      rawContent: 'Searching document content and synthesizing answer...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsAsking(true);

    try {
      const response = await askCera(q, activeDocument, messages);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempLoadingId
            ? {
                ...msg,
                structuredAnswer: response,
                rawContent: undefined,
                isLoading: false,
              }
            : msg
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempLoadingId
            ? {
                ...msg,
                rawContent:
                  "I couldn't find a clear answer in the available official documents. Please verify with the official admissions portal or choose another brochure.",
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopyAnswer = async (msg: CeraChatMessage) => {
    let textToCopy = '';
    if (msg.structuredAnswer) {
      const ans = msg.structuredAnswer;
      textToCopy = `*${ans.title}*\n\n`;
      if (ans.summary) {
        textToCopy += `${ans.summary}\n\n`;
      }
      ans.sections.forEach((sec, idx) => {
        textToCopy += `${idx + 1}. ${sec.heading}\n`;
        if (sec.text) textToCopy += `${sec.text}\n`;
        if (sec.items && sec.items.length > 0) {
          sec.items.forEach((item) => {
            textToCopy += `   • ${item}\n`;
          });
        }
        textToCopy += '\n';
      });
      if (ans.importantNotes && ans.importantNotes.length > 0) {
        textToCopy += `*Important:*\n${ans.importantNotes.map((n) => `• ${n}`).join('\n')}\n\n`;
      }
      if (ans.sources && ans.sources.length > 0) {
        textToCopy += `*Official Sources:*\n${ans.sources
          .map((s) => `• ${s.documentTitle} (Page ${s.pageNumber})`)
          .join('\n')}\n`;
      }
    } else if (msg.rawContent) {
      textToCopy = msg.rawContent;
    }

    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedId(msg.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-[#0F172A] border-l border-[#E2E8F0] overflow-hidden select-none font-sans">
      {/* 1. PROFESSIONAL CIA HEADER */}
      <div className="px-4 py-3 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          {/* Crisp, professional CIA Logo Badge (No Neon Effect) */}
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden relative">
            <img
              src={APP_ASSETS.CIA}
              alt="CIA"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                Ask CIA
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[170px] sm:max-w-[210px]">
              Official CET Rulebook Assistant
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {activeDocument && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 max-w-[150px] truncate" title={activeDocument.courseName}>
              <BookOpen className="w-3 h-3 text-[#0056A6] shrink-0" />
              <span className="truncate">{activeDocument.courseName}</span>
            </div>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              disabled={isAsking}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-30"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. CHAT STREAM / RESEARCH RESULTS */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs font-sans bg-[#F8FAFC]"
      >
        {messages.length === 0 ? (
          /* Empty State: Pro Research Dashboard */
          <div className="py-10 px-3 text-center space-y-4 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto p-2">
              <img
                src={APP_ASSETS.CIA}
                alt="CIA"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#0F172A] tracking-tight">
                Ask CIA Official Assistant
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Instant, authoritative answers backed by verified official brochures & rulebooks with page citations.
              </p>
            </div>

            {activeDocument && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-[11px] font-medium">
                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Active Brochure: <strong>{activeDocument.courseName}</strong></span>
              </div>
            )}

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Suggested Inquiries
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {CONTEXTUAL_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5 group"
                  >
                    <span>{chip}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={`${msg.id}-${idx}`}
              ref={(el) => {
                messageRefs.current[msg.id] = el;
              }}
              className="space-y-2 scroll-mt-3"
            >
              {/* USER QUESTION: Pro Modern Bubble */}
              {msg.role === 'user' && (
                <div className="flex justify-end items-end gap-2">
                  <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-[#0056A6] to-[#004080] text-white font-medium text-xs leading-relaxed shadow-xs">
                    {msg.question}
                  </div>
                </div>
              )}

              {/* CIA ANSWER OR LIVE THINKING / PDF ANALYSIS ANIMATION */}
              {msg.role === 'cera' && (
                <div>
                  {msg.isLoading ? (
                    /* HIGH-END LIVE PDF ANALYSIS & COGNITIVE SCANNER ANIMATION */
                    <div className="rounded-2xl bg-white border border-blue-200/90 shadow-sm p-4 space-y-4 overflow-hidden relative">
                      {/* Ambient Glowing Background Sweep */}
                      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

                      {/* Header with Live Beacon */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 tracking-tight">
                                CIA Neural Document Inspector
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100/80 text-blue-800 font-extrabold uppercase tracking-wider">
                                Scanning
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {activeDocument ? activeDocument.courseName : 'Official CET Rulebook Database'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                          <span>ANALYZING</span>
                        </div>
                      </div>

                      {/* Animated Miniature PDF Document with Glowing Laser Scanline */}
                      <div className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 overflow-hidden">
                        {/* Horizontal Laser Beam Sweep that moves up and down */}
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-pdf-scan z-20 pointer-events-none" />

                        {/* Top Document Metadata Bar */}
                        <div className="flex items-center justify-between mb-2.5 text-[10px] font-semibold text-slate-500 border-b border-slate-200/70 pb-1.5">
                          <div className="flex items-center gap-1 text-slate-700">
                            <BookOpen className="w-3 h-3 text-blue-600" />
                            <span>Official Information Bulletin</span>
                          </div>
                          <span className="text-[9px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            OCR + VECTOR MATCH
                          </span>
                        </div>

                        {/* Simulated Document Lines Shimmering as scanline passes */}
                        <div className="space-y-2 opacity-85">
                          <div className="h-2 bg-slate-200 rounded w-3/4 animate-pulse" />
                          <div className="h-2 bg-blue-100 rounded w-full" />
                          <div className="h-2 bg-slate-200 rounded w-5/6" />
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div className="h-2 bg-blue-200/70 rounded" />
                            <div className="h-2 bg-slate-200 rounded" />
                            <div className="h-2 bg-slate-200 rounded" />
                          </div>
                          <div className="h-2 bg-slate-200 rounded w-2/3" />
                        </div>
                      </div>

                      {/* Rotating Multi-Stage Status Ticker */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                            {scanStageIndex + 1}
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 transition-all duration-300">
                              {SCAN_STAGES[scanStageIndex].title}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {SCAN_STAGES[scanStageIndex].detail}
                            </p>
                          </div>
                        </div>

                        {/* Shimmering Dynamic Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2 relative">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                            style={{
                              width: `${((scanStageIndex + 1) / SCAN_STAGES.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : msg.structuredAnswer ? (
                    /* PRO RESEARCH ANSWER CARD */
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 text-[#0F172A] space-y-4 shadow-xs hover:shadow-sm transition-shadow">
                      {/* Top Action Bar: Verified Shield & Copy Answer Button */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <ShieldCheck className="w-4 h-4 text-[#0056A6]" />
                          <span className="text-[11px] font-bold tracking-wide uppercase">
                            Official Verified Answer
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyAnswer(msg)}
                          className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Copy answer text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Title & Summary */}
                      <div className="space-y-2">
                        <h4 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight leading-snug">
                          {msg.structuredAnswer.title}
                        </h4>
                        {msg.structuredAnswer.summary && (
                          <div className="p-3 rounded-xl bg-blue-50/70 border-l-3 border-[#0056A6] text-slate-700 text-xs leading-relaxed font-normal">
                            {msg.structuredAnswer.summary}
                          </div>
                        )}
                      </div>

                      {/* Structured Sections */}
                      <div className="space-y-3.5 pt-1">
                        {msg.structuredAnswer.sections.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                            {sec.heading && (
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                                  {String(sIdx + 1).padStart(2, '0')}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 tracking-tight">
                                  {sec.heading}
                                </h5>
                              </div>
                            )}

                            {sec.text && (
                              <p className="text-xs text-slate-700 leading-relaxed pl-7">
                                {sec.text}
                              </p>
                            )}

                            {sec.items && sec.items.length > 0 && (
                              <ul className="space-y-1.5 text-xs text-slate-800 pl-7 pt-1">
                                {sec.items.map((it, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-2 leading-relaxed">
                                    <span className="text-[#0056A6] font-bold shrink-0 mt-0.5">•</span>
                                    <span>{it}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Important Notes Alert */}
                      {msg.structuredAnswer.importantNotes && msg.structuredAnswer.importantNotes.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-950 text-xs leading-relaxed space-y-1 shadow-2xs">
                          <div className="font-bold flex items-center gap-1.5 text-amber-800 text-[11px] uppercase tracking-wider">
                            <Info className="w-3.5 h-3.5 text-amber-600" />
                            <span>Important Rule Notice</span>
                          </div>
                          {msg.structuredAnswer.importantNotes.map((note, nIdx) => (
                            <p key={nIdx} className="text-amber-900 font-medium">
                              {note}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* SOURCE CITATIONS SECTION: Professional Legal Citation Design */}
                      {msg.structuredAnswer.sources && msg.structuredAnswer.sources.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Official Source Citations</span>
                            <span className="text-[10px] text-blue-600 font-semibold lowercase">
                              click to inspect in PDF viewer
                            </span>
                          </div>

                          <div className="space-y-2">
                            {msg.structuredAnswer.sources.map((src, srcIdx) => (
                              <div
                                key={srcIdx}
                                className="p-3 rounded-xl bg-white border border-slate-200/90 hover:border-blue-300 space-y-1.5 text-slate-800 shadow-2xs hover:shadow-xs transition-all group"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="font-semibold text-xs text-slate-900 truncate">
                                      {src.documentTitle}
                                    </span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 shrink-0 font-mono">
                                    Page {src.pageNumber}
                                  </span>
                                </div>

                                {src.section && (
                                  <div className="text-[11px] text-slate-500 pl-5">
                                    {src.section}
                                  </div>
                                )}

                                <div className="pt-1 pl-5">
                                  <button
                                    type="button"
                                    onClick={() => onJumpToPage(src)}
                                    className="py-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 font-bold text-[11px] inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group-hover:bg-blue-600 group-hover:text-white"
                                  >
                                    <span>Jump to Page {src.pageNumber} in PDF</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Contextual Chips */}
                      {msg.structuredAnswer.followUpQuestions && msg.structuredAnswer.followUpQuestions.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {msg.structuredAnswer.followUpQuestions.map((qChip, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              onClick={() => handleSend(qChip)}
                              className="text-[11px] font-medium text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 rounded-full px-3 py-1 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            >
                              <span>{qChip}</span>
                              <ChevronRight className="w-3 h-3 opacity-60" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap shadow-2xs">
                      {msg.rawContent}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 3. PRO COMMAND BAR INPUT */}
      <div className="p-3.5 bg-white border-t border-slate-200 shrink-0 shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                activeDocument
                  ? `Ask CIA about ${activeDocument.courseName}...`
                  : 'Ask CIA any question about official CET rules...'
              }
              disabled={isAsking}
              className="w-full text-xs pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none font-sans transition-all disabled:opacity-50"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                title="Clear input"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim() || isAsking}
            className="px-3.5 py-2.5 rounded-xl bg-[#0056A6] hover:bg-[#004080] text-white font-bold text-xs disabled:opacity-35 transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 active:scale-95"
            title="Ask CIA"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
        <div className="flex items-center justify-between pt-2 px-1 text-[10px] text-slate-400">
          <span>Official Maharashtra Admission Brochure Analysis</span>
          <span className="hidden sm:inline font-mono">Press Enter to ask</span>
        </div>
      </div>
    </div>
  );
};
