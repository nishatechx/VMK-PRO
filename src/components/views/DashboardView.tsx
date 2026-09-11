import React from 'react';
import {
  FileText,
  MessageCircle,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  GraduationCap,
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
import { DashboardNoticeBar } from '../DashboardNoticeBar';
import { APP_ASSETS } from '../../constants/assets';

interface DashboardViewProps {
  onOpenWhatsappTool?: () => void;
  onOpenQrTool?: () => void;
  onOpenTicketTool?: () => void;
  onOpenImgToPdfTool?: () => void;
  onOpenImageToTextTool?: () => void;
  onNavigateTab: (tab: any) => void;
  currentUser?: UserProfile | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWhatsappTool,
  onOpenQrTool,
  onOpenTicketTool,
  onOpenImgToPdfTool,
  onOpenImageToTextTool,
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

  return (
    <div className="relative z-10 w-full pb-6">
      {/* 2-Column Responsive Dashboard: Main Workspace (Left) + CET Cell Notice Bar (Right) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Workspace Column */}
        <div className="flex-1 min-w-0 w-full space-y-5">
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
            <div className="bg-white border border-[#D9E1EA] hover:border-[#B4C6D8] rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 ease-out">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {facilitationTools.map((tool) => (
                  <button
                    key={tool.id}
                    id={tool.id}
                    type="button"
                    onClick={tool.onClick}
                    className="group bg-[#F7F9FC] hover:bg-white border border-[#D9E1EA] hover:border-[#0056A6] rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-3 shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer w-full"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#D9E1EA] group-hover:border-[#0056A6] p-2 sm:p-2.5 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-108 group-hover:shadow-md transition-all duration-200 overflow-hidden">
                      <img
                        src={tool.imageSrc}
                        alt={tool.title}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#1F2937] group-hover:text-[#0056A6] transition-colors leading-snug text-center">
                      {tool.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
