import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, Settings, UserCheck, ShieldCheck, Building2, Phone, Clock, ExternalLink } from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserProfile } from '../types/auth';
import { hasTabPermission } from '../services/authService';

interface TopNavbarProps {
  onToggleSidebar: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onLogout: () => void;
  unreadCount?: number;
  currentUser?: UserProfile | null;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleSidebar,
  onNavigateTab,
  onLogout,
  currentUser,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = currentUser ? currentUser.fullName || currentUser.username : 'DNO Officer';
  const roleLabel = currentUser ? currentUser.designation || currentUser.role.toUpperCase() : 'District Nodal Officer';

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header
      id="top-navbar"
      className="w-full bg-white border-b border-[#D9E1EA] px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 select-none shadow-xs"
    >
      {/* Left: Hamburger & Government Portal Identity */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#003B73] hover:text-[#0056A6] hover:bg-[#EAF4FB] active:scale-95 transition-all cursor-pointer border border-transparent hover:border-[#D9E1EA]"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#003B73] flex items-center justify-center text-white font-bold text-xs shadow-xs border border-[#002850]">
            <Building2 className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-[#003B73] tracking-tight">
                Scrutiny & Visitor Portal
              </span>
              <span className="hidden md:inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-medium hidden sm:inline-block">
              Candidate Verification & Visitor Desk
            </span>
          </div>
        </div>
      </div>

      {/* Right: Live Digital Clock, Helpline & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live Clock Strip */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7F9FC] border border-[#D9E1EA] text-xs text-[#003B73]">
          <Clock className="w-3.5 h-3.5 text-[#0056A6]" />
          <span className="font-medium text-[#4B5563]">{formattedDate}</span>
          <span className="font-mono font-bold text-[#003B73]">{formattedTime}</span>
        </div>

        {/* User Profile Pill */}
        <div className="relative" ref={profileRef}>
          <button
            id="navbar-profile-btn"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 sm:pr-3 rounded-full sm:rounded-xl hover:bg-[#EAF4FB] border border-transparent hover:border-[#D9E1EA] transition-all cursor-pointer group text-left"
            aria-label="User account menu"
          >
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#0056A6] shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0056A6] to-[#003B73] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Authorized User</span>
              <span className="text-xs font-bold text-[#1F2937] flex items-center gap-1">
                {displayName}
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] group-hover:text-[#0056A6] transition-transform" />
              </span>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#D9E1EA] rounded-2xl shadow-xl p-2 z-50">
              <div className="px-3 py-2.5 border-b border-[#D9E1EA]">
                <p className="text-xs font-bold text-[#1F2937]">{displayName}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{roleLabel}</p>
                <p className="text-[10px] font-mono text-[#0056A6] mt-0.5">
                  User ID: {currentUser?.username || 'dno'}
                </p>
              </div>

              <div className="py-1">
                {hasTabPermission(currentUser, 'profile') && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateTab('profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#4B5563] hover:bg-[#EAF4FB] hover:text-[#003B73] rounded-xl cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-[#0056A6]" />
                    <span>My Profile & Security</span>
                  </button>
                )}

                {hasTabPermission(currentUser, 'user_management') && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateTab('user_management');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#003B73] font-semibold hover:bg-[#EAF4FB] rounded-xl cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0056A6]" />
                    <span>User Management (DNO)</span>
                  </button>
                )}

                {hasTabPermission(currentUser, 'settings') && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateTab('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#4B5563] hover:bg-[#EAF4FB] hover:text-[#003B73] rounded-xl cursor-pointer transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#4B5563]" />
                    <span>Center Settings</span>
                  </button>
                )}
              </div>

              <div className="pt-1 border-t border-[#D9E1EA]">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
