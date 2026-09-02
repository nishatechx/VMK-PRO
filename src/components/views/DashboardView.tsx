import React from 'react';
import {
  MessageCircle,
  QrCode,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  FileSpreadsheet,
  GraduationCap,
  Settings,
  UserCircle,
  Lock,
  Sparkles,
  Info,
  Building2,
  ExternalLink,
  Ticket,
} from 'lucide-react';
import {
  getStudentRecords,
  getVisitorRecords,
  hasTabPermission,
  hasFeaturePermission,
} from '../../services/authService';
import { getTicketRecords } from '../../services/ticketService';
import { UserProfile } from '../../types/auth';

interface DashboardViewProps {
  onOpenWhatsappTool: () => void;
  onOpenQrTool: () => void;
  onOpenTicketTool: () => void;
  onNavigateTab: (tab: any) => void;
  currentUser?: UserProfile | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWhatsappTool,
  onOpenQrTool,
  onOpenTicketTool,
  onNavigateTab,
  currentUser,
}) => {
  const students = getStudentRecords();
  const visitors = getVisitorRecords();
  const tickets = getTicketRecords();

  const verifiedCount = students.filter((s) => s.status === 'Verified').length;
  const objectionCount = students.filter((s) => s.status === 'Objection Raised').length;
  const inCenterVisitors = visitors.filter((v) => v.status === 'In Premises').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;

  const quickStats = [
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
    },
    {
      label: 'Visitors Today',
      value: `${visitors.length}`,
      change: inCenterVisitors > 0 ? `${inCenterVisitors} in center` : 'All checked out',
      icon: UserCheck,
      color: 'text-[#0056A6] bg-[#EAF4FB] border-[#D9E1EA]',
    },
    {
      label: 'Counsellor Tickets',
      value: `${tickets.length}`,
      change: openTicketsCount > 0 ? `${openTicketsCount} active/pending` : 'All resolved',
      icon: Ticket,
      color: 'text-[#003B73] bg-[#EAF4FB] border-[#D9E1EA]',
    },
  ];

  const recentStudents = students.slice(0, 5);

  const canWhatsapp = hasFeaturePermission(currentUser, 'whatsapp_tool');
  const canQr = hasFeaturePermission(currentUser, 'qr_upload_tool');
  const canTicket = hasFeaturePermission(currentUser, 'ticket_generator_tool');
  const canAddCandidate = hasFeaturePermission(currentUser, 'add_candidate');
  const canAddVisitor = hasFeaturePermission(currentUser, 'add_visitor');
  const isDnoAdmin = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';

  // Core Dashboard Cards - STRICTLY shown only if tool/feature access is explicitly given to current user
  const authorizedCards: Array<{
    id: string;
    title: string;
    description: string;
    icon: any;
    iconBg: string;
    btnText: string;
    btnColor: string;
    badge?: string;
    badgeColor?: string;
    isProtected?: boolean;
    onClick: () => void;
  }> = [];

  // 1. WhatsApp Ticket Tool
  if (canWhatsapp) {
    authorizedCards.push({
      id: 'whatsapp_tool_card',
      title: 'WhatsApp Notice Dispatcher',
      description: 'Generate and send instant WhatsApp verification notices, document discrepancy alerts, and candidate slips.',
      icon: MessageCircle,
      iconBg: 'bg-[#198754]/10 text-[#198754] border-[#198754]/30',
      btnText: 'Open WhatsApp Tool',
      btnColor: 'bg-[#198754] hover:bg-[#146c43] text-white',
      badge: 'Active Tool',
      badgeColor: 'bg-[#198754]/10 text-[#198754] border-[#198754]/30',
      onClick: onOpenWhatsappTool,
    });
  }

  // 2. Upload by Mobile QR Scanner Tool
  if (canQr) {
    authorizedCards.push({
      id: 'qr_tool_card',
      title: 'Upload by Mobile QR Code',
      description: 'Camera QR sync for instant mobile document photo upload directly into the physical scrutiny desk.',
      icon: QrCode,
      iconBg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
      btnText: 'Open QR Scanner Tool',
      btnColor: 'bg-[#F59E0B] hover:bg-[#D97706] text-white',
      badge: 'Active Tool',
      badgeColor: 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30',
      onClick: onOpenQrTool,
    });
  }

  // 3. Candidate Grievance / Query Ticket Desk Tool
  if (canTicket) {
    authorizedCards.push({
      id: 'ticket_tool_card',
      title: 'Candidate Grievance Ticket Desk',
      description: 'Generate formatted grievance tickets and official candidate query notes with the 8 mandatory CET/CAP fields.',
      icon: FileText,
      iconBg: 'bg-[#EAF4FB] text-[#006BB6] border-[#D9E1EA]',
      btnText: 'Open Ticket Desk Tool',
      btnColor: 'bg-[#006BB6] hover:bg-[#0056A6] text-white',
      badge: 'Active Tool',
      badgeColor: 'bg-[#EAF4FB] text-[#006BB6] border-[#D9E1EA]',
      onClick: onOpenTicketTool,
    });
  }

  // 4. Counsellor Tickets Database Register (If tickets permission is given)
  if (hasTabPermission(currentUser, 'tickets') || canTicket || canWhatsapp) {
    authorizedCards.push({
      id: 'counsellor_tickets_card',
      title: 'Counsellor Tickets Database',
      description: 'Manage candidate grievance tickets, inquiry notes & WhatsApp notices created by counsellors.',
      icon: Ticket,
      iconBg: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      btnText: 'Open Tickets Tab',
      btnColor: 'bg-[#003B73] hover:bg-[#002850] text-white',
      badge: `${tickets.length} Tickets`,
      badgeColor: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      onClick: () => onNavigateTab('tickets'),
    });
  }

  // 5. Visitors Entry Register (If visitor permission is given)
  if (hasTabPermission(currentUser, 'visitors') || canAddVisitor) {
    authorizedCards.push({
      id: 'visitors_register_card',
      title: 'Visitors Entry Register',
      description: 'Record visitor entry form, generate auto Sr No, log timestamps & manage check-in/out records.',
      icon: UserCheck,
      iconBg: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      btnText: 'Open Visitors Tab',
      btnColor: 'bg-[#0056A6] hover:bg-[#003B73] text-white',
      badge: `${visitors.length} Visitors`,
      badgeColor: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      onClick: () => onNavigateTab('visitors'),
    });
  }

  // 5. Students & Scrutiny Directory (If candidate access is given)
  if (hasTabPermission(currentUser, 'students') || canAddCandidate) {
    authorizedCards.push({
      id: 'students_directory_card',
      title: 'Students & Scrutiny Directory',
      description: 'Candidate CET application records, document verification statuses & scrutiny logs.',
      icon: GraduationCap,
      iconBg: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      btnText: 'Open Students Tab',
      btnColor: 'bg-[#0056A6] hover:bg-[#003B73] text-white',
      badge: `${students.length} Registered`,
      badgeColor: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      onClick: () => onNavigateTab('students'),
    });
  }

  // 6. Google Sheets Cloud Sync (DNO Admin Only)
  if (hasTabPermission(currentUser, 'google_sheets') && isDnoAdmin) {
    authorizedCards.push({
      id: 'sheets_sync_card',
      title: 'Google Sheets Cloud Sync',
      description: 'Real-time two-way synchronization to Google Drive spreadsheets & CSV export.',
      icon: FileSpreadsheet,
      iconBg: 'bg-[#198754]/10 text-[#198754] border-[#198754]/30',
      btnText: 'Access Google Sheets',
      btnColor: 'bg-[#198754] hover:bg-[#146c43] text-white',
      badge: 'DNO Protected',
      badgeColor: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30 font-mono',
      isProtected: true,
      onClick: () => onNavigateTab('google_sheets'),
    });
  }

  // 7. Staff & User Management (DNO Admin Only)
  if (hasTabPermission(currentUser, 'user_management') && isDnoAdmin) {
    authorizedCards.push({
      id: 'user_mgmt_card',
      title: 'Staff & User Management',
      description: 'Create & manage staff profiles, role assignments, and tab rule permissions.',
      icon: ShieldCheck,
      iconBg: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      btnText: 'Open User Management',
      btnColor: 'bg-[#003B73] hover:bg-[#002850] text-white',
      badge: 'Admin Access',
      badgeColor: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      onClick: () => onNavigateTab('user_management'),
    });
  }

  return (
    <div className="relative z-10 w-full space-y-6 pb-6">
      {/* Portal Masthead Card */}
      <div className="bg-gradient-to-r from-[#003B73] via-[#0056A6] to-[#006BB6] rounded-2xl md:rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden border border-[#002850]">
        <div className="absolute right-0 top-0 w-96 h-full bg-radial from-[#006BB6]/40 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome, {currentUser?.fullName || currentUser?.username || 'Authorized User'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              Candidate scrutiny directory, visitor management registry, and verification toolkit.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
            {hasTabPermission(currentUser, 'visitors') && canAddVisitor && (
              <button
                onClick={() => onNavigateTab('visitors')}
                className="px-4 py-2.5 bg-white text-[#003B73] hover:bg-[#EAF4FB] active:scale-95 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#0056A6]" />
                <span>+ Log Visitor</span>
              </button>
            )}
            {canTicket && (
              <button
                onClick={onOpenTicketTool}
                className="px-4 py-2.5 bg-[#002850] hover:bg-[#001D3D] border border-white/20 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-300" />
                <span>Ticket Desk</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Website-Grade KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white border border-[#D9E1EA] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-[#006BB6] transition-all"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#4B5563] font-medium truncate">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#1F2937] font-mono">{stat.value}</span>
                  <span className="text-[11px] text-[#4B5563] font-medium truncate">{stat.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Authorized Tool Cards Section - STRICTLY contains only cards for tools granted to the user */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0056A6]" />
            <h2 className="text-sm sm:text-base font-bold text-[#1F2937] tracking-tight uppercase">
              Authorized Tools & Workspace Access
            </h2>
          </div>
          <span className="text-xs text-[#6B7280] font-medium">
            Showing {authorizedCards.length} authorized {authorizedCards.length === 1 ? 'module' : 'modules'}
          </span>
        </div>

        {authorizedCards.length === 0 ? (
          <div className="bg-white border border-[#D9E1EA] rounded-2xl p-8 text-center shadow-xs">
            <Info className="w-8 h-8 text-[#0056A6] mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-[#1F2937]">No Tools Currently Assigned</h3>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1">
              Your operator account has not been assigned interactive tool permissions. Please contact the DNO Administrator to grant tool access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {authorizedCards.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  className="bg-white border border-[#D9E1EA] hover:border-[#0056A6] rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md shadow-xs group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${feat.iconBg} group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {feat.badge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${feat.badgeColor}`}>
                          {feat.isProtected && <Lock className="w-3 h-3 text-amber-700" />}
                          <span>{feat.badge}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[#1F2937] mb-1.5 group-hover:text-[#0056A6] transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-[#4B5563] leading-relaxed mb-5">
                      {feat.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={feat.onClick}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs ${feat.btnColor} active:scale-[0.98] cursor-pointer`}
                  >
                    <span>{feat.btnText}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Candidate Scrutiny Summary */}
      <div className="bg-white border border-[#D9E1EA] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9E1EA]">
          <div>
            <h3 className="text-sm font-bold text-[#1F2937]">Recent Candidate Scrutiny Activity</h3>
            <p className="text-xs text-[#6B7280]">Live verification registry</p>
          </div>
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
          <div className="p-8 text-center text-[#6B7280] text-xs">
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
                    <td className="py-3 px-3 font-mono font-bold text-[#003B73]">{st.id}</td>
                    <td className="py-3 px-3 font-semibold text-[#1F2937]">{st.name}</td>
                    <td className="py-3 px-3 text-[#4B5563]">{st.course}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
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
                    <td className="py-3 px-3 text-[#6B7280] truncate max-w-xs">{st.remarks}</td>
                    <td className="py-3 px-3 text-right">
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
    </div>
  );
};
