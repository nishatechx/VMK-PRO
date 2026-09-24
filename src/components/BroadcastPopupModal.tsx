import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  ExternalLink,
  CheckCircle2,
  X,
  Radio,
  ShieldAlert,
  Maximize2,
  Calendar,
  Building2,
} from 'lucide-react';
import { BroadcastNotification } from '../types/broadcast';

interface BroadcastPopupModalProps {
  broadcast: BroadcastNotification | null;
  isOpen: boolean;
  onAcknowledge: (broadcastId: string) => void;
  onClose?: () => void;
}

export const BroadcastPopupModal: React.FC<BroadcastPopupModalProps> = ({
  broadcast,
  isOpen,
  onAcknowledge,
  onClose,
}) => {
  const [isImageExpanded, setIsImageExpanded] = useState<boolean>(false);

  if (!isOpen || !broadcast) return null;

  const handleDismiss = () => {
    onAcknowledge(broadcast.id);
    if (onClose) onClose();
  };

  const priorityConfig = {
    urgent: {
      badge: 'URGENT ADMINISTRATIVE DIRECTIVE',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      headerBg: 'bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800',
    },
    important: {
      badge: 'IMPORTANT FACILITATION NOTICE',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      headerBg: 'bg-gradient-to-r from-[#003B73] via-[#0056A6] to-sky-700',
    },
    info: {
      badge: 'OFFICIAL CENTER CIRCULAR',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
      icon: Info,
      iconColor: 'text-sky-600',
      headerBg: 'bg-gradient-to-r from-[#003B73] via-[#0056A6] to-[#004080]',
    },
  }[broadcast.priority || 'important'];

  const PriorityIcon = priorityConfig.icon;

  const formattedDate = (() => {
    try {
      const d = new Date(broadcast.createdAt);
      if (isNaN(d.getTime())) return broadcast.createdAt;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return broadcast.createdAt;
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-popup-title"
    >
      <div className="relative w-full max-w-lg md:max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Government Authority Banner Header */}
        <div className={`p-4 sm:p-5 text-white ${priorityConfig.headerBg} relative shadow-xs`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20 shadow-xs">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white/20 text-white backdrop-blur-sm">
                  <PriorityIcon className="w-3 h-3" />
                  <span>{priorityConfig.badge}</span>
                </div>
                <h2
                  id="broadcast-popup-title"
                  className="text-base sm:text-lg font-bold text-white leading-tight mt-1 line-clamp-2"
                >
                  {broadcast.title}
                </h2>
              </div>
            </div>

            {/* Close button (will mark as acknowledged) */}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
              title="Acknowledge and close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Broadcaster Credential Strip */}
          <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-white/90">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="font-semibold text-white">
                {broadcast.senderRole === 'super_admin'
                  ? 'Broadcast by Super Administrator'
                  : `Broadcast by DNO (${broadcast.senderDistrict || 'Washim District'})`}
              </span>
              <span className="text-white/70">&bull; {broadcast.senderName}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-white/80 font-mono">
              <Calendar className="w-3 h-3 text-white/70" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-sm">
          {/* Main Broadcast Message */}
          <div className="whitespace-pre-line leading-relaxed text-slate-700 bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80">
            {broadcast.message}
          </div>

          {/* Broadcast Image Attachment if present */}
          {broadcast.imageUrl && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Official Attached Circular / Document Image</span>
                <button
                  type="button"
                  onClick={() => setIsImageExpanded(!isImageExpanded)}
                  className="text-[#0056A6] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>{isImageExpanded ? 'Standard view' : 'Expand image'}</span>
                </button>
              </div>

              <div
                className={`relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 transition-all ${
                  isImageExpanded ? 'max-h-[600px]' : 'max-h-64 sm:max-h-72'
                }`}
              >
                <img
                  src={broadcast.imageUrl}
                  alt={broadcast.title}
                  className="w-full h-full object-contain mx-auto cursor-pointer"
                  onClick={() => setIsImageExpanded(!isImageExpanded)}
                />
              </div>
            </div>
          )}

          {/* Attached Link Action if present */}
          {broadcast.linkUrl && (
            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Reference Link / Circular Portal</span>
                </p>
                <p className="text-[11px] text-blue-700 truncate font-mono mt-0.5">
                  {broadcast.linkUrl}
                </p>
              </div>

              <a
                href={broadcast.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#0056A6] hover:bg-[#003B73] text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
              >
                <span>{broadcast.linkText || 'Open Link ↗'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-[11px] text-slate-500 text-center sm:text-left leading-tight">
            Mandatory broadcast notice from administration. Acknowledging removes this popup from your session.
          </p>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0056A6] hover:bg-[#003B73] active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>I Acknowledge & Understand</span>
          </button>
        </div>
      </div>
    </div>
  );
};
