import React from 'react';
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
} from 'lucide-react';
import { TabPermission, UserProfile } from '../types/auth';
import { hasTabPermission } from '../services/authService';

export type NavTab = TabPermission;

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unreadCount?: number;
  currentUser?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  unreadCount = 0,
  currentUser,
}) => {
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
      <div className="pt-5 pb-4 px-3.5 border-b border-[#D9E1EA] bg-gradient-to-b from-[#FFFFFF]/90 to-transparent">
        {isCollapsed ? (
          /* Collapsed User Avatar */
          <div
            className="flex flex-col items-center justify-center cursor-pointer group"
            onClick={() => onSelectTab('profile')}
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
            className="p-3 bg-[#FFFFFF] rounded-2xl border border-[#D9E1EA] shadow-2xs hover:shadow-xs hover:border-[#006BB6] transition-all cursor-pointer group"
            onClick={() => onSelectTab('profile')}
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
    </aside>
  );
};

