import React from 'react';
import {
  MessageSquareText,
  QrCode,
  Ticket,
  FileImage,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Lock,
} from 'lucide-react';
import { APP_ASSETS } from '../../constants/assets';
import { UserProfile } from '../../types/auth';
import { hasFeaturePermission } from '../../services/authService';

interface FacilitationToolsViewProps {
  onOpenWhatsappTool?: () => void;
  onOpenQrTool?: () => void;
  onOpenTicketTool?: () => void;
  onOpenImgToPdfTool?: () => void;
  onOpenImageToTextTool?: () => void;
  onOpenKnowledgeCenter?: () => void;
  currentUser?: UserProfile | null;
}

export const FacilitationToolsView: React.FC<FacilitationToolsViewProps> = ({
  onOpenWhatsappTool,
  onOpenQrTool,
  onOpenTicketTool,
  onOpenImgToPdfTool,
  onOpenImageToTextTool,
  onOpenKnowledgeCenter,
  currentUser,
}) => {
  const tools = [
    {
      id: 'tool-whatsapp',
      title: 'WhatsApp Ticket',
      subtitle: 'Instant Candidate Messaging & Ticket Dispatch',
      description: 'Dispatch official admission ticket receipts, scrutiny notices, and verification acknowledgements directly to candidate WhatsApp numbers.',
      icon: MessageSquareText,
      imageSrc: APP_ASSETS.WHATSAPP_TOOL,
      badge: 'Communications',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      actionLabel: 'Launch WhatsApp Tool',
      onClick: onOpenWhatsappTool,
      allowed: hasFeaturePermission(currentUser, 'whatsapp_tool'),
    },
    {
      id: 'tool-qr',
      title: 'Files by QR',
      subtitle: 'Mobile Camera Document Ingestion',
      description: 'Generate dynamic QR codes for candidates to scan and instantly upload identity documents, marks sheets, and caste certificates from their smartphones.',
      icon: QrCode,
      imageSrc: APP_ASSETS.FILES_BY_QR,
      badge: 'Document Intake',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      actionLabel: 'Open QR Upload Desk',
      onClick: onOpenQrTool,
      allowed: hasFeaturePermission(currentUser, 'qr_upload_tool'),
    },
    {
      id: 'tool-ticket',
      title: 'SAC Ticket Generator',
      subtitle: 'Official Scrutiny & Grievance Ticketing',
      description: 'Standardized Scrutiny Center ticket generator. Compiles official candidate information notes for CAP portal ticket submission.',
      icon: Ticket,
      imageSrc: APP_ASSETS.SAC_TICKET_GENERATOR,
      badge: 'Official Desk',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      actionLabel: 'Generate SAC Ticket',
      onClick: onOpenTicketTool,
      allowed: hasFeaturePermission(currentUser, 'ticket_generator_tool'),
    },
    {
      id: 'tool-img2pdf',
      title: 'Image to PDF',
      subtitle: 'Multi-Page Document Compiler & Compressor',
      description: 'Combine photographed marksheets, domicile, non-creamy layer, and transfer certificates into single compliant PDF files under 500KB.',
      icon: FileImage,
      imageSrc: APP_ASSETS.IMAGE_TO_PDF,
      badge: 'Utility',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      actionLabel: 'Open PDF Converter',
      onClick: onOpenImgToPdfTool,
      allowed: hasFeaturePermission(currentUser, 'img_to_pdf_tool'),
    },
    {
      id: 'tool-img2txt',
      title: 'Image to Text',
      subtitle: 'High-Precision OCR & Form Extractor',
      description: 'Extract Marathi, Hindi, and English text from printed or handwritten application forms, certificates, and hall tickets with instant copy-to-clipboard.',
      icon: FileText,
      imageSrc: APP_ASSETS.IMAGE_TO_TEXT,
      badge: 'OCR Processing',
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      actionLabel: 'Launch OCR Scanner',
      onClick: onOpenImageToTextTool,
      allowed: hasFeaturePermission(currentUser, 'image_to_text_tool'),
    },
    {
      id: 'tool-cia',
      title: 'CIA',
      subtitle: 'CET & CAP Information Assistant',
      description: 'Authoritative rulebook search engine and document assistant. Queries official Information Bulletins, eligibility norms, and reservation quotas with exact page citations.',
      icon: Sparkles,
      imageSrc: APP_ASSETS.CIA,
      badge: 'Rulebook Intelligence',
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
      actionLabel: 'Open CIA Assistant',
      onClick: onOpenKnowledgeCenter,
      allowed: true,
    },
  ];

  return (
    <div className="w-full space-y-6 pb-8 select-none font-sans">
      {/* Page Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]">
              Facilitation Desk
            </span>
            <span className="text-xs text-[#62738D]">Center FC-1102</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            Facilitation Tools & Utilities
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Production utilities for candidate registration, document processing, grievance ticketing, and official rulebook inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#079669] text-xs font-semibold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>All 6 Tools Operational</span>
          </span>
        </div>
      </div>

      {/* 6-Card Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <div
              key={tool.id}
              className="bg-white border border-[#DCE5F0] hover:border-[#0866D9]/50 rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top: Icon + Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl p-2 bg-[#F4F7FB] border border-[#DCE5F0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src={tool.imageSrc}
                      alt={tool.title}
                      className="w-full h-full object-contain filter drop-shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${tool.badgeColor}`}>
                    {tool.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-[#102544] group-hover:text-[#0866D9] transition-colors tracking-tight">
                  {tool.title}
                </h3>
                <p className="text-[11px] font-semibold text-[#073B70] mt-0.5">
                  {tool.subtitle}
                </p>
                <p className="text-xs text-[#62738D] leading-relaxed mt-2.5">
                  {tool.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-[#DCE5F0]">
                <button
                  type="button"
                  onClick={tool.onClick}
                  disabled={!tool.allowed}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 group-hover:shadow-md ${
                    tool.allowed
                      ? 'bg-[#073B70] hover:bg-[#0866D9] text-white cursor-pointer active:scale-98'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
                  }`}
                >
                  {!tool.allowed && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span>{tool.allowed ? tool.actionLabel : 'Access Restricted by Super Admin'}</span>
                  {tool.allowed && <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Notice Footer */}
      <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#DCE5F0] flex items-center gap-3 text-xs text-[#62738D]">
        <Info className="w-4 h-4 text-[#0866D9] shrink-0" />
        <span>
          These tools run in local client-side memory with cloud synchronization. Data entered here does not persist to unverified third-party services.
        </span>
      </div>
    </div>
  );
};
