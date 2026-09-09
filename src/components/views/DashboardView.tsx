import React from 'react';
import {
  MessageCircle,
  QrCode,
  FileText,
  FileImage,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  Info,
  Ticket,
  Settings,
  UserCircle,
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
  onOpenImgToPdfTool?: () => void;
  onNavigateTab: (tab: any) => void;
  currentUser?: UserProfile | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWhatsappTool,
  onOpenQrTool,
  onOpenTicketTool,
  onOpenImgToPdfTool,
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

  const canWhatsapp = hasFeaturePermission(currentUser, 'whatsapp_tool');
  const canQr = hasFeaturePermission(currentUser, 'qr_upload_tool');
  const canTicket = hasFeaturePermission(currentUser, 'ticket_generator_tool');
  const canImgToPdf = hasFeaturePermission(currentUser, 'img_to_pdf_tool');
  const canAddCandidate = hasFeaturePermission(currentUser, 'add_candidate');
  const canAddVisitor = hasFeaturePermission(currentUser, 'add_visitor');
  const isDnoAdmin = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';

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

  // Core Dashboard Cards in Minimal Design - STRICTLY only for tools/modules allotted to the user
  const authorizedCards: Array<{
    id: string;
    title: string;
    icon: any;
    iconBg: string;
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
      icon: MessageCircle,
      iconBg: 'bg-[#198754]/10 text-[#198754] border-[#198754]/30',
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
      icon: QrCode,
      iconBg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
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
      icon: FileText,
      iconBg: 'bg-[#EAF4FB] text-[#006BB6] border-[#D9E1EA]',
      badge: 'Active Tool',
      badgeColor: 'bg-[#EAF4FB] text-[#006BB6] border-[#D9E1EA]',
      onClick: onOpenTicketTool,
    });
  }

  // 4. Image to PDF Converter Tool
  if (canImgToPdf) {
    authorizedCards.push({
      id: 'img_to_pdf_tool_card',
      title: 'Image to PDF',
      icon: FileImage,
      iconBg: 'bg-[#0056A6]/10 text-[#0056A6] border-[#0056A6]/30',
      badge: 'Active Tool',
      badgeColor: 'bg-[#0056A6]/10 text-[#0056A6] border-[#0056A6]/30',
      onClick: onOpenImgToPdfTool,
    });
  }

  // 4. Counsellor Tickets Database Register (STRICTLY only if tickets tab is authorized for this user)
  if (hasTabPermission(currentUser, 'tickets')) {
    authorizedCards.push({
      id: 'counsellor_tickets_card',
      title: 'Counsellor Tickets Database',
      icon: Ticket,
      iconBg: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      badge: `${tickets.length} Tickets`,
      badgeColor: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      onClick: () => onNavigateTab('tickets'),
    });
  }

  // 5. Visitors Entry Register (STRICTLY only if visitors tab is authorized for this user)
  if (hasTabPermission(currentUser, 'visitors')) {
    authorizedCards.push({
      id: 'visitors_register_card',
      title: 'Visitors Entry Register',
      icon: UserCheck,
      iconBg: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      badge: `${visitors.length} Visitors`,
      badgeColor: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      onClick: () => onNavigateTab('visitors'),
    });
  }

  // 6. Students & Scrutiny Directory (STRICTLY only if students tab is authorized for this user)
  if (hasTabPermission(currentUser, 'students')) {
    authorizedCards.push({
      id: 'students_directory_card',
      title: 'Students & Scrutiny Directory',
      icon: GraduationCap,
      iconBg: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      badge: `${students.length} Registered`,
      badgeColor: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      onClick: () => onNavigateTab('students'),
    });
  }

  // 7. Google Sheets Cloud Sync (DNO Admin Only and if tab is permitted)
  if (hasTabPermission(currentUser, 'google_sheets') && isDnoAdmin) {
    authorizedCards.push({
      id: 'sheets_sync_card',
      title: 'Google Sheets Cloud Sync',
      icon: FileSpreadsheet,
      iconBg: 'bg-[#198754]/10 text-[#198754] border-[#198754]/30',
      badge: 'DNO Protected',
      badgeColor: 'bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30 font-mono',
      isProtected: true,
      onClick: () => onNavigateTab('google_sheets'),
    });
  }

  // 8. Staff & User Management (DNO Admin Only and if tab is permitted)
  if (hasTabPermission(currentUser, 'user_management') && isDnoAdmin) {
    authorizedCards.push({
      id: 'user_mgmt_card',
      title: 'Staff & User Management',
      icon: ShieldCheck,
      iconBg: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      badge: 'Admin Access',
      badgeColor: 'bg-[#EAF4FB] text-[#003B73] border-[#D9E1EA]',
      onClick: () => onNavigateTab('user_management'),
    });
  }

  // 9. Center Settings (STRICTLY only if settings tab is authorized for this user)
  if (hasTabPermission(currentUser, 'settings')) {
    authorizedCards.push({
      id: 'center_settings_card',
      title: 'Center Settings',
      icon: Settings,
      iconBg: 'bg-[#EAF4FB] text-[#4B5563] border-[#D9E1EA]',
      badge: 'Configuration',
      badgeColor: 'bg-[#EAF4FB] text-[#4B5563] border-[#D9E1EA]',
      onClick: () => onNavigateTab('settings'),
    });
  }

  // 10. Operator Profile (STRICTLY only if profile tab is authorized for this user)
  if (hasTabPermission(currentUser, 'profile')) {
    authorizedCards.push({
      id: 'operator_profile_card',
      title: 'My Profile & Session',
      icon: UserCircle,
      iconBg: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      badge: 'Active Profile',
      badgeColor: 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]',
      onClick: () => onNavigateTab('profile'),
    });
  }

  return (
    <div className="relative z-10 w-full space-y-5 pb-6">
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

      {/* Authorized Tool Cards - Minimal Design without taglines */}
      <div className="space-y-3">
        {authorizedCards.length === 0 ? (
          <div className="bg-white border border-[#D9E1EA] rounded-xl p-6 text-center shadow-xs">
            <Info className="w-6 h-6 text-[#0056A6] mx-auto mb-1.5 opacity-80" />
            <h3 className="text-xs font-bold text-[#1F2937]">No Tools Currently Assigned</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {authorizedCards.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  onClick={feat.onClick}
                  className="bg-white border border-[#D9E1EA] hover:border-[#0056A6] rounded-xl p-3.5 sm:p-4 flex items-center justify-between transform hover:-translate-y-1 hover:shadow-md hover:shadow-[#0056A6]/10 active:translate-y-0 active:shadow-xs transition-all duration-200 ease-out cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${feat.iconBg} group-hover:scale-110 group-hover:shadow-xs transition-all duration-200`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-[#1F2937] group-hover:text-[#0056A6] transition-colors truncate">
                        {feat.title}
                      </h3>
                      {feat.badge && (
                        <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium border ${feat.badgeColor} group-hover:shadow-2xs transition-shadow duration-200`}>
                          {feat.isProtected && <Lock className="w-2.5 h-2.5 text-amber-700" />}
                          {feat.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#F7F9FC] group-hover:bg-[#0056A6] group-hover:text-white text-[#0056A6] transition-all duration-200 shrink-0 ml-2 shadow-2xs group-hover:shadow-xs">
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                  </div>
                </div>
              );
            })}
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
  );
};
