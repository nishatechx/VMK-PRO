import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Ticket,
  Calendar,
  UserCheck,
  BarChart3,
  Bell,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  X,
  Phone,
  MessageCircle,
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
  onOpenKnowledgeCenter?: () => void;
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
}) => {
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Standard Enterprise Navigation Items (Filtered by Super Admin Role & User Tab Permissions)
  const allNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    requiresAdmin?: boolean;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'facilitation_tools', label: 'Facilitation Tools', icon: Wrench },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'visitors', label: 'Visitors Entry', icon: UserCheck },
    { id: 'tickets', label: 'Tickets Desk', icon: Ticket },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notices_circulars', label: 'Notices & Circulars', icon: Bell, badge: unreadCount },
    { id: 'knowledge_base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'google_sheets', label: 'Google Sheets (DNO)', icon: FileSpreadsheet },
    { id: 'user_management', label: 'Manage Users (RBAC)', icon: ShieldCheck, requiresAdmin: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Dynamically filter nav items according to user's permissions set by Super Admin
  const navItems = allNavItems.filter((item) => hasTabPermission(currentUser, item.id));

  // Map legacy active tabs for seamless active indicator matching
  const resolvedActiveTab: NavTab =
    activeTab === 'students' ? 'candidates' :
    activeTab === 'profile' ? 'settings' :
    activeTab;

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.username?.toLowerCase() === 'shrinath';
  const isDno = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';

  return (
    <aside
      id="portal-sidebar"
      className={`relative h-full flex flex-col justify-between bg-[#092744] text-slate-200 border-r border-[#0d345a] transition-all duration-300 select-none z-20 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-[220px]'
      }`}
    >
      {/* Top Branding Section in Navy Sidebar */}
      <div>
        <div className="h-[74px] px-3.5 border-b border-[#0d345a] flex items-center justify-between gap-2">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={APP_ASSETS.LOGO}
                  alt="VMK Tools"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white tracking-wide truncate">
                  VMK Tools
                </span>
                <span className="text-[10px] text-sky-200/70 font-medium truncate">
                  Center FC-1102
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs">
                <img
                  src={APP_ASSETS.LOGO}
                  alt="VMK Tools"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 10 Enterprise Navigation Items */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedActiveTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer group relative ${
                  isActive
                    ? 'bg-[#0866D9] text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />

                {!isCollapsed && (
                  <span className="flex-1 text-left truncate tracking-normal">
                    {item.label}
                  </span>
                )}

                {!isCollapsed && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D92D3A] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Anchored Support & Status Section */}
      <div className="p-2.5 border-t border-[#0d345a] space-y-2">
        {/* Support Shortcut Button anchored at bottom per Section 3 */}
        <button
          type="button"
          onClick={() => setShowSupportModal(true)}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-white/8 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Center Support & Helpline"
        >
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col text-left leading-tight min-w-0">
              <span className="text-[11px] font-semibold text-white truncate">Center Support</span>
              <span className="text-[9px] text-slate-400 truncate">Helpline & Manuals</span>
            </div>
          )}
        </button>

        {/* User Mini Identity & Sign Out */}
        {!isCollapsed && (
          <div className="px-2 py-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[120px]">
              {currentUser?.username || 'Officer'} &bull; {currentUser?.district || 'Washim'}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="text-slate-400 hover:text-rose-400 cursor-pointer p-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Quick Center Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-md w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0866D9]" />
                <h3 className="font-bold text-sm text-[#102544]">Facilitation Desk Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] space-y-1">
                <span className="font-semibold text-[#073B70] block">Central Admission Helpline (Toll-Free)</span>
                <p className="text-[#62738D]">1800 209 0191 / 022 2201 6159</p>
                <p className="text-[11px] text-slate-400">Monday to Saturday: 10:00 AM – 6:00 PM</p>
              </div>

              <div className="p-3 bg-[#EBF3FC] rounded-xl border border-[#DCE5F0] space-y-1">
                <span className="font-semibold text-[#0866D9] block">District Nodal Officer (Washim)</span>
                <p className="text-[#102544] font-medium">+91 98220 12345 &bull; dno.washim@cetcell.mah.gov.in</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-[#DCE5F0] space-y-1 text-slate-600">
                <span className="font-semibold text-slate-800 block">External Candidate Ticket Portal</span>
                <a
                  href="https://sac.maharashtracet.org/mhcet/portal/tickets/my-tickets"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0866D9] hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>sac.maharashtracet.org/mhcet/portal/tickets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#073B70] hover:bg-[#092744] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
