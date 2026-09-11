import React, { useEffect } from 'react';
import { CheckCircle, ArrowRight, UserCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile } from '../types/auth';
import { getRoleLabel } from '../services/authService';

interface WelcomeModalProps {
  user: UserProfile;
  onClose: () => void;
}

export function WelcomeModal({ user, onClose }: WelcomeModalProps) {
  const displayName = user.fullName?.trim() || user.username;
  const roleLabel = getRoleLabel(user.role);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      id="welcome-popup-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="welcome-popup-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col items-center text-center transform transition-all duration-300 scale-100 animate-in zoom-in-95"
      >
        {/* Decorative Top Accent Glow */}
        <div className="w-16 h-1 bg-[#0056A6] rounded-full mb-5 opacity-90" />

        {/* User Avatar with Verification Glow */}
        <div className="relative mb-4">
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={displayName}
              className="w-20 h-20 rounded-2xl object-cover border-3 border-white shadow-md ring-4 ring-[#0056A6]/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0056A6] to-[#003B73] text-white flex items-center justify-center font-bold text-2xl shadow-md ring-4 ring-[#0056A6]/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Success Badge */}
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Welcome Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0056A6] border border-blue-100 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#0056A6]" />
          <span>Login Successful</span>
        </div>

        {/* Name Headline */}
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
          Welcome, {displayName}!
        </h2>

        {/* Role & Designation */}
        <div className="mt-2 flex flex-col items-center gap-1">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {user.role === 'dno' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-[#0056A6]" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            {roleLabel}
          </span>
          {user.designation && (
            <p className="text-xs text-slate-500 font-medium max-w-[260px] truncate">
              {user.designation}
            </p>
          )}
        </div>

        {/* Continue Button */}
        <button
          id="welcome-popup-continue-btn"
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-6 w-full py-3 px-5 rounded-2xl bg-[#0056A6] hover:bg-[#004080] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#0056A6]/25"
        >
          <span>Continue to Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
