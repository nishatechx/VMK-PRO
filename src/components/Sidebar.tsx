import React, { useState } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  GraduationCap,
  Settings,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  Lock,
  Ticket,
  X,
  MessageSquareText,
  QrCode,
  FileImage,
  FileText,
  Wrench,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { TabPermission, UserProfile } from '../types/auth';
import { hasTabPermission, hasFeaturePermission } from '../services/authService';
import { APP_ASSETS } from '../constants/assets';

export type NavTab = TabPermission;

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  unreadCount?: number;
  currentUser?: UserProfile | null;
  onOpenWhatsappTool?: () => void;
  onOpenQrTool?: () => void;
  onOpenTicketTool?: () => void;
  onOpenImgToPdfTool?: () => void;
  onOpenImageToTextTool?: () => void;
  onOpenExternalPortal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  onClose,
  unreadCount = 0,
  currentUser,
  onOpenWhatsappTool,
  onOpenQrTool,
  onOpenTicketTool,
  onOpenImgToPdfTool,
  onOpenImageToTextTool,
  onOpenExternalPortal,
}) => {
  const [isBridgePassModalOpen, setIsBridgePassModalOpen] = useState<boolean>(false);
  const [bridgePassInput, setBridgePassInput] = useState<string>('');
  const [bridgePassError, setBridgePassError] = useState<string | null>(null);
  const [showBridgePass, setShowBridgePass] = useState<boolean>(false);

  const allNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    isProtected?: boolean;
  }[] = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'visitors' as NavTab, label: 'Visitors Entry', icon: UserCheck },
    { id: 'tickets' as NavTab, label: 'Counsellor Tickets', icon: Ticket },
    { id: 'google_sheets' as NavTab, label: 'Google Sheets', icon: FileSpreadsheet, isProtected: true },
    { id: 'students' as NavTab, label: 'Students', icon: GraduationCap },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
    { id: 'profile' as NavTab, label: 'Profile', icon: UserCircle },
    { id: 'user_management' as NavTab, label: 'User Management', icon: ShieldCheck },
  ];

  // Check if current user is DNO administrator
  const isDnoAdmin = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';

  // Tool permissions for active facilitation utilities
  const canWhatsapp = hasFeaturePermission(currentUser, 'whatsapp_tool');
  const canQr = hasFeaturePermission(currentUser, 'qr_upload_tool');
  const canTicket = hasFeaturePermission(currentUser, 'ticket_generator_tool');
  const canImgToPdf = hasFeaturePermission(currentUser, 'img_to_pdf_tool');
  const canImageToText = hasFeaturePermission(currentUser, 'image_to_text_tool');
  const hasAnyTools = canWhatsapp || canQr || canTicket || canImgToPdf || canImageToText;

  // Filter tabs according to the logged-in user's allowedTabs RBAC rules (Google Sheets exclusively for DNO Admin)
  const allowedNavItems = allNavItems.filter((item) => {
    return hasTabPermission(currentUser, item.id);
  });

  // Get user role display label
  const getRoleLabel = (role?: string) => {
    if (!role) return 'Authorized User';
    switch (role.toLowerCase()) {
      case 'dno':
        return 'DNO Admin';
      case 'counsellor':
        return 'Counsellor';
      case 'supporting_staff':
      case 'operator':
        return 'Supporting Staff';
      default:
        return role.toUpperCase();
    }
  };

  const displayName = currentUser?.fullName || currentUser?.username || 'Officer / User';
  const displayRole = currentUser?.designation || getRoleLabel(currentUser?.role);

  return (
    <aside
      id="portal-sidebar"
      className={`relative h-full flex flex-col justify-between bg-[#F7F9FC] border-r border-[#D9E1EA] transition-all duration-300 select-none z-20 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
    >
      {/* Top User Profile Section */}
      <div className="pt-4 pb-4 px-3.5 border-b border-[#D9E1EA] bg-gradient-to-b from-[#FFFFFF]/90 to-transparent">
        {onClose && (
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#D9E1EA]">
            {!isCollapsed && (
              <span className="text-[11px] font-bold text-[#003B73] tracking-wide uppercase">
                Navigation Menu
              </span>
            )}
            <button
              type="button"
              id="sidebar-close-btn"
              onClick={onClose}
              className={`p-1.5 rounded-lg text-[#4B5563] hover:text-[#DC3545] hover:bg-[#DC3545]/10 active:scale-95 transition-all cursor-pointer ${
                isCollapsed ? 'mx-auto' : 'ml-auto'
              }`}
              title="Hide / Close Sidebar"
              aria-label="Hide sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isCollapsed ? (
          /* Collapsed User Avatar */
          <div
            className={`flex flex-col items-center justify-center group ${hasTabPermission(currentUser, 'profile') ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => hasTabPermission(currentUser, 'profile') && onSelectTab('profile')}
            title={`${displayName} (${displayRole})`}
          >
            <div className="relative">
              {currentUser?.profilePicture ? (
                <img
                  src={currentUser.profilePicture}
                  alt={displayName}
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-xs ring-2 ring-[#0056A6]/20 group-hover:ring-[#0056A6] transition-all"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0056A6] to-[#003B73] text-white flex items-center justify-center font-bold text-base shadow-xs ring-2 ring-[#0056A6]/20 group-hover:ring-[#0056A6] transition-all">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#198754] rounded-full border-2 border-white shadow-xs"
                title="Online & Active"
              />
            </div>
          </div>
        ) : (
          /* Expanded User Info Card */
          <div
            className={`p-3 bg-[#FFFFFF] rounded-2xl border border-[#D9E1EA] shadow-2xs hover:shadow-xs transition-all ${
              hasTabPermission(currentUser, 'profile')
                ? 'hover:border-[#006BB6] cursor-pointer group'
                : 'cursor-default'
            }`}
            onClick={() => hasTabPermission(currentUser, 'profile') && onSelectTab('profile')}
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {currentUser?.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={displayName}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs ring-2 ring-[#0056A6]/15 group-hover:ring-[#0056A6]/40 transition-all"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0056A6] to-[#003B73] text-white flex items-center justify-center font-bold text-lg shadow-xs ring-2 ring-[#0056A6]/15 group-hover:ring-[#0056A6]/40 transition-all">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#198754] rounded-full border-2 border-white shadow-xs"
                  title="Online & Active"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-[#1F2937] truncate leading-snug group-hover:text-[#0056A6] transition-colors">
                  {displayName}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EAF4FB] text-[#0056A6] border border-[#D9E1EA] truncate max-w-[150px]">
                    {getRoleLabel(currentUser?.role)}
                  </span>
                </div>
                {currentUser?.designation && (
                  <p className="text-[11px] text-[#4B5563] truncate mt-0.5 font-medium">
                    {currentUser.designation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0056A6] text-white shadow-md shadow-[#003B73]/20 font-semibold'
                  : 'text-[#4B5563] hover:text-[#003B73] hover:bg-[#EAF4FB]'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform ${
                  isActive ? 'text-white' : 'text-[#4B5563] group-hover:text-[#0056A6]'
                }`}
              />

              {!isCollapsed && (
                <span className="flex-1 text-left whitespace-nowrap flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.isProtected && (
                    <span
                      title="Password Protected (dno1)"
                      className={`ml-1.5 p-1 rounded-md text-[10px] flex items-center gap-1 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#EAF4FB] text-[#0056A6]'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </span>
              )}

              {!isCollapsed && item.badge && item.badge > 0 ? (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#DC3545] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* Tools & Utilities Section (Shifted to Sidebar) */}
        {hasAnyTools && (
          <div className="pt-2 pb-1">
            <div className="my-2 border-t border-[#D9E1EA]" />
            {!isCollapsed && (
              <div className="px-1 pb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#003B73] uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3 h-3 text-[#0056A6]" />
                  Facilitation Tools
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#EAF4FB] text-[#0056A6]">
                  Utilities
                </span>
              </div>
            )}

            <div className="space-y-1">
              {canWhatsapp && onOpenWhatsappTool && (
                <button
                  type="button"
                  id="sidebar-tool-whatsapp"
                  onClick={() => {
                    onOpenWhatsappTool();
                    if (onClose && window.innerWidth < 768) onClose();
                  }}
                  title={isCollapsed ? 'WhatsApp Ticket Tool' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#075E54] hover:text-white bg-emerald-50 hover:bg-[#075E54] border border-emerald-200/80 hover:border-[#075E54] transition-all cursor-pointer shadow-2xs group ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-white border border-[#D9E1EA] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img src={APP_ASSETS.WHATSAPP_TOOL} alt="WhatsApp" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">WhatsApp Ticket</span>
                  )}
                </button>
              )}

              {canQr && onOpenQrTool && (
                <button
                  type="button"
                  id="sidebar-tool-qr"
                  onClick={() => {
                    onOpenQrTool();
                    if (onClose && window.innerWidth < 768) onClose();
                  }}
                  title={isCollapsed ? 'Files by QR Code' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200/80 hover:border-amber-600 transition-all cursor-pointer shadow-2xs group ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-white border border-[#D9E1EA] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img src={APP_ASSETS.FILES_BY_QR} alt="Files by QR" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">Files by QR</span>
                  )}
                </button>
              )}

              {canTicket && onOpenTicketTool && (
                <button
                  type="button"
                  id="sidebar-tool-ticket"
                  onClick={() => {
                    onOpenTicketTool();
                    if (onClose && window.innerWidth < 768) onClose();
                  }}
                  title={isCollapsed ? 'SAC Ticket Generator' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#003B73] hover:text-white bg-[#EAF4FB] hover:bg-[#0056A6] border border-[#D9E1EA] hover:border-[#0056A6] transition-all cursor-pointer shadow-2xs group ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-white border border-[#D9E1EA] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img src={APP_ASSETS.SAC_TICKET_GENERATOR} alt="SAC Ticket" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">SAC Ticket Generator</span>
                  )}
                </button>
              )}

              {canImgToPdf && onOpenImgToPdfTool && (
                <button
                  type="button"
                  id="sidebar-tool-img-to-pdf"
                  onClick={() => {
                    onOpenImgToPdfTool();
                    if (onClose && window.innerWidth < 768) onClose();
                  }}
                  title={isCollapsed ? 'Image to PDF Converter' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-800 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200/80 hover:border-indigo-600 transition-all cursor-pointer shadow-2xs group ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-white border border-[#D9E1EA] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img src={APP_ASSETS.IMAGE_TO_PDF} alt="Image to PDF" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">Image to PDF</span>
                  )}
                </button>
              )}

              {canImageToText && onOpenImageToTextTool && (
                <button
                  type="button"
                  id="sidebar-tool-img-to-text"
                  onClick={() => {
                    onOpenImageToTextTool();
                    if (onClose && window.innerWidth < 768) onClose();
                  }}
                  title={isCollapsed ? 'Image to Text' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-violet-800 hover:text-white bg-violet-50 hover:bg-violet-600 border border-violet-200/80 hover:border-violet-600 transition-all cursor-pointer shadow-2xs group ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-white border border-[#D9E1EA] p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img src={APP_ASSETS.IMAGE_TO_TEXT} alt="Image to Text" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">Image to Text</span>
                  )}
                </button>
              )}

              {/* Shifted Vault Picker Bridge Banner - Password Protected (vmk@8975) */}
              {!isCollapsed ? (
                <div className="mt-1.5 bg-gradient-to-br from-[#003B73] via-[#004f98] to-[#0284C7] rounded-xl p-2.5 text-white shadow-xs border border-[#002850]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-amber-300 shrink-0">
                        <Lock className="w-3 h-3" />
                      </div>
                      <span className="text-[11px] font-bold text-white truncate">
                        Vault Picker Bridge
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 shrink-0">
                      PIN
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-100 leading-tight mb-2">
                    MHCET Ticket Portal file upload bridge for external website.
                  </p>
                  <button
                    type="button"
                    id="sidebar-vault-bridge-btn"
                    onClick={() => {
                      setIsBridgePassModalOpen(true);
                      setBridgePassInput('');
                      setBridgePassError(null);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-white hover:bg-blue-50 text-[#003B73] font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
                    title="Unlock Vault Picker Bridge (Password Protected: vmk@8975)"
                  >
                    <Key className="w-3 h-3 text-[#0056A6]" />
                    <span>Unlock Bridge</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="sidebar-vault-bridge-btn-collapsed"
                  onClick={() => {
                    setIsBridgePassModalOpen(true);
                    setBridgePassInput('');
                    setBridgePassError(null);
                  }}
                  title="Vault Picker Bridge (Password: vmk@8975)"
                  className="relative w-full flex items-center justify-center py-2.5 rounded-xl text-[#003B73] bg-[#EAF4FB] hover:bg-[#003B73] hover:text-white border border-[#D9E1EA] transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="w-7 h-7 rounded-xl bg-white border border-[#D9E1EA] p-1 flex items-center justify-center shrink-0 shadow-2xs text-[#0056A6] group-hover:text-[#003B73]">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="my-1 border-t border-[#D9E1EA]" />

        {/* Logout Menu Item */}
        <button
          id="nav-item-logout"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-[#4B5563] hover:text-[#DC3545] hover:bg-[#DC3545]/10 transition-all cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0 text-[#4B5563]" />
          {!isCollapsed && <span className="flex-1 text-left">Logout</span>}
        </button>
      </div>

      {/* Collapse/Expand Toggle Circular Button at Bottom-Right */}
      <div className="relative p-3 flex justify-end">
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#D9E1EA] shadow-2xs flex items-center justify-center text-[#4B5563] hover:text-[#0056A6] hover:bg-[#EAF4FB] active:scale-95 transition-all cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Password Verification Modal for Vault Picker Bridge (vmk@8975) */}
      {isBridgePassModalOpen && (
        <div
          id="vault-bridge-password-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBridgePassModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsBridgePassModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0056A6] shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Vault Picker Bridge Security</h3>
                <p className="text-xs text-slate-500">MHCET Ticket Portal Integration</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This bridge opens the official Maharashtra CET ticket portal and enables direct Vault file uploads for ticket forms. Enter the authorization password to proceed.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (bridgePassInput.trim() === 'vmk@8975') {
                  window.open('https://sac.maharashtracet.org/mhcet/portal/tickets/my-tickets', '_blank', 'noopener,noreferrer');
                  if (onOpenExternalPortal) onOpenExternalPortal();
                  if (onClose && window.innerWidth < 768) onClose();
                  setIsBridgePassModalOpen(false);
                  setBridgePassInput('');
                  setBridgePassError(null);
                } else {
                  setBridgePassError('Invalid password. Correct password is vmk@8975');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bridge Security Password
                </label>
                <div className="relative">
                  <input
                    type={showBridgePass ? 'text' : 'password'}
                    value={bridgePassInput}
                    onChange={(e) => {
                      setBridgePassInput(e.target.value);
                      if (bridgePassError) setBridgePassError(null);
                    }}
                    placeholder="Enter password (vmk@8975)"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0056A6]/30 focus:border-[#0056A6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBridgePass(!showBridgePass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showBridgePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {bridgePassError && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{bridgePassError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsBridgePassModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#003B73] hover:bg-[#002b54] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Verify & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

