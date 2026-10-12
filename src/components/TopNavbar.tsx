import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, Settings, UserCheck, ShieldCheck, Building2, Phone, Clock, ExternalLink, Radio, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserProfile } from '../types/auth';
import { hasTabPermission } from '../services/authService';
import { APP_ASSETS } from '../constants/assets';
import { subscribeToSyncStatus, SyncQueueStatus } from '../services/offlineSyncService';
import { processOfflineSyncQueue } from '../services/backgroundSyncProcessor';

interface TopNavbarProps {
  onToggleSidebar: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onLogout: () => void;
  onOpenImgToPdf?: () => void;
  onOpenImageToText?: () => void;
  onOpenExternalPortal?: () => void;
  onOpenBroadcastModal?: () => void;
  unreadCount?: number;
  currentUser?: UserProfile | null;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleSidebar,
  onNavigateTab,
  onLogout,
  onOpenImgToPdf,
  onOpenImageToText,
  onOpenExternalPortal,
  onOpenBroadcastModal,
  currentUser,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState<SyncQueueStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    queuedTicketsCount: 0,
    queuedUploadsCount: 0,
    totalPendingCount: 0,
    lastSyncedAt: null,
  });
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

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
      className="w-full bg-white border-b border-[#D9E1EA] px-3 sm:px-6 py-2 flex items-center justify-between z-30 select-none shadow-xs min-h-[72px] sm:min-h-[84px]"
    >
      {/* Left: Hamburger & Government Portal Identity */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          id="mobile-menu-toggle"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#003B73] hover:text-[#0056A6] hover:bg-[#EAF4FB] active:scale-95 transition-all cursor-pointer border border-transparent hover:border-[#D9E1EA]"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="flex items-center shrink-0">
          <img
            id="top-navbar-brand-logo"
            src={APP_ASSETS.LOGO}
            alt="State Common Entrance Test Cell, Maharashtra"
            className="h-14 sm:h-16 md:h-20 lg:h-22 w-auto max-w-[280px] sm:max-w-[420px] md:max-w-[540px] lg:max-w-[620px] object-contain block py-0.5 select-none rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Right: Live Digital Clock, Helpline & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Open Target Website Quick Action */}
        <button
          type="button"
          id="navbar-open-mhcet-portal-btn"
          onClick={() => {
            window.open('https://sac.maharashtracet.org/mhcet/portal/tickets/my-tickets', '_blank', 'noopener,noreferrer');
            if (onOpenExternalPortal) onOpenExternalPortal();
          }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B73] hover:bg-[#002850] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer border border-[#002850] active:scale-95"
          title="Open MHCET External Portal in New Tab"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
          <span>Open Website</span>
          <span className="hidden lg:inline text-[10px] px-1 py-0.2 rounded bg-white/20 text-white font-bold">
            Vault
          </span>
        </button>

        {/* Broadcast Action for Super Admin & DNO */}
        {(currentUser?.role === 'super_admin' ||
          currentUser?.role === 'dno' ||
          currentUser?.username?.toLowerCase() === 'shrinath' ||
          currentUser?.username?.toLowerCase() === 'dno') &&
          onOpenBroadcastModal && (
            <button
              type="button"
              onClick={onOpenBroadcastModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-2xs transition-all cursor-pointer border border-amber-600 active:scale-95"
              title="Broadcast notification to counsellors & supporting staff"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-slate-950" />
              <span>Broadcast</span>
            </button>
          )}

        {/* Network & Offline Auto-Sync Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            !syncStatus.isOnline
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : syncStatus.isSyncing
              ? 'bg-[#EAF4FB] text-[#0056A6] border-[#0056A6]/30'
              : syncStatus.totalPendingCount > 0
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          title={
            !syncStatus.isOnline
              ? `Offline mode: ${syncStatus.totalPendingCount} items in local queue ready to auto-sync`
              : syncStatus.isSyncing
              ? 'Syncing local queue with cloud database...'
              : syncStatus.totalPendingCount > 0
              ? `${syncStatus.totalPendingCount} queued items - click to sync`
              : 'Connected: Real-time cloud sync active'
          }
          onClick={() => {
            if (syncStatus.isOnline && syncStatus.totalPendingCount > 0) {
              processOfflineSyncQueue();
            }
          }}
        >
          {!syncStatus.isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              <span className="hidden md:inline">Offline</span>
              {syncStatus.totalPendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                  {syncStatus.totalPendingCount}
                </span>
              )}
            </>
          ) : syncStatus.isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[#0056A6] animate-spin" />
              <span className="hidden md:inline">Syncing...</span>
            </>
          ) : syncStatus.totalPendingCount > 0 ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Sync</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {syncStatus.totalPendingCount}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden lg:inline text-[11px]">Online</span>
            </>
          )}
        </div>

        {/* Live Clock Strip */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7F9FC] border border-[#D9E1EA] text-xs text-[#003B73]">
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
                    <span>{currentUser?.role === 'super_admin' ? 'User Management (Super Admin)' : 'User Management (DNO)'}</span>
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

                {(currentUser?.role === 'super_admin' ||
                  currentUser?.role === 'dno' ||
                  currentUser?.username?.toLowerCase() === 'shrinath' ||
                  currentUser?.username?.toLowerCase() === 'dno') &&
                  onOpenBroadcastModal && (
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenBroadcastModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-800 font-bold hover:bg-amber-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <Radio className="w-4 h-4 text-amber-600" />
                      <span>Broadcast to Staff</span>
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
