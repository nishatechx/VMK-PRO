import React, { useMemo, useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Ticket,
  Activity,
  Clock,
  Search,
  Calendar,
  X,
  RefreshCw,
  Radio,
  Download,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Image as ImageIcon,
  ExternalLink,
  Edit3,
  Plus,
} from 'lucide-react';
import {
  getStudentRecords,
  getVisitorRecords,
  subscribeToStudents,
  subscribeToVisitors,
} from '../../services/authService';
import { getTicketRecords, subscribeToTickets } from '../../services/ticketService';
import { UserProfile, StudentRecord, VisitorRecord, TicketRecord } from '../../types/auth';
import {
  DashboardBannerConfig,
  getDashboardBannerConfig,
  subscribeToDashboardBanner,
} from '../../services/dashboardBannerService';
import { DashboardBannerModal } from '../superadmin/DashboardBannerModal';

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
  onNavigateTab,
  onOpenBroadcastModal,
  currentUser,
}) => {
  const [allStudents, setAllStudents] = useState<StudentRecord[]>(() => getStudentRecords());
  const [allVisitors, setAllVisitors] = useState<VisitorRecord[]>(() => getVisitorRecords());
  const [allTickets, setAllTickets] = useState<TicketRecord[]>(() => getTicketRecords());

  // Filter and pagination states
  const [activityFilter, setActivityFilter] = useState<'all' | 'visitor' | 'student' | 'ticket'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Live Auto-Refresh State
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [selectedActivityRecord, setSelectedActivityRecord] = useState<any | null>(null);

  const fetchLatestLogs = () => {
    setIsRefreshing(true);
    setAllStudents(getStudentRecords());
    setAllVisitors(getVisitorRecords());
    setAllTickets(getTicketRecords());
    setLastRefreshedAt(new Date());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Custom Dashboard Announcement Banner State (Super Admin Configurable by URL)
  const [bannerConfig, setBannerConfig] = useState<DashboardBannerConfig>(() => getDashboardBannerConfig());
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);

  const isSuperAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.username?.toLowerCase() === 'shrinath';

  useEffect(() => {
    const unsubTickets = subscribeToTickets((data) => setAllTickets(data));
    const unsubStudents = subscribeToStudents((data) => setAllStudents(data));
    const unsubVisitors = subscribeToVisitors((data) => setAllVisitors(data));
    const unsubBanner = subscribeToDashboardBanner((cfg) => setBannerConfig(cfg));

    return () => {
      unsubTickets();
      unsubStudents();
      unsubVisitors();
      unsubBanner();
    };
  }, []);

  // Live Mode: automatically refresh logs every 30 seconds
  useEffect(() => {
    if (!isLiveMode) return;
    const intervalId = setInterval(() => {
      fetchLatestLogs();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [isLiveMode]);

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

  // Live KPI Metric Calculations
  const verifiedCount = useMemo(() => {
    return students.filter((s) => s.status === 'Verified').length;
  }, [students]);

  const pendingCount = useMemo(() => {
    return students.filter((s) => s.status === 'Pending' || s.status === 'Objection Raised').length;
  }, [students]);

  const todayVisitorsCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = visitors.filter((v) => {
      const vDate = getActivityDateKey(v.checkInTime, v.createdAt);
      return vDate === today || v.status === 'In Premises';
    });
    return todayVisitors.length > 0 ? todayVisitors.length : visitors.filter((v) => v.status === 'In Premises').length;
  }, [visitors]);

  const openTicketsCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;
  }, [tickets]);

  // Aggregate user activities
  const allUserActivities = useMemo(() => {
    const combined: Array<{
      id: string;
      rawId: string;
      title: string;
      type: 'visitor' | 'student' | 'ticket';
      category: string;
      status: string;
      location?: string;
      timestamp: string;
      rawTimestamp: number;
      assignedTo?: string;
      rawRecord: any;
    }> = [];

    students.forEach((s) => {
      combined.push({
        id: `std-${s.id}`,
        rawId: s.id,
        title: s.candidateName,
        type: 'student',
        category: s.course || 'Candidate Verification',
        status: s.status,
        location: s.district || 'Washim Center',
        timestamp: s.createdAt,
        rawTimestamp: new Date(s.createdAt).getTime() || 0,
        assignedTo: s.scrutinyOfficer || s.createdBy || 'Scrutiny Desk',
        rawRecord: s,
      });
    });

    visitors.forEach((v) => {
      combined.push({
        id: `vis-${v.id}`,
        rawId: v.id,
        title: v.fullName,
        type: 'visitor',
        category: v.purpose || 'Inquiry / Scrutiny',
        status: v.status,
        location: v.district || 'Reception Desk',
        timestamp: v.checkInTime || new Date(v.createdAt).toISOString(),
        rawTimestamp: v.createdAt || 0,
        assignedTo: v.assignedStaff || v.createdBy || 'Reception Desk',
        rawRecord: v,
      });
    });

    tickets.forEach((t) => {
      combined.push({
        id: `tkt-${t.id}`,
        rawId: t.id,
        title: t.candidateName,
        type: 'ticket',
        category: t.course || t.subject || 'Ticket Inquiry',
        status: t.status,
        location: t.district || 'Counsellor Desk',
        timestamp: t.createdAt,
        rawTimestamp: new Date(t.createdAt).getTime() || 0,
        assignedTo: t.creatorName || t.createdBy || 'Counsellor',
        rawRecord: t,
      });
    });

    return combined.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  }, [students, visitors, tickets]);

  // Filter activities by search, type, date
  const filteredActivities = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return allUserActivities.filter((act) => {
      // Type filter
      if (activityFilter === 'visitor' && act.type !== 'visitor') return false;
      if (activityFilter === 'student' && act.type !== 'student') return false;
      if (activityFilter === 'ticket' && act.type !== 'ticket') return false;

      // Date range filter
      const actDateStr = getActivityDateKey(act.timestamp, act.rawTimestamp);
      if (dateRangeMode === 'today') {
        if (actDateStr !== todayStr) return false;
      } else if (dateRangeMode === 'week') {
        const actTime = act.rawTimestamp || (act.timestamp ? new Date(act.timestamp).getTime() : 0);
        if (actTime < oneWeekAgo.getTime()) return false;
      } else if (dateRangeMode === 'custom' && selectedSpecificDate) {
        if (actDateStr !== selectedSpecificDate) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(q);
        const matchesCategory = act.category.toLowerCase().includes(q);
        const matchesStatus = act.status.toLowerCase().includes(q);
        const matchesOfficer = act.assignedTo?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCategory && !matchesStatus && !matchesOfficer) {
          return false;
        }
      }

      return true;
    });
  }, [allUserActivities, activityFilter, dateRangeMode, selectedSpecificDate, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, currentPage, pageSize]);

  // Export activity data to CSV
  const handleExportActivityCsv = () => {
    const headers = ['Type', 'Name', 'Category / Purpose', 'Status', 'Assigned / Officer', 'Timestamp', 'Location'];
    const rows = filteredActivities.map((act) => [
      act.type.toUpperCase(),
      `"${act.title.replace(/"/g, '""')}"`,
      `"${act.category.replace(/"/g, '""')}"`,
      act.status,
      `"${(act.assignedTo || '').replace(/"/g, '""')}"`,
      act.timestamp,
      `"${(act.location || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `center_activity_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayName = currentUser?.fullName || currentUser?.username || 'Officer';

  return (
    <div className="w-full space-y-5 pb-8 select-none font-sans">
      <div className="w-full space-y-5">
          {/* 1. HORIZONTAL WELCOME BANNER (No Section Borders, No Image Shadow/Overlays, Pure Banner Image) */}
          {bannerConfig.enabled && bannerConfig.imageUrl ? (
            <div className="relative w-full overflow-hidden border-0 shadow-none rounded-none group min-h-[96px] sm:h-[110px] flex items-center justify-between p-4 sm:px-6">
              {/* Pure Banner Image - Zero Shadows, Zero Overlays, Zero Borders */}
              {bannerConfig.linkUrl ? (
                <a
                  href={bannerConfig.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 w-full h-full cursor-pointer z-0 block border-0 shadow-none outline-none"
                  title={bannerConfig.title || 'Official CET Portal'}
                >
                  <img
                    src={bannerConfig.imageUrl}
                    alt={bannerConfig.title || 'Dashboard Banner'}
                    className="w-full h-full object-cover object-center border-0 shadow-none ring-0 outline-none select-none block"
                  />
                </a>
              ) : (
                <img
                  src={bannerConfig.imageUrl}
                  alt={bannerConfig.title || 'Dashboard Banner'}
                  className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none border-0 shadow-none ring-0 outline-none select-none block z-0"
                />
              )}

              {/* Welcome Text Content: Welcome back, {displayName} and below line */}
              <div className="relative z-10 flex flex-col justify-center min-w-0 pr-3 pointer-events-none select-text">
                <h2 className="text-base sm:text-lg font-bold text-[#102544] tracking-tight truncate">
                  Welcome back, {displayName}
                </h2>
                <p className="text-xs text-[#475569] font-medium mt-0.5 truncate">
                  Here's what's happening today.
                </p>
              </div>

              {/* Super Admin subtle hover-only edit trigger */}
              {(isSuperAdmin || isDno) && (
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(true)}
                  className="relative z-20 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-white/90 hover:bg-white text-[#102544] hover:text-[#0866D9] text-[11px] font-semibold cursor-pointer border-0 shadow-none flex items-center gap-1"
                  title="Configure Dashboard Banner Image URL"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit Banner</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full border-0 shadow-none rounded-none bg-transparent py-1 sm:py-2 flex items-center justify-between group">
              {/* Welcome Text Content: Welcome back, {displayName} and below line */}
              <div className="flex flex-col justify-center min-w-0 pr-3">
                <h2 className="text-base sm:text-lg font-bold text-[#102544] tracking-tight truncate">
                  Welcome back, {displayName}
                </h2>
                <p className="text-xs text-[#475569] font-medium mt-0.5 truncate">
                  Here's what's happening today.
                </p>
              </div>

              {/* Super Admin subtle edit trigger */}
              {(isSuperAdmin || isDno) && (
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-xs text-[#62738D] hover:text-[#0866D9] hover:bg-slate-100 cursor-pointer border-0 flex items-center gap-1"
                  title="Add Dashboard Banner Image by URL"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Banner</span>
                </button>
              )}
            </div>
          )}

          {/* District Supervisor Notice for DNO */}
          {isDno && (
            <div className="p-3.5 rounded-xl bg-[#EBF3FC] border border-[#DCE5F0] flex items-center justify-between gap-3 text-xs text-[#102544]">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#073B70] shrink-0" />
                <span className="font-medium">
                  District Nodal Supervision Active &bull; <strong className="text-[#073B70]">{currentUser?.district || 'Washim'} District</strong>
                </span>
              </div>
              {onOpenBroadcastModal && (
                <button
                  type="button"
                  onClick={onOpenBroadcastModal}
                  className="px-2.5 py-1 rounded-lg bg-[#073B70] hover:bg-[#092744] text-white text-[11px] font-semibold cursor-pointer shadow-2xs"
                >
                  Broadcast Notice
                </button>
              )}
            </div>
          )}

          {/* 2. FOUR KPI CARDS IN ONE ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Verified Candidates */}
            <div className="bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:border-[#079669]/50 transition-colors">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-[#62738D]">
                  Verified Candidates
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#079669]/10 text-[#079669] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-bold font-mono text-[#102544]">
                  {verifiedCount}
                </span>
                <span className="text-[11px] font-semibold text-[#079669]">
                  Cleared
                </span>
              </div>
              <p className="text-[11px] text-[#62738D] mt-1 truncate">
                Scrutiny verified
              </p>
            </div>

            {/* KPI 2: Pending Verification */}
            <div className="bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:border-[#D99100]/50 transition-colors">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-[#62738D]">
                  Pending Verification
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#D99100]/10 text-[#D99100] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-bold font-mono text-[#102544]">
                  {pendingCount}
                </span>
                <span className="text-[11px] font-semibold text-[#D99100]">
                  Queue
                </span>
              </div>
              <p className="text-[11px] text-[#62738D] mt-1 truncate">
                Pending or objection
              </p>
            </div>

            {/* KPI 3: Visitors Today */}
            <div className="bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:border-[#0866D9]/50 transition-colors">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-[#62738D]">
                  Visitors Today
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#0866D9]/10 text-[#0866D9] flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-bold font-mono text-[#102544]">
                  {todayVisitorsCount}
                </span>
                <span className="text-[11px] font-semibold text-[#0866D9]">
                  Logged
                </span>
              </div>
              <p className="text-[11px] text-[#62738D] mt-1 truncate">
                Center premises entry
              </p>
            </div>

            {/* KPI 4: Counsellor Tickets */}
            <div className="bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] hover:border-[#073B70]/50 transition-colors">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-[#62738D]">
                  Counsellor Tickets
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#073B70]/10 text-[#073B70] flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl font-bold font-mono text-[#102544]">
                  {openTicketsCount}
                </span>
                <span className="text-[11px] font-semibold text-[#073B70]">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-[#62738D] mt-1 truncate">
                Grievances & inquiries
              </p>
            </div>
          </div>

          {/* 3. RECENT CENTER ACTIVITY TABLE (Immediately beneath KPI cards) */}
          <div className="bg-[#FFFFFF] border border-[#DCE5F0] rounded-2xl shadow-[0_1px_3px_rgba(16,37,68,0.04)] overflow-hidden">
            {/* Header: Title, Live indicator, Refresh, Export */}
            <div className="p-4 sm:p-5 border-b border-[#DCE5F0] flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3FC] text-[#0866D9] flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#102544] tracking-tight">
                      Recent Activity
                    </h3>
                    {isLiveMode && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#079669] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#079669] animate-pulse" />
                        Live Mode
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#62738D]">
                    Last synced {formatRelativeTime(lastRefreshedAt.toISOString())}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLatestLogs}
                  disabled={isRefreshing}
                  className="p-2 rounded-lg text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB] border border-[#DCE5F0] transition-colors cursor-pointer"
                  title="Refresh activity logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0866D9]' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleExportActivityCsv}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F4F7FB] text-[#102544] border border-[#DCE5F0] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Export records to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#62738D]" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar: Activity Type, Search, Time Range, Date Picker */}
            <div className="p-3.5 bg-[#F4F7FB]/70 border-b border-[#DCE5F0] flex flex-wrap items-center justify-between gap-2.5">
              {/* Type Filters */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#DCE5F0]">
                <button
                  type="button"
                  onClick={() => { setActivityFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    activityFilter === 'all'
                      ? 'bg-[#0866D9] text-white shadow-2xs'
                      : 'text-[#62738D] hover:text-[#102544]'
                  }`}
                >
                  All ({allUserActivities.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActivityFilter('visitor'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    activityFilter === 'visitor'
                      ? 'bg-[#0866D9] text-white shadow-2xs'
                      : 'text-[#62738D] hover:text-[#102544]'
                  }`}
                >
                  Visitors ({visitors.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActivityFilter('student'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    activityFilter === 'student'
                      ? 'bg-[#0866D9] text-white shadow-2xs'
                      : 'text-[#62738D] hover:text-[#102544]'
                  }`}
                >
                  Candidates ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActivityFilter('ticket'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    activityFilter === 'ticket'
                      ? 'bg-[#0866D9] text-white shadow-2xs'
                      : 'text-[#62738D] hover:text-[#102544]'
                  }`}
                >
                  Tickets ({tickets.length})
                </button>
              </div>

              {/* Search Field & Time Range */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#62738D] absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search candidate, visitor or query..."
                    className="text-xs pl-8 pr-3 py-1.5 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] placeholder:text-[#62738D] focus:border-[#0866D9] outline-none w-44 sm:w-56"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Range Selectors: All Time / Today / This Week */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#DCE5F0] text-xs">
                  <button
                    type="button"
                    onClick={() => { setDateRangeMode('all'); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      dateRangeMode === 'all' ? 'bg-[#073B70] text-white' : 'text-[#62738D] hover:text-[#102544]'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDateRangeMode('today'); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      dateRangeMode === 'today' ? 'bg-[#073B70] text-white' : 'text-[#62738D] hover:text-[#102544]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDateRangeMode('week'); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      dateRangeMode === 'week' ? 'bg-[#073B70] text-white' : 'text-[#62738D] hover:text-[#102544]'
                    }`}
                  >
                    This Week
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Activity Table */}
            <div className="overflow-x-auto min-h-[280px]">
              {paginatedActivities.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <Activity className="w-8 h-8 text-[#62738D] mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-[#102544]">No activity records found</p>
                  <p className="text-[11px] text-[#62738D]">
                    {searchQuery ? 'Try clearing your search query or filters.' : 'New candidate entries and tickets will appear here live.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE5F0] bg-[#F4F7FB] text-[#62738D] text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Candidate / Visitor</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Purpose / Category</th>
                      <th className="py-2.5 px-3">Officer / Desk</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5F0]">
                    {paginatedActivities.map((act) => {
                      const isVerified = act.status === 'Verified' || act.status === 'Resolved' || act.status === 'Completed';
                      const isPending = act.status === 'Pending' || act.status === 'Open' || act.status === 'In Premises';
                      const isObjection = act.status === 'Objection Raised' || act.status === 'Closed';

                      return (
                        <tr key={act.id} className="hover:bg-[#F4F7FB]/60 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-[#102544]">
                            <div className="flex flex-col">
                              <span>{act.title}</span>
                              <span className="text-[10px] text-[#62738D] font-mono">
                                ID: {act.rawId.slice(0, 10)}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              act.type === 'visitor'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : act.type === 'student'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {act.type}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-[#102544] max-w-[160px] truncate">
                            {act.category}
                          </td>

                          <td className="py-2.5 px-3 text-[#62738D] truncate max-w-[140px]">
                            {act.assignedTo}
                          </td>

                          <td className="py-2.5 px-3 text-[#62738D] whitespace-nowrap">
                            {formatRelativeTime(act.timestamp)}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVerified
                                ? 'bg-[#079669]/10 text-[#079669] border border-[#079669]/20'
                                : isPending
                                ? 'bg-[#0866D9]/10 text-[#0866D9] border border-[#0866D9]/20'
                                : 'bg-[#D99100]/10 text-[#D99100] border border-[#D99100]/20'
                            }`}>
                              {act.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedActivityRecord(act)}
                              className="px-2.5 py-1 rounded-md bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0] hover:border-[#0866D9]/40 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="View full record details"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredActivities.length > 0 && (
              <div className="p-3.5 bg-white border-t border-[#DCE5F0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#62738D]">
                <div className="flex items-center gap-2">
                  <span>
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredActivities.length)} of {filteredActivities.length}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="ml-2 text-xs py-1 px-2 border border-[#DCE5F0] rounded-md bg-white text-[#102544]"
                  >
                    <option value={6}>6 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-[#DCE5F0] bg-white text-[#102544] disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="font-semibold text-[#102544] px-2">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-[#DCE5F0] bg-white text-[#102544] disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Record Quick View Drawer/Modal */}
      {selectedActivityRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-lg w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FC] text-[#0866D9] uppercase">
                  {selectedActivityRecord.type}
                </span>
                <h3 className="font-bold text-sm text-[#102544] truncate">
                  {selectedActivityRecord.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivityRecord(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#62738D]">Category / Purpose:</span>
                  <span className="font-semibold text-[#102544]">{selectedActivityRecord.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#62738D]">Status:</span>
                  <span className="font-bold text-[#0866D9]">{selectedActivityRecord.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#62738D]">Assigned / Desk:</span>
                  <span className="text-[#102544]">{selectedActivityRecord.assignedTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#62738D]">Timestamp:</span>
                  <span className="font-mono text-[#62738D]">{selectedActivityRecord.timestamp}</span>
                </div>
              </div>

              {selectedActivityRecord.type === 'student' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActivityRecord(null);
                    onNavigateTab('candidates');
                  }}
                  className="w-full py-2 rounded-xl bg-[#0866D9] text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open in Candidates Directory</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}

              {selectedActivityRecord.type === 'ticket' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActivityRecord(null);
                    onNavigateTab('tickets');
                  }}
                  className="w-full py-2 rounded-xl bg-[#073B70] text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open in Tickets Desk</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedActivityRecord(null)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Announcement Banner Super Admin Modal */}
      <DashboardBannerModal
        isOpen={isBannerModalOpen}
        onClose={() => setIsBannerModalOpen(false)}
        currentUserUsername={currentUser?.username}
        onBannerSaved={(newCfg) => setBannerConfig(newCfg)}
      />
    </div>
  );
};
