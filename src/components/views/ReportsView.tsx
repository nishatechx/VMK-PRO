import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Ticket,
  Users,
  Building2,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { getStudentRecords, getVisitorRecords } from '../../services/authService';
import { getTicketRecords } from '../../services/ticketService';
import { UserProfile } from '../../types/auth';

interface ReportsViewProps {
  currentUser?: UserProfile | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser }) => {
  const [reportSection, setReportSection] = useState<'overview' | 'verification' | 'visitors' | 'tickets' | 'events'>('overview');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'month'>('all');

  const students = useMemo(() => getStudentRecords(), []);
  const visitors = useMemo(() => getVisitorRecords(), []);
  const tickets = useMemo(() => getTicketRecords(), []);

  // Metrics
  const totalStudents = students.length;
  const verifiedStudents = students.filter((s) => s.status === 'Verified').length;
  const pendingStudents = students.filter((s) => s.status === 'Pending' || s.status === 'Objection Raised').length;
  const verificationRate = totalStudents > 0 ? Math.round((verifiedStudents / totalStudents) * 100) : 100;

  const totalVisitors = visitors.length;
  const inPremisesVisitors = visitors.filter((v) => v.status === 'In Premises').length;

  const totalTickets = tickets.length;
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
  const ticketResolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;

  // Breakdown by course
  const courseBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const course = s.course || 'Other';
      counts[course] = (counts[course] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [students]);

  // Breakdown by scrutiny mode
  const modeBreakdown = useMemo(() => {
    const eScrutiny = students.filter((s) => s.scrutinyMode === 'E-Scrutiny').length;
    const physical = students.filter((s) => s.scrutinyMode === 'Physical Scrutiny').length;
    return { eScrutiny, physical };
  }, [students]);

  const handleExportFullReport = () => {
    const headers = ['Metric', 'Count', 'Percentage / Rate'];
    const rows = [
      ['Total Candidates Registered', totalStudents, '100%'],
      ['Verified Candidates', verifiedStudents, `${verificationRate}%`],
      ['Pending / Objection Raised', pendingStudents, `${100 - verificationRate}%`],
      ['Total Visitors Logged', totalVisitors, '-'],
      ['Visitors Currently in Premises', inPremisesVisitors, '-'],
      ['Total Counsellor Tickets', totalTickets, '100%'],
      ['Resolved Tickets', resolvedTickets, `${ticketResolutionRate}%`],
      ['E-Scrutiny Count', modeBreakdown.eScrutiny, `${totalStudents > 0 ? Math.round((modeBreakdown.eScrutiny / totalStudents) * 100) : 0}%`],
      ['Physical Scrutiny Count', modeBreakdown.physical, `${totalStudents > 0 ? Math.round((modeBreakdown.physical / totalStudents) * 100) : 0}%`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `center_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-5 pb-8 select-none font-sans">
      {/* Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]">
              Operational Intelligence
            </span>
            <span className="text-xs text-[#62738D]">Center FC-1102 &bull; Washim District</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            Center Reports & Performance Analytics
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Statistical breakdown of candidate verifications, visitor throughput, grievance ticket resolutions, and outreach camp impacts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleExportFullReport}
            className="px-4 py-2 rounded-xl bg-[#073B70] hover:bg-[#092744] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Master Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl p-1.5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setReportSection('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportSection === 'overview' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          Center Overview
        </button>
        <button
          type="button"
          onClick={() => setReportSection('verification')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportSection === 'verification' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          Candidate Verification
        </button>
        <button
          type="button"
          onClick={() => setReportSection('visitors')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportSection === 'visitors' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          Visitor Footfall
        </button>
        <button
          type="button"
          onClick={() => setReportSection('tickets')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportSection === 'tickets' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          Grievance Tickets
        </button>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-[#62738D]">Verification Clearance</span>
            <CheckCircle2 className="w-4 h-4 text-[#079669]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#102544]">{verificationRate}%</div>
          <p className="text-[11px] text-[#079669] font-medium mt-1">{verifiedStudents} of {totalStudents} verified</p>
        </div>

        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-[#62738D]">Ticket Resolution</span>
            <TrendingUp className="w-4 h-4 text-[#0866D9]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#102544]">{ticketResolutionRate}%</div>
          <p className="text-[11px] text-[#0866D9] font-medium mt-1">{resolvedTickets} of {totalTickets} resolved</p>
        </div>

        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-[#62738D]">E-Scrutiny Adoption</span>
            <ShieldCheck className="w-4 h-4 text-[#073B70]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#102544]">
            {totalStudents > 0 ? Math.round((modeBreakdown.eScrutiny / totalStudents) * 100) : 0}%
          </div>
          <p className="text-[11px] text-[#62738D] font-medium mt-1">{modeBreakdown.eScrutiny} online dossiers</p>
        </div>

        <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-[#62738D]">Visitor Register</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#102544]">{totalVisitors}</div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">{inPremisesVisitors} currently inside</p>
        </div>
      </div>

      {/* Visual Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Course Stream Distribution */}
        <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCE5F0]">
            <h3 className="text-sm font-bold text-[#102544]">Candidate Intake by Stream</h3>
            <span className="text-[11px] text-[#62738D]">Course Enrollment</span>
          </div>

          <div className="space-y-3">
            {courseBreakdown.slice(0, 5).map(([course, count], idx) => {
              const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#102544] truncate max-w-[240px]">{course}</span>
                    <span className="font-mono text-[#62738D]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-[#F4F7FB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0866D9] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification Mode Distribution */}
        <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCE5F0]">
            <h3 className="text-sm font-bold text-[#102544]">Scrutiny Verification Mode</h3>
            <span className="text-[11px] text-[#62738D]">E-Scrutiny vs Physical</span>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#073B70] block">E-Scrutiny (Online Portal)</span>
                <span className="text-[11px] text-[#62738D]">Automated document validation</span>
              </div>
              <span className="text-lg font-bold font-mono text-[#102544]">{modeBreakdown.eScrutiny}</span>
            </div>

            <div className="p-4 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#0866D9] block">Physical Scrutiny Desk</span>
                <span className="text-[11px] text-[#62738D]">In-person candidate verification</span>
              </div>
              <span className="text-lg font-bold font-mono text-[#102544]">{modeBreakdown.physical}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
