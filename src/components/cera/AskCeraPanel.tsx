import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  BookOpen,
  ExternalLink,
  ChevronRight,
  Info,
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
  'Required documents',
  'Eligibility criteria',
  'Application fee',
  'Important dates',
];

export const AskCeraPanel: React.FC<AskCeraPanelProps> = ({
  activeDocument,
  onJumpToPage,
  messages,
  setMessages,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
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
                  "I couldn't find a clear answer in the available official documents.",
                isLoading: false,
              }
            : msg
        )
      );
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-[#172033] border-l border-[#E2E8F0] overflow-hidden select-none">
      {/* 1. CLEAN ASK SIA HEADER */}
      <div className="px-4 py-3 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white border border-[#E2E8F0] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            <img src={APP_ASSETS.SIA} alt="SIA" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">
            Ask SIA
          </h3>
        </div>

        {activeDocument && (
          <span className="text-[11px] text-[#64748B] truncate max-w-[180px] font-medium">
            {activeDocument.courseName}
          </span>
        )}
      </div>

      {/* 2. CHAT STREAM / RESEARCH RESULTS */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs font-sans bg-[#FAFCFF]"
      >
        {messages.length === 0 ? (
          /* Empty State (Section: Chat Empty State) */
          <div className="py-12 px-2 text-center space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#F0F7FF] text-[#1677FF] flex items-center justify-center mx-auto font-bold text-xs">
              C
            </div>
            <h4 className="text-sm font-semibold text-[#172033]">Ask CIA</h4>
            <p className="text-xs text-[#64748B] max-w-xs mx-auto">
              Ask a question about this document
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 max-w-sm mx-auto">
              {CONTEXTUAL_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-[#475569] bg-[#FFFFFF] hover:bg-[#F0F7FF] hover:text-[#1677FF] border border-[#E2E8F0] hover:border-[#1677FF]/40 transition-colors cursor-pointer shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={`${msg.id}-${idx}`} className="space-y-2">
              {/* USER QUESTION: Small light-blue bubble */}
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tr-xs bg-[#EAF3FF] text-[#062B66] border border-[#D0E2FF] font-medium text-xs leading-relaxed shadow-2xs">
                    {msg.question}
                  </div>
                </div>
              )}

              {/* CIA ANSWER: Editorial / Research Document Result Layout */}
              {msg.role === 'cera' && (
                <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-[#172033] space-y-3 shadow-2xs">
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2 py-2 text-[#64748B] font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1677FF]" />
                      <span>{msg.rawContent}</span>
                    </div>
                  ) : msg.structuredAnswer ? (
                    <>
                      {/* Title & Summary */}
                      <div className="space-y-1.5 pb-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-[#062B66] leading-snug">
                          {msg.structuredAnswer.title}
                        </h4>
                        {msg.structuredAnswer.summary && (
                          <p className="text-xs text-[#334155] leading-relaxed">
                            {msg.structuredAnswer.summary}
                          </p>
                        )}
                      </div>

                      {/* Structured Sections */}
                      <div className="space-y-3 pt-1">
                        {msg.structuredAnswer.sections.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-1.5">
                            {sec.heading && (
                              <h5 className="text-[11px] font-semibold text-[#062B66] tracking-wide">
                                {sec.heading}
                              </h5>
                            )}

                            {sec.text && (
                              <p className="text-xs text-[#475569] leading-relaxed">
                                {sec.text}
                              </p>
                            )}

                            {sec.items && sec.items.length > 0 && (
                              <ul className="space-y-1 text-xs text-[#172033]">
                                {sec.items.map((it, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-2 leading-relaxed">
                                    <span className="text-[#1677FF] font-bold shrink-0 mt-0.5">•</span>
                                    <span>{it}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Important Notes */}
                      {msg.structuredAnswer.importantNotes && msg.structuredAnswer.importantNotes.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-[#FFF9F0] border border-[#FFE4C4] text-[#8C4A00] text-[11px] leading-relaxed space-y-0.5">
                          <div className="font-semibold flex items-center gap-1 text-[#FF8A00]">
                            <Info className="w-3 h-3" />
                            <span>Important</span>
                          </div>
                          {msg.structuredAnswer.importantNotes.map((note, nIdx) => (
                            <p key={nIdx}>{note}</p>
                          ))}
                        </div>
                      )}

                      {/* SOURCE CITATION SECTION */}
                      {msg.structuredAnswer.sources && msg.structuredAnswer.sources.length > 0 && (
                        <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                            Source
                          </div>

                          {msg.structuredAnswer.sources.map((src, srcIdx) => (
                            <div
                              key={srcIdx}
                              className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-[#172033]"
                            >
                              <div className="font-medium text-xs text-[#062B66]">
                                {src.documentTitle}
                              </div>

                              <div className="text-[11px] text-[#64748B]">
                                {src.academicYear && `${src.academicYear} · `}
                                Page {src.pageNumber}
                                {src.section && ` · ${src.section}`}
                              </div>

                              <button
                                type="button"
                                onClick={() => onJumpToPage(src)}
                                className="mt-2 py-1 px-2.5 rounded-md bg-[#FFFFFF] hover:bg-[#F0F7FF] text-[#1677FF] border border-[#CBD5E1] hover:border-[#1677FF]/40 font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <span>Open Page {src.pageNumber}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Contextual Chips */}
                      {msg.structuredAnswer.followUpQuestions && msg.structuredAnswer.followUpQuestions.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {msg.structuredAnswer.followUpQuestions.map((qChip, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              onClick={() => handleSend(qChip)}
                              className="text-[11px] font-medium text-[#475569] hover:text-[#1677FF] bg-[#F1F5F9] hover:bg-[#F0F7FF] rounded-full px-2.5 py-1 transition-colors cursor-pointer"
                            >
                              {qChip}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap">{msg.rawContent}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 3. CHAT INPUT (Section 28) */}
      <div className="p-3 bg-[#FFFFFF] border-t border-[#E2E8F0] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
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
                ? `Ask about ${activeDocument.courseName}...`
                : 'Ask about this document...'
            }
            disabled={isAsking}
            className="flex-1 text-xs px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#172033] placeholder:text-[#94A3B8] focus:border-[#1677FF] focus:bg-[#FFFFFF] outline-none font-sans transition-all"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isAsking}
            className="p-2.5 rounded-xl bg-[#1677FF] hover:bg-[#1677FF]/90 text-white disabled:opacity-30 transition-colors cursor-pointer shrink-0"
            title="Send query"
          >
            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
