import React, { useMemo, useState, useEffect } from 'react';
import {
  FileText,
  MessageCircle,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  GraduationCap,
  Ticket,
  MapPin,
  Activity,
  Clock,
  Edit3,
  ChevronRight,
  Search,
  Calendar,
  X,
  RefreshCw,
  Radio,
} from 'lucide-react';
import {
  getStudentRecords,
  getVisitorRecords,
  subscribeToStudents,
  subscribeToVisitors,
  hasTabPermission,
  hasFeaturePermission,
} from '../../services/authService';
import { getTicketRecords, subscribeToTickets } from '../../services/ticketService';
import { UserProfile, StudentRecord, VisitorRecord, TicketRecord } from '../../types/auth';
import { DashboardNoticeBar } from '../DashboardNoticeBar';
import { APP_ASSETS } from '../../constants/assets';

function getActivityDateKey(timestamp?: string, rawDate?: number): string {
  if (rawDate && rawDate > 0) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  if (timestamp) {
    const trimmed = timestamp.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [dd, mm, yyyy] = trimmed.split('/');
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return '';
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return dateStr || 'Recently';
  }
}

interface DashboardViewProps {
  onOpenWhatsappTool?: () => void;
  onOpenQrTool?: () => void;
  onOpenTicketTool?: () => void;
  onOpenTicketWithData?: (data: any) => void;
  onOpenImgToPdfTool?: () => void;
  onOpenImageToTextTool?: () => void;
  onOpenExternalPortal?: () => void;
  onOpenBroadcastModal?: () => void;
  onOpenKnowledgeCenter?: () => void;
  onNavigateTab: (tab: any) => void;
  currentUser?: UserProfile | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWhatsappTool,
  onOpenQrTool,
  onOpenTicketTool,
  onOpenTicketWithData,
  onOpenImgToPdfTool,
  onOpenImageToTextTool,
  onOpenExternalPortal,
  onOpenBroadcastModal,
  onOpenKnowledgeCenter,
  onNavigateTab,
  currentUser,
}) => {
  const [allStudents, setAllStudents] = useState<StudentRecord[]>(() => getStudentRecords());
  const [allVisitors, setAllVisitors] = useState<VisitorRecord[]>(() => getVisitorRecords());
  const [allTickets, setAllTickets] = useState<TicketRecord[]>(() => getTicketRecords());
  const [activityFilter, setActivityFilter] = useState<'all' | 'ticket' | 'student' | 'visitor'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>('');
  const [maxVisibleCount, setMaxVisibleCount] = useState<number>(6);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchLatestLogs = () => {
    setIsRefreshing(true);
    setAllStudents(getStudentRecords());
    setAllVisitors(getVisitorRecords());
    setAllTickets(getTicketRecords());
    setLastRefreshedAt(new Date());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  useEffect(() => {
    const unsubTickets = subscribeToTickets((data) => setAllTickets(data));
    const unsubStudents = subscribeToStudents((data) => setAllStudents(data));
    const unsubVisitors = subscribeToVisitors((data) => setAllVisitors(data));

    return () => {
      unsubTickets();
      unsubStudents();
      unsubVisitors();
    };
  }, []);

  // Live Mode: automatically fetch new log entries every 30 seconds
  useEffect(() => {
    if (!isLiveMode) return;

    const intervalId = setInterval(() => {
      fetchLatestLogs();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [isLiveMode]);

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.username?.toLowerCase() === 'shrinath';
  const isDno = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';
  const currentDistrict = (currentUser?.district || 'Washim').trim().toLowerCase();

  const students = useMemo(() => {
    return allStudents.filter((s) => {
      if (isSuperAdmin) return true;
      if (isDno) {
        const sDist = (s.district || 'Washim').trim().toLowerCase();
        return sDist === currentDistrict;
      }
      return (
        s.createdBy === currentUser?.username ||
        s.createdBy === currentUser?.id ||
        (currentUser?.username && s.createdBy?.toLowerCase() === currentUser.username.toLowerCase())
      );
    });
  }, [allStudents, isSuperAdmin, isDno, currentDistrict, currentUser]);

  const visitors = useMemo(() => {
    return allVisitors.filter((v) => {
      if (isSuperAdmin) return true;
      if (isDno) {
        const vDist = (v.district || 'Washim').trim().toLowerCase();
        return vDist === currentDistrict;
      }
      return (
        v.createdBy === currentUser?.username ||
        v.createdBy === currentUser?.id ||
        (currentUser?.username && v.createdBy?.toLowerCase() === currentUser.username.toLowerCase())
      );
    });
  }, [allVisitors, isSuperAdmin, isDno, currentDistrict, currentUser]);

  const tickets = useMemo(() => {
    return allTickets.filter((t) => {
      if (isSuperAdmin) return true;
      if (isDno) {
        const tDist = (t.district || 'Washim').trim().toLowerCase();
        return tDist === currentDistrict;
      }
      const u = currentUser?.username?.toLowerCase();
      const uid = currentUser?.id?.toLowerCase();
      const fn = currentUser?.fullName?.toLowerCase();
      return (
        (u && t.createdBy?.toLowerCase() === u) ||
        (uid && t.createdBy?.toLowerCase() === uid) ||
        (fn && t.creatorName?.toLowerCase() === fn)
      );
    });
  }, [allTickets, isSuperAdmin, isDno, currentDistrict, currentUser]);

  const verifiedCount = students.filter((s) => s.status === 'Verified').length;
  const objectionCount = students.filter((s) => s.status === 'Objection Raised').length;
  const inCenterVisitors = visitors.filter((v) => v.status === 'In Premises').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;

  const canWhatsapp = hasFeaturePermission(currentUser, 'whatsapp_tool');
  const canQr = hasFeaturePermission(currentUser, 'qr_upload_tool');
  const canTicket = hasFeaturePermission(currentUser, 'ticket_generator_tool');
  const canImgToPdf = hasFeaturePermission(currentUser, 'img_to_pdf_tool');
  const canImageToText = hasFeaturePermission(currentUser, 'image_to_text_tool');

  // Facilitation Tools for active desk operations
  const facilitationTools: Array<{
    id: string;
    title: string;
    imageSrc: string;
    onClick: () => void;
  }> = [];

  if (canWhatsapp && onOpenWhatsappTool) {
    facilitationTools.push({
      id: 'dashboard-tool-whatsapp',
      title: 'WhatsApp Ticket',
      imageSrc: APP_ASSETS.WHATSAPP_TOOL,
      onClick: onOpenWhatsappTool,
    });
  }

  if (canQr && onOpenQrTool) {
    facilitationTools.push({
      id: 'dashboard-tool-qr',
      title: 'Files by QR',
      imageSrc: APP_ASSETS.FILES_BY_QR,
      onClick: onOpenQrTool,
    });
  }

  if (canTicket && onOpenTicketTool) {
    facilitationTools.push({
      id: 'dashboard-tool-ticket',
      title: 'SAC Ticket Generator',
      imageSrc: APP_ASSETS.SAC_TICKET_GENERATOR,
      onClick: onOpenTicketTool,
    });
  }

  if (canImgToPdf && onOpenImgToPdfTool) {
    facilitationTools.push({
      id: 'dashboard-tool-img-to-pdf',
      title: 'Image to PDF',
      imageSrc: APP_ASSETS.IMAGE_TO_PDF,
      onClick: onOpenImgToPdfTool,
    });
  }

  if (canImageToText && onOpenImageToTextTool) {
    facilitationTools.push({
      id: 'dashboard-tool-img-to-text',
      title: 'Image to Text',
      imageSrc: APP_ASSETS.IMAGE_TO_TEXT,
      onClick: onOpenImageToTextTool,
    });
  }

  if (onOpenKnowledgeCenter) {
    facilitationTools.push({
      id: 'dashboard-tool-knowledge-center',
      title: 'CIA',
      imageSrc: APP_ASSETS.LOGO,
      onClick: onOpenKnowledgeCenter,
    });
  }

  // STRICTLY check tab permissions - do not show modules not given to user
  const hasStudentAccess = hasTabPermission(currentUser, 'students');
  const hasVisitorAccess = hasTabPermission(currentUser, 'visitors');
  const hasTicketAccess = hasTabPermission(currentUser, 'tickets');

  // STRICTLY only include stats allotted to the user
  const quickStats: Array<{
    label: string;
    value: string;
    change: string;
    icon: any;
    color: string;
  }> = [];

  if (hasStudentAccess) {
    quickStats.push(
      {
        label: 'Verified Candidates',
        value: `${verifiedCount}`,
        change: students.length > 0 ? `${Math.round((verifiedCount / students.length) * 100)}% verified` : '0 today',
        icon: CheckCircle2,
        color: 'text-[#198754] bg-[#198754]/10 border-[#198754]/25',
      },
      {
        label: 'Pending Verification',
        value: `${objectionCount}`,
        change: objectionCount > 0 ? 'Action required' : 'Clear',
        icon: AlertTriangle,
        color: 'text-[#DC3545] bg-[#DC3545]/10 border-[#DC3545]/25',
      }
    );
  }

  if (hasVisitorAccess) {
    quickStats.push({
      label: 'Visitors Today',
      value: `${visitors.length}`,
      change: inCenterVisitors > 0 ? `${inCenterVisitors} in center` : 'All checked out',
      icon: UserCheck,
      color: 'text-[#0056A6] bg-[#EAF4FB] border-[#D9E1EA]',
    });
  }

  if (hasTicketAccess) {
    quickStats.push({
      label: 'Counsellor Tickets',
      value: `${tickets.length}`,
      change: openTicketsCount > 0 ? `${openTicketsCount} active/pending` : 'All resolved',
      icon: Ticket,
      color: 'text-[#003B73] bg-[#EAF4FB] border-[#D9E1EA]',
    });
  }

  const recentStudents = students.slice(0, 5);

  // User Recent Activity Items (Tickets, Candidate Scrutiny, Visitor entries)
  const ticketActivities = useMemo(() => {
    return tickets.map((t) => {
      const time = t.updatedAt || t.createdAt || '';
      const dateObj = new Date(time);
      const rawDate = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
      const statusColor =
        t.status === 'Resolved' || t.status === 'Closed'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : t.status === 'In Progress'
          ? 'bg-sky-50 text-sky-800 border-sky-200'
          : 'bg-amber-50 text-amber-800 border-amber-200';

      return {
        id: `ticket-${t.id || t.ticketNo}`,
        type: 'ticket' as const,
        title: t.candidateName || 'Candidate Ticket',
        subtitle: `${t.course || 'CET'} • ${
          t.query ? (t.query.length > 60 ? t.query.substring(0, 60) + '...' : t.query) : 'Candidate Grievance Note'
        }`,
        meta: t.ticketNo,
        status: t.status || 'Open',
        statusColor,
        timestamp: time,
        relativeTime: formatRelativeTime(time),
        rawDate,
        data: t,
      };
    });
  }, [tickets]);

  const studentActivities = useMemo(() => {
    return students.map((s) => {
      const time = s.createdAt || s.date || '';
      const dateObj = new Date(time);
      const rawDate = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
      const statusColor =
        s.status === 'Verified'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : s.status === 'Objection Raised'
          ? 'bg-rose-50 text-rose-800 border-rose-200'
          : 'bg-amber-50 text-amber-800 border-amber-200';

      return {
        id: `student-${s.id}`,
        type: 'student' as const,
        title: s.name,
        subtitle: `${s.course} • Mode: ${s.mode}${s.remarks ? ` • ${s.remarks}` : ''}`,
        meta: s.id,
        status: s.status,
        statusColor,
        timestamp: time,
        relativeTime: formatRelativeTime(time),
        rawDate,
        data: s,
      };
    });
  }, [students]);

  const visitorActivities = useMemo(() => {
    return visitors.map((v) => {
      const time = v.createdAt || v.date || '';
      const dateObj = new Date(time);
      const rawDate = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
      const statusColor =
        v.status === 'In Premises'
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-slate-100 text-slate-700 border-slate-200';

      return {
        id: `visitor-${v.id}`,
        type: 'visitor' as const,
        title: `${v.name} (${v.visitorType})`,
        subtitle: `Purpose: ${v.purpose} • ${v.address}`,
        meta: v.checkInTime || 'Visitor',
        status: v.status,
        statusColor,
        timestamp: time,
        relativeTime: formatRelativeTime(time),
        rawDate,
        data: v,
      };
    });
  }, [visitors]);

  const allUserActivities = useMemo(() => {
    return [...ticketActivities, ...studentActivities, ...visitorActivities].sort(
      (a, b) => b.rawDate - a.rawDate
    );
  }, [ticketActivities, studentActivities, visitorActivities]);

  const filteredActivities = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();

    return allUserActivities.filter((activity) => {
      // 1. Type Filter
      if (activityFilter !== 'all' && activity.type !== activityFilter) {
        return false;
      }

      // 2. Date Filter
      if (selectedSpecificDate) {
        const actDateKey = getActivityDateKey(activity.timestamp, activity.rawDate);
        if (actDateKey !== selectedSpecificDate) {
          return false;
        }
      } else if (dateRangeMode === 'today') {
        const actTime = activity.rawDate;
        if (actTime > 0) {
          if (actTime < startOfToday || actTime > endOfToday) {
            return false;
          }
        } else {
          const actDateKey = getActivityDateKey(activity.timestamp, activity.rawDate);
          const todayKey = getActivityDateKey(new Date().toISOString(), Date.now());
          if (actDateKey !== todayKey) {
            return false;
          }
        }
      } else if (dateRangeMode === 'week') {
        const actTime = activity.rawDate;
        if (actTime > 0) {
          if (actTime < sevenDaysAgo) {
            return false;
          }
        } else {
          const parsed = new Date(activity.timestamp).getTime();
          if (!isNaN(parsed) && parsed < sevenDaysAgo) {
            return false;
          }
        }
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          activity.title.toLowerCase().includes(q) ||
          activity.subtitle.toLowerCase().includes(q) ||
          activity.meta.toLowerCase().includes(q) ||
          activity.status.toLowerCase().includes(q) ||
          activity.type.toLowerCase().includes(q) ||
          (activity.data?.mobile && String(activity.data.mobile).includes(q)) ||
          (activity.data?.email && String(activity.data.email).toLowerCase().includes(q)) ||
          (activity.data?.cetNo && String(activity.data.cetNo).toLowerCase().includes(q)) ||
          (activity.data?.capId && String(activity.data.capId).toLowerCase().includes(q)) ||
          (activity.data?.ticketNo && String(activity.data.ticketNo).toLowerCase().includes(q)) ||
          (activity.data?.course && String(activity.data.course).toLowerCase().includes(q));

        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [allUserActivities, activityFilter, dateRangeMode, selectedSpecificDate, searchQuery]);

  return (
    <div className="relative z-10 w-full pb-6">
      {/* 2-Column Responsive Dashboard: Main Workspace (Left) + CET Cell Notice Bar (Right) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Workspace Column */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          {/* DNO District Supervision Banner */}
          {isDno && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs text-sky-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>District Nodal Officer (DNO) Supervision</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-200/70 text-sky-800">
                      {currentUser?.district || 'Washim'} District
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Live operational metrics scoped exclusively to <strong>{currentUser?.district || 'Washim'}</strong> facilitation centers and counselors.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white border border-sky-200 rounded-xl text-xs font-bold text-sky-700 shadow-2xs">
                  {students.length} Candidates &bull; {tickets.length} Tickets
                </span>
                {onOpenBroadcastModal && (
                  <button
                    type="button"
                    onClick={onOpenBroadcastModal}
                    className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-2xs transition-all cursor-pointer border border-amber-600 active:scale-95 flex items-center gap-1.5"
                    title="Broadcast announcement to counsellors & supporting staff"
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse text-slate-950" />
                    <span>Broadcast Notice</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats Bar - Strictly only allotted stats */}
          {quickStats.length > 0 && (
            <div className={`grid grid-cols-2 ${quickStats.length > 2 ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3 sm:gap-4`}>
              {quickStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="bg-white border border-[#D9E1EA] rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs hover:border-[#006BB6] hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out group cursor-default"
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${stat.color} group-hover:scale-105 transition-transform duration-200`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#4B5563] font-medium truncate">{stat.label}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg sm:text-xl font-bold text-[#1F2937] font-mono group-hover:text-[#0056A6] transition-colors">{stat.value}</span>
                        <span className="text-[11px] text-[#4B5563] font-medium truncate">{stat.change}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Facilitation Center Tools & Utilities Section in Dashboard */}
          {facilitationTools.length > 0 && (
            <div className="bg-white border border-[#D9E1EA] rounded-2xl p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">Facilitation Desk Tools</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF4FB] text-[#0056A6] border border-[#0056A6]/15">
                    {facilitationTools.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">Quick Access</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {facilitationTools.map((tool) => (
                  <button
                    key={tool.id}
                    id={tool.id}
                    type="button"
                    onClick={tool.onClick}
                    className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-[#0056A6]/50 rounded-xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center gap-2.5 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] w-full"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 group-hover:bg-[#EAF4FB]/70 border border-slate-100 group-hover:border-[#0056A6]/20 p-2 flex items-center justify-center shrink-0 transition-colors duration-150">
                      <img
                        src={tool.imageSrc}
                        alt={tool.title}
                        className="w-full h-full object-contain filter drop-shadow-2xs group-hover:scale-105 transition-transform duration-150"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-800 group-hover:text-[#0056A6] transition-colors leading-tight text-center">
                      {tool.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User Recent Activity Section - Directly below Tools */}
          <div className="bg-white border border-[#D9E1EA] hover:border-[#B4C6D8] rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 ease-out">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#D9E1EA]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#003B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-[#1F2937]">User Recent Activity</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF4FB] text-[#0056A6] border border-[#0056A6]/20">
                      {filteredActivities.length} {filteredActivities.length === 1 ? 'Action' : 'Actions'}
                    </span>

                    {/* Live Mode Toggle */}
                    <div className="flex items-center gap-1.5 ml-0.5">
                      <button
                        type="button"
                        onClick={() => setIsLiveMode((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                          isLiveMode
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={
                          isLiveMode
                            ? 'Live Mode active: auto-fetching new log entries every 30 seconds. Click to turn off.'
                            : 'Live Mode is OFF. Click to enable automatic 30s updates.'
                        }
                      >
                        <span className="relative flex h-2 w-2">
                          {isLiveMode && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              isLiveMode ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          ></span>
                        </span>
                        <span>{isLiveMode ? 'Live Mode: ON (30s)' : 'Live Mode: OFF'}</span>
                      </button>

                      {/* Manual fetch button */}
                      <button
                        type="button"
                        onClick={fetchLatestLogs}
                        disabled={isRefreshing}
                        className={`p-1 rounded-lg text-slate-500 hover:text-[#0056A6] hover:bg-[#EAF4FB] transition-all cursor-pointer ${
                          isRefreshing ? 'animate-spin text-[#0056A6]' : ''
                        }`}
                        title="Fetch latest entries immediately"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    {isLiveMode
                      ? `Live Mode active — auto-refreshing log entries every 30s (last sync at ${lastRefreshedAt.toLocaleTimeString(
                          [],
                          { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                        )})`
                      : 'Real-time activity log of your tickets, candidate verifications, and visitor interactions.'}
                  </p>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActivityFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    activityFilter === 'all'
                      ? 'bg-[#0056A6] text-white'
                      : 'bg-[#F7F9FC] text-[#4B5563] hover:bg-[#EAF4FB] hover:text-[#0056A6]'
                  }`}
                >
                  All ({allUserActivities.length})
                </button>

                {ticketActivities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivityFilter('ticket')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                      activityFilter === 'ticket'
                        ? 'bg-[#0056A6] text-white'
                        : 'bg-[#F7F9FC] text-[#4B5563] hover:bg-[#EAF4FB] hover:text-[#0056A6]'
                    }`}
                  >
                    <Ticket className="w-3 h-3" />
                    <span>Tickets ({ticketActivities.length})</span>
                  </button>
                )}

                {studentActivities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivityFilter('student')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                      activityFilter === 'student'
                        ? 'bg-[#0056A6] text-white'
                        : 'bg-[#F7F9FC] text-[#4B5563] hover:bg-[#EAF4FB] hover:text-[#0056A6]'
                    }`}
                  >
                    <GraduationCap className="w-3 h-3" />
                    <span>Candidates ({studentActivities.length})</span>
                  </button>
                )}

                {visitorActivities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivityFilter('visitor')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                      activityFilter === 'visitor'
                        ? 'bg-[#0056A6] text-white'
                        : 'bg-[#F7F9FC] text-[#4B5563] hover:bg-[#EAF4FB] hover:text-[#0056A6]'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Visitors ({visitorActivities.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar & Date Picker Filter Controls */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 mb-4 p-2.5 rounded-xl bg-[#F7F9FC] border border-[#D9E1EA]">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setMaxVisibleCount(6);
                  }}
                  placeholder="Search activities by candidate name, ticket no, ID, course..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-[#D9E1EA] rounded-lg focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/15 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filters & Specific Day Picker */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Preset Days / Weeks Selector */}
                <div className="inline-flex rounded-lg bg-white p-0.5 border border-[#D9E1EA] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDateRangeMode('all');
                      setSelectedSpecificDate('');
                      setMaxVisibleCount(6);
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                      dateRangeMode === 'all' && !selectedSpecificDate
                        ? 'bg-[#0056A6] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#0056A6]'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRangeMode('today');
                      setSelectedSpecificDate('');
                      setMaxVisibleCount(6);
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                      dateRangeMode === 'today' && !selectedSpecificDate
                        ? 'bg-[#0056A6] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#0056A6]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRangeMode('week');
                      setSelectedSpecificDate('');
                      setMaxVisibleCount(6);
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                      dateRangeMode === 'week' && !selectedSpecificDate
                        ? 'bg-[#0056A6] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#0056A6]'
                    }`}
                  >
                    This Week
                  </button>
                </div>

                {/* Specific Day Picker with Calendar Icon */}
                <div className="flex items-center gap-1.5 bg-white border border-[#D9E1EA] rounded-lg px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#0056A6] shrink-0" />
                  <input
                    type="date"
                    value={selectedSpecificDate}
                    onChange={(e) => {
                      setSelectedSpecificDate(e.target.value);
                      setDateRangeMode('custom');
                      setMaxVisibleCount(6);
                    }}
                    className="text-[11px] text-slate-800 font-medium bg-transparent outline-none cursor-pointer"
                    title="Select specific date"
                  />
                  {selectedSpecificDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpecificDate('');
                        setDateRangeMode('all');
                      }}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
                      title="Clear date"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Reset button when any filter or query is active */}
                {(searchQuery || selectedSpecificDate || dateRangeMode !== 'all' || activityFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSpecificDate('');
                      setDateRangeMode('all');
                      setActivityFilter('all');
                      setMaxVisibleCount(6);
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer shrink-0"
                    title="Reset date & search filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Activity List */}
            {filteredActivities.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl bg-[#F7F9FC] border border-dashed border-[#D9E1EA]">
                <Clock className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {searchQuery || selectedSpecificDate || dateRangeMode !== 'all'
                    ? 'No matching activities found'
                    : 'No recent activity recorded yet'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || selectedSpecificDate || dateRangeMode !== 'all'
                    ? 'Try clearing the search query or adjusting the date filter to view other activity records.'
                    : 'Actions performed using the tools above (like generating SAC tickets or logging visitors) will appear here in chronological order.'}
                </p>
                {(searchQuery || selectedSpecificDate || dateRangeMode !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSpecificDate('');
                      setDateRangeMode('all');
                    }}
                    className="mt-3 px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#D9E1EA] text-[#0056A6] hover:bg-[#EAF4FB] transition-colors cursor-pointer"
                  >
                    Clear Search & Date Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredActivities.slice(0, maxVisibleCount).map((activity) => (
                  <div
                    key={activity.id}
                    className="group p-3 rounded-xl bg-[#F7F9FC] hover:bg-[#F0F5FA] border border-[#D9E1EA] hover:border-[#0056A6]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {/* Type Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          activity.type === 'ticket'
                            ? 'bg-sky-50 text-[#0056A6] border-sky-200'
                            : activity.type === 'student'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {activity.type === 'ticket' ? (
                          <Ticket className="w-4 h-4" />
                        ) : activity.type === 'student' ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </div>

                      {/* Title & Details */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#1F2937] truncate">
                            {activity.title}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#003B73] px-1.5 py-0.5 rounded bg-white border border-[#D9E1EA]">
                            {activity.meta}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${activity.statusColor}`}>
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4B5563] truncate mt-0.5">
                          {activity.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Right Side: Timestamp & Quick Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#D9E1EA]/60">
                      <span className="text-[11px] text-[#6B7280] flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{activity.relativeTime}</span>
                      </span>

                      {/* Quick Action Button */}
                      {activity.type === 'ticket' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenTicketWithData) {
                              onOpenTicketWithData({
                                editingTicketId: activity.data.id,
                                ticketNo: activity.data.ticketNo,
                                cetNo: activity.data.cetNo,
                                capId: activity.data.capId,
                                candidateName: activity.data.candidateName,
                                dob: activity.data.dob,
                                mobile: activity.data.mobile,
                                email: activity.data.email,
                                course: activity.data.course,
                                query: activity.data.query,
                                status: activity.data.status,
                                createdBy: activity.data.createdBy,
                                creatorName: activity.data.creatorName,
                                creatorRole: activity.data.creatorRole,
                                district: activity.data.district,
                                createdAt: activity.data.createdAt,
                              });
                            } else if (onOpenTicketTool) {
                              onOpenTicketTool();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#EAF4FB] hover:bg-[#0056A6] text-[#0056A6] hover:text-white border border-[#0056A6]/20 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                          title="Edit ticket in SAC Ticket Generator"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit in SAC</span>
                        </button>
                      )}

                      {activity.type === 'student' && hasStudentAccess && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('students')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-[#EAF4FB] text-[#0056A6] border border-[#D9E1EA] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}

                      {activity.type === 'visitor' && hasVisitorAccess && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('visitors')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-[#EAF4FB] text-[#0056A6] border border-[#D9E1EA] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Show more or View directory pagination bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {filteredActivities.length > maxVisibleCount ? (
                    <button
                      type="button"
                      onClick={() => setMaxVisibleCount((prev) => prev + 10)}
                      className="px-3 py-1 rounded-lg bg-[#EAF4FB] hover:bg-[#0056A6] text-[#0056A6] hover:text-white font-bold transition-all cursor-pointer"
                    >
                      Show more ({filteredActivities.length - maxVisibleCount} remaining)
                    </button>
                  ) : filteredActivities.length > 6 ? (
                    <button
                      type="button"
                      onClick={() => setMaxVisibleCount(6)}
                      className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                    >
                      Collapse list
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => {
                      if (activityFilter === 'ticket' || hasTicketAccess) {
                        onNavigateTab('tickets');
                      } else if (activityFilter === 'student' && hasStudentAccess) {
                        onNavigateTab('students');
                      } else if (activityFilter === 'visitor' && hasVisitorAccess) {
                        onNavigateTab('visitors');
                      } else {
                        onNavigateTab('tickets');
                      }
                    }}
                    className="font-bold text-[#0056A6] hover:text-[#003B73] inline-flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <span>View in Directory</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Scrutiny Summary - Only if candidate access is allotted */}
          {hasStudentAccess && (
            <div className="bg-white border border-[#D9E1EA] hover:border-[#B4C6D8] rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 ease-out">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#D9E1EA]">
                <h3 className="text-xs sm:text-sm font-bold text-[#1F2937]">Recent Candidate Scrutiny Activity</h3>
                {hasTabPermission(currentUser, 'students') && (
                  <button
                    onClick={() => onNavigateTab('students')}
                    className="text-xs font-bold text-[#0056A6] hover:text-[#003B73] flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Full Directory</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {recentStudents.length === 0 ? (
                <div className="p-6 text-center text-[#6B7280] text-xs">
                  <p>No candidates currently logged in the active queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#4B5563] border-b border-[#D9E1EA] bg-[#F7F9FC]">
                        <th className="py-2.5 px-3 font-bold">Application ID</th>
                        <th className="py-2.5 px-3 font-bold">Candidate Name</th>
                        <th className="py-2.5 px-3 font-bold">Course</th>
                        <th className="py-2.5 px-3 font-bold">Status</th>
                        <th className="py-2.5 px-3 font-bold">Remarks</th>
                        <th className="py-2.5 px-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E1EA]">
                      {recentStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-[#F7F9FC] transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#003B73]">{st.id}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#1F2937]">{st.name}</td>
                          <td className="py-2.5 px-3 text-[#4B5563]">{st.course}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                st.status === 'Verified'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : st.status === 'Objection Raised'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {st.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#6B7280] truncate max-w-xs">{st.remarks}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canWhatsapp && (
                                <button
                                  onClick={onOpenWhatsappTool}
                                  title="Send WhatsApp Notice"
                                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canTicket && (
                                <button
                                  onClick={onOpenTicketTool}
                                  title="Generate Candidate Grievance Ticket"
                                  className="p-1.5 rounded-lg text-[#0056A6] hover:bg-[#EAF4FB] border border-[#D9E1EA] cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side Live Notice Bar Column (Pinned Latest Notice on top + Smooth Scrolling All Notices) */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-0">
          <DashboardNoticeBar />
        </div>
      </div>
    </div>
  );
};
