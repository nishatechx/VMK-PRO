import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  LogOut,
  Settings,
  UserCheck,
  ShieldCheck,
  Clock,
  ExternalLink,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserProfile } from '../types/auth';
import { hasTabPermission } from '../services/authService';
import { APP_ASSETS } from '../constants/assets';
import { subscribeToSyncStatus, SyncQueueStatus } from '../services/offlineSyncService';
import { processOfflineSyncQueue } from '../services/backgroundSyncProcessor';

interface TopNavbarProps {
  onToggleSidebar?: () => void;
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
  onOpenExternalPortal,
  onOpenBroadcastModal,
  unreadCount = 0,
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

  const displayName = currentUser ? currentUser.fullName || currentUser.username : 'Center Officer';
  const roleLabel = currentUser ? currentUser.designation || currentUser.role.toUpperCase() : 'Facilitation Officer';

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
      className="w-full bg-[#FFFFFF] px-4 sm:px-6 h-[74px] flex items-center justify-between z-30 select-none shadow-[0_1px_3px_rgba(16,37,68,0.03)] shrink-0 border-b-0"
    >
      {/* Left: Portal Institutional Branding */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">

        {/* Institutional Branding: Logo + Title + Subtitle (Zero Divider Lines) */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            id="top-navbar-brand-logo"
            src={APP_ASSETS.LOGO}
            alt="VMK Facilitation Portal"
            className="h-10 sm:h-12 w-auto object-contain block select-none shrink-0"
            referrerPolicy="no-referrer"
          />

          <div className="hidden sm:flex flex-col min-w-0 pl-1 py-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#102544] tracking-tight truncate">
                Facilitation Support Portal
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#EBF3FC] text-[#0866D9] shrink-0 border-0">
                VMK FC-1102
              </span>
            </div>
            <p className="text-[11px] text-[#62738D] font-normal truncate">
              Facilitation & Scrutiny Center &bull; Govt. of Maharashtra
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions, Connectivity, Date/Time, Notifications & User Avatar (Zero Border Lines) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Open Target Website Shortcut with Vault indicator */}
        <button
          type="button"
          id="navbar-open-mhcet-portal-btn"
          onClick={() => {
            window.open('https://sac.maharashtracet.org/mhcet/portal/tickets/my-tickets', '_blank', 'noopener,noreferrer');
            if (onOpenExternalPortal) onOpenExternalPortal();
          }}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#073B70] hover:bg-[#092744] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer border-0 active:scale-95"
          title="Open MHCET External Portal with Vault file attachment"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
          <span>Open Website</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-white/20 text-white font-mono font-bold">
            Vault
          </span>
        </button>

        {/* Network Connectivity Status Indicator (Clean Borderless Pill) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border-0 transition-all cursor-pointer ${
            !syncStatus.isOnline
              ? 'bg-amber-100/70 text-amber-900'
              : syncStatus.isSyncing
              ? 'bg-[#EBF3FC] text-[#0866D9]'
              : syncStatus.totalPendingCount > 0
              ? 'bg-blue-100/70 text-blue-800'
              : 'bg-emerald-100/60 text-emerald-800'
          }`}
          title={
            !syncStatus.isOnline
              ? `Offline mode: ${syncStatus.totalPendingCount} items in local queue`
              : syncStatus.isSyncing
              ? 'Syncing local records with cloud database...'
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
              <span className="hidden lg:inline text-[11px]">Offline</span>
              {syncStatus.totalPendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                  {syncStatus.totalPendingCount}
                </span>
              )}
            </>
          ) : syncStatus.isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[#0866D9] animate-spin" />
              <span className="hidden lg:inline text-[11px]">Syncing...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#079669] animate-pulse" />
              <span className="hidden lg:inline text-[11px] text-[#079669]">Online</span>
            </>
          )}
        </div>

        {/* Current Date & Live Time (Clean Borderless Pill) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F7FB] border-0 text-xs">
          <Clock className="w-3.5 h-3.5 text-[#0866D9]" />
          <span className="font-normal text-[#62738D]">{formattedDate}</span>
          <span className="font-mono font-bold text-[#102544]">{formattedTime}</span>
        </div>

        {/* Notification Bell with unread count (Borderless) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenBroadcastModal) onOpenBroadcastModal();
          }}
          className="relative p-2 rounded-lg text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB] border-0 transition-colors cursor-pointer"
          title={unreadCount > 0 ? `${unreadCount} unread notices` : 'Notices & Broadcasts'}
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D92D3A] text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Pill & Dropdown (Borderless Pill) */}
        <div className="relative" ref={profileRef}>
          <button
            id="navbar-profile-btn"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 sm:pr-2.5 rounded-xl hover:bg-[#F4F7FB] border-0 transition-all cursor-pointer group text-left bg-transparent"
            aria-label="User account menu"
          >
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={displayName}
                className="w-8 h-8 rounded-lg object-cover border-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#073B70] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="hidden sm:flex flex-col text-left leading-tight min-w-0 max-w-[130px]">
              <span className="text-xs font-bold text-[#102544] truncate">{displayName}</span>
              <span className="text-[10px] text-[#62738D] truncate">{roleLabel}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#62738D] group-hover:text-[#102544] transition-transform hidden sm:inline" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl shadow-lg p-1.5 z-50">
              <div className="px-3 py-2.5 border-b border-[#DCE5F0]">
                <p className="text-xs font-bold text-[#102544]">{displayName}</p>
                <p className="text-[11px] text-[#62738D] truncate">{roleLabel}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F4F7FB] text-[#073B70] border border-[#DCE5F0]">
                    @{currentUser?.username || 'officer'}
                  </span>
                  <span className="text-[10px] text-[#079669] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#079669]" />
                    Active Session
                  </span>
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigateTab('profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#102544] hover:bg-[#F4F7FB] hover:text-[#0866D9] rounded-lg cursor-pointer transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-[#0866D9]" />
                  <span>Officer Profile & Security</span>
                </button>

                {hasTabPermission(currentUser, 'user_management') && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateTab('user_management');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#073B70] font-semibold hover:bg-[#F4F7FB] rounded-lg cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#073B70]" />
                    <span>User Management (RBAC)</span>
                  </button>
                )}

                {hasTabPermission(currentUser, 'google_sheets') && (
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateTab('google_sheets');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#102544] hover:bg-[#F4F7FB] rounded-lg cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#079669]" />
                    <span>Google Sheets Sync</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigateTab('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#102544] hover:bg-[#F4F7FB] hover:text-[#0866D9] rounded-lg cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#62738D]" />
                  <span>Center Settings</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#DCE5F0]">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#D92D3A] hover:bg-rose-50 rounded-lg cursor-pointer font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4 text-[#D92D3A]" />
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
