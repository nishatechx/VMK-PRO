import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';

export interface FormValidationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  missingFields?: string[];
  extraErrors?: string[];
}

export const FormValidationErrorModal: React.FC<FormValidationErrorModalProps> = ({
  isOpen,
  onClose,
  title = 'Required Fields Missing',
  description = 'Please fill in all mandatory fields before proceeding. The following items are remaining or empty:',
  missingFields = [],
  extraErrors = [],
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="validation-error-popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-[#001D3D]/70 backdrop-blur-xs overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="validation-error-popup-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-rose-200 text-slate-900 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red Accent Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of remaining / empty mandatory fields */}
            {missingFields && missingFields.length > 0 && (
              <div className="mt-4 p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl max-h-52 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
                    Empty / Incomplete Fields
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                    {missingFields.length} remaining
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {missingFields.map((field, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-xs font-semibold text-rose-800 bg-white/70 px-2.5 py-1.5 rounded-lg border border-rose-100"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional validation errors (e.g. format, digits) */}
            {extraErrors && extraErrors.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                  Attention Required
                </span>
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                  {extraErrors.map((err, idx) => (
                    <li key={idx} className="font-medium">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Action */}
            <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#003B73] hover:bg-[#002850] active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Review & Complete Form</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
