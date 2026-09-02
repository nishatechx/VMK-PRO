import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket,
  Search,
  Filter,
  Plus,
  Copy,
  Check,
  Printer,
  FileSpreadsheet,
  MessageCircle,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Trash2,
  Edit3,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Info,
  X,
  Send,
  Eye,
} from 'lucide-react';
import { TicketRecord, TicketStatus, TicketType, UserProfile } from '../../types/auth';
import {
  getTicketRecords,
  subscribeToTickets,
  saveTicketRecord,
  deleteTicketRecord,
  updateTicketStatus,
} from '../../services/ticketService';
import { WhatsappInitialData } from '../WhatsappTicketModal';

interface TicketsViewProps {
  currentUser?: UserProfile | null;
  onOpenTicketTool: () => void;
  onOpenWhatsappTool: () => void;
  onOpenWhatsappWithData?: (data: WhatsappInitialData) => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({
  currentUser,
  onOpenTicketTool,
  onOpenWhatsappTool,
  onOpenWhatsappWithData,
}) => {
  const [tickets, setTickets] = useState<TicketRecord[]>(() => getTicketRecords());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all'); // 'all' | 'me' | username
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Modal States
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetTicket, setStatusTargetTicket] = useState<TicketRecord | null>(null);
  const [newStatus, setNewStatus] = useState<TicketStatus>('Open');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({
    message: '',
    type: '',
  });

  useEffect(() => {
    const unsubscribe = subscribeToTickets((updatedList) => {
      setTickets(updatedList);
    });
    return () => unsubscribe();
  }, []);

  // Filter & Search Tickets
  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        // Creator filter
        if (creatorFilter === 'me' && currentUser) {
          if (t.createdBy !== currentUser.username && t.createdBy !== currentUser.id) {
            return false;
          }
        } else if (creatorFilter !== 'all' && creatorFilter !== 'me') {
          if (t.createdBy !== creatorFilter) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all' && t.status !== statusFilter) {
          return false;
        }

        // Type filter
        if (typeFilter !== 'all' && t.ticketType !== typeFilter) {
          return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNo = t.ticketNo?.toLowerCase().includes(q);
          const matchName = t.candidateName?.toLowerCase().includes(q);
          const matchMobile = t.mobile?.toLowerCase().includes(q);
          const matchCet = t.cetNo?.toLowerCase().includes(q);
          const matchCap = t.capId?.toLowerCase().includes(q);
          const matchCourse = t.course?.toLowerCase().includes(q);
          const matchQuery = t.query?.toLowerCase().includes(q);
          const matchCreator = t.creatorName?.toLowerCase().includes(q) || t.createdBy?.toLowerCase().includes(q);

          return matchNo || matchName || matchMobile || matchCet || matchCap || matchCourse || matchQuery || matchCreator;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [tickets, searchTerm, statusFilter, typeFilter, creatorFilter, sortBy, currentUser]);

  // Statistics
  const totalCount = tickets.length;
  const myCount = currentUser
    ? tickets.filter((t) => t.createdBy === currentUser.username || t.createdBy === currentUser.id).length
    : 0;
  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handlePrintSlip = (ticket: TicketRecord) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket Slip - ${ticket.ticketNo}</title>
            <style>
              body {
                font-family: monospace, Arial, sans-serif;
                font-size: 13px;
                line-height: 1.6;
                padding: 30px;
                color: #000;
                background: #fff;
              }
              .header {
                border-bottom: 2px dashed #003B73;
                padding-bottom: 12px;
                margin-bottom: 16px;
              }
              .header h2 {
                margin: 0 0 4px 0;
                font-size: 16px;
                color: #003B73;
              }
              .header p {
                margin: 0;
                font-size: 12px;
                color: #555;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                background: #F7F9FC;
                padding: 16px;
                border: 1px solid #D9E1EA;
                border-radius: 6px;
              }
              .footer {
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px dashed #ccc;
                font-size: 11px;
                color: #666;
                display: flex;
                justify-content: space-between;
              }
              @media print {
                body { padding: 0; }
                pre { border: 1px solid #000; background: #fff; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>MHT-CET FACILITATION & SCRUTINY CENTER (FC-1102)</h2>
              <p>Government Scrutiny Desk • Candidate Query & Grievance Ticket</p>
            </div>
            <p><strong>Ticket Number:</strong> ${ticket.ticketNo}</p>
            <p><strong>Created By:</strong> ${ticket.creatorName} (${ticket.creatorRole}) on ${new Date(ticket.createdAt).toLocaleString('en-IN')}</p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <pre>${ticket.formattedText || ticket.query}</pre>
            ${ticket.resolutionNotes ? `<p><strong>Resolution Remarks:</strong> ${ticket.resolutionNotes}</p>` : ''}
            <div class="footer">
              <span>District Nodal Office, Washim (DNO FC-1102)</span>
              <span>Generated on ${new Date().toLocaleString('en-IN')}</span>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDirectWhatsApp = (ticket: TicketRecord) => {
    const text = ticket.formattedText || ticket.query;
    const phone = ticket.mobile.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDeleteTicket = async (id: string) => {
    const res = await deleteTicketRecord(id);
    setDeleteConfirmId(null);
    if (res.success) {
      setActionFeedback({ message: 'Ticket deleted from database.', type: 'success' });
      setTimeout(() => setActionFeedback({ message: '', type: '' }), 3000);
    }
  };

  const openStatusModal = (ticket: TicketRecord) => {
    setStatusTargetTicket(ticket);
    setNewStatus(ticket.status);
    setResolutionNotes(ticket.resolutionNotes || '');
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!statusTargetTicket) return;
    const res = await updateTicketStatus(statusTargetTicket.id, newStatus, resolutionNotes);
    setIsStatusModalOpen(false);
    if (res.success) {
      setActionFeedback({ message: `Ticket status updated to "${newStatus}".`, type: 'success' });
      setTimeout(() => setActionFeedback({ message: '', type: '' }), 3000);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filteredTickets.length === 0) return;

    const headers = [
      'Ticket No',
      'Ticket Type',
      'Candidate Name',
      'Mobile',
      'Email',
      'CET No',
      'CAP ID',
      'Course',
      'Scrutiny Mode',
      'Query',
      'Status',
      'Created By',
      'Creator Role',
      'Created At',
      'Resolution Notes',
    ];

    const rows = filteredTickets.map((t) => [
      `"${t.ticketNo || ''}"`,
      `"${t.ticketType || ''}"`,
      `"${(t.candidateName || '').replace(/"/g, '""')}"`,
      `"${t.mobile || ''}"`,
      `"${t.email || ''}"`,
      `"${t.cetNo || ''}"`,
      `"${t.capId || ''}"`,
      `"${(t.course || '').replace(/"/g, '""')}"`,
      `"${t.scrutinyMode || ''}"`,
      `"${(t.query || '').replace(/"/g, '""')}"`,
      `"${t.status || 'Open'}"`,
      `"${(t.creatorName || t.createdBy || '').replace(/"/g, '""')}"`,
      `"${t.creatorRole || ''}"`,
      `"${t.createdAt || ''}"`,
      `"${(t.resolutionNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Counsellor_Tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'In Progress':
        return 'bg-[#EAF4FB] text-[#0056A6] border-[#0056A6]/30';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Closed':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="counsellor-tickets-view" className="space-y-6">
      {/* View Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D9E1EA]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#003B73] text-white flex items-center justify-center shadow-xs border border-[#002850]">
              <Ticket className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#003B73]">Counsellor Tickets Database</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EAF4FB] text-[#0056A6] border border-[#D9E1EA]">
                  Real-time Cloud Sync
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Candidate grievances, inquiry tickets & WhatsApp notices created by counsellors
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="create-candidate-ticket-btn"
            onClick={onOpenTicketTool}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Candidate Ticket</span>
          </button>

          <button
            id="create-whatsapp-ticket-btn"
            onClick={onOpenWhatsappTool}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#198754] hover:bg-[#146c43] text-white shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Ticket Tool</span>
          </button>

          <button
            id="export-tickets-csv-btn"
            onClick={handleExportCsv}
            disabled={filteredTickets.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-[#003B73] border border-[#D9E1EA] shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#198754]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Alert */}
      {actionFeedback.message && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Analytics / Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#D9E1EA] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Total Tickets</span>
            <Ticket className="w-4 h-4 text-[#0056A6]" />
          </div>
          <p className="text-2xl font-bold text-[#003B73] mt-1">{totalCount}</p>
          <span className="text-[10px] text-[#6B7280]">In database</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D9E1EA] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">My Created</span>
            <User className="w-4 h-4 text-[#006BB6]" />
          </div>
          <p className="text-2xl font-bold text-[#006BB6] mt-1">{myCount}</p>
          <span className="text-[10px] text-[#006BB6] font-medium">By {currentUser?.username || 'You'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D9E1EA] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Open / Pending</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{openCount}</p>
          <span className="text-[10px] text-amber-700 font-medium">Needs Attention</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D9E1EA] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">In Progress</span>
            <RefreshCw className="w-4 h-4 text-[#0056A6]" />
          </div>
          <p className="text-2xl font-bold text-[#0056A6] mt-1">{inProgressCount}</p>
          <span className="text-[10px] text-[#0056A6] font-medium">Being Reviewed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#D9E1EA] shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-[#198754]" />
          </div>
          <p className="text-2xl font-bold text-[#198754] mt-1">{resolvedCount}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Closed / Done</span>
        </div>
      </div>

      {/* Control Bar: Search, Creator Filter, Status, Type, and View Switcher */}
      <div className="p-4 bg-white rounded-2xl border border-[#D9E1EA] shadow-2xs space-y-3.5">
        {/* Top Search & Filter Mode Tabs */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="ticket-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Ticket No, Candidate Name, Mobile, CET / CAP ID, Course or Creator..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-[#F7F9FC] border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/10 outline-none text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Creator Toggle: All vs My Tickets */}
          <div className="flex items-center bg-[#F7F9FC] p-1 rounded-xl border border-[#D9E1EA] shrink-0">
            <button
              onClick={() => setCreatorFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                creatorFilter === 'all'
                  ? 'bg-[#0056A6] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#003B73]'
              }`}
            >
              All Tickets ({totalCount})
            </button>
            <button
              onClick={() => setCreatorFilter('me')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                creatorFilter === 'me'
                  ? 'bg-[#0056A6] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#003B73]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Created by Me ({myCount})</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters & Layout Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D9E1EA]/60 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                id="ticket-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F7F9FC] border border-[#D9E1EA] rounded-lg font-medium text-slate-700 outline-none focus:border-[#0056A6]"
              >
                <option value="all">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Type:</span>
              <select
                id="ticket-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F7F9FC] border border-[#D9E1EA] rounded-lg font-medium text-slate-700 outline-none focus:border-[#0056A6]"
              >
                <option value="all">All Types</option>
                <option value="candidate_ticket">Candidate Grievance Desk</option>
                <option value="whatsapp_ticket">WhatsApp Notice</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Sort:</span>
              <select
                id="ticket-sort-filter"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-[#F7F9FC] border border-[#D9E1EA] rounded-lg font-medium text-slate-700 outline-none focus:border-[#0056A6]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {(statusFilter !== 'all' || typeFilter !== 'all' || searchTerm || creatorFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setCreatorFilter('all');
                  setSearchTerm('');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline px-1 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* View Mode Switcher: Cards vs Table */}
          <div className="flex items-center gap-1 bg-[#F7F9FC] p-1 rounded-lg border border-[#D9E1EA]">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-[#0056A6] text-white' : 'text-slate-600 hover:text-[#003B73]'
              }`}
              title="Card Grid View"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-[#0056A6] text-white' : 'text-slate-600 hover:text-[#003B73]'
              }`}
              title="Table View"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket List / Grid View */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#D9E1EA] shadow-2xs space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EAF4FB] text-[#0056A6] flex items-center justify-center">
            <Ticket className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#003B73]">No Tickets Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || creatorFilter !== 'all'
              ? 'No tickets match the current filters. Try resetting the search or filter criteria.'
              : 'No tickets have been generated yet. Use the buttons above to generate Candidate Grievance or WhatsApp Tickets.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenTicketTool}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0056A6] text-white hover:bg-[#003B73] transition-colors"
            >
              Create First Candidate Ticket
            </button>
            <button
              onClick={onOpenWhatsappTool}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#198754] text-white hover:bg-[#146c43] transition-colors"
            >
              Create WhatsApp Ticket
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => {
            const isMyTicket = currentUser && (ticket.createdBy === currentUser.username || ticket.createdBy === currentUser.id);
            const isWhatsapp = ticket.ticketType === 'whatsapp_ticket';

            return (
              <div
                key={ticket.id || ticket.ticketNo}
                className="bg-white rounded-2xl border border-[#D9E1EA] hover:border-[#0056A6]/40 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-[#D9E1EA] bg-gradient-to-b from-[#F7F9FC] to-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isWhatsapp
                            ? 'bg-[#198754]/10 text-[#198754] border-[#198754]/30'
                            : 'bg-[#EAF4FB] text-[#0056A6] border-[#D9E1EA]'
                        }`}
                      >
                        {isWhatsapp ? <MessageCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        <span>{isWhatsapp ? 'WhatsApp Ticket' : 'Candidate Desk'}</span>
                      </span>

                      {isMyTicket && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#0056A6] border border-blue-200">
                          My Ticket
                        </span>
                      )}
                    </div>

                    {/* Status Pill Button */}
                    <button
                      onClick={() => openStatusModal(ticket)}
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer hover:opacity-85 transition-opacity flex items-center gap-1 ${getStatusColor(
                        ticket.status
                      )}`}
                      title="Click to update status"
                    >
                      <span>{ticket.status}</span>
                      <Edit3 className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </div>

                  {/* Ticket Number & Copy */}
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="font-mono text-xs font-bold text-[#003B73] truncate" title={ticket.ticketNo}>
                      {ticket.ticketNo}
                    </span>
                    <button
                      onClick={() => handleCopyText(ticket.formattedText || ticket.ticketNo, ticket.id)}
                      className="p-1 text-slate-400 hover:text-[#0056A6] rounded hover:bg-[#EAF4FB] transition-colors cursor-pointer"
                      title="Copy ticket note"
                    >
                      {copiedId === ticket.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Candidate & Query Body */}
                <div className="p-4 space-y-3 flex-1">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0056A6] transition-colors">
                      {ticket.candidateName}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1" title={ticket.course}>
                      {ticket.course}
                    </p>
                  </div>

                  {/* Candidate Identifiers */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F7F9FC] p-2.5 rounded-xl border border-[#D9E1EA]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CET / CAP ID</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {ticket.cetNo || ticket.capId || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Mobile</span>
                      <span className="font-semibold text-slate-800">{ticket.mobile}</span>
                    </div>
                  </div>

                  {/* Query Snippet */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Query / Issue
                    </span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {ticket.query}
                    </p>
                  </div>

                  {/* Resolution Notes if available */}
                  {ticket.resolutionNotes && (
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-[11px] text-emerald-900">
                      <span className="font-bold block text-[10px] text-emerald-800">Resolution Remark:</span>
                      <span className="line-clamp-2">{ticket.resolutionNotes}</span>
                    </div>
                  )}

                  {/* Creator Footnote */}
                  <div className="pt-2 border-t border-[#D9E1EA]/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate" title={`Created by ${ticket.creatorName}`}>
                      <User className="w-3 h-3 text-[#0056A6]" />
                      <span className="font-medium text-slate-700">{ticket.creatorName || ticket.createdBy}</span>
                      <span className="text-[10px] text-slate-400">({ticket.creatorRole})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-[#F7F9FC] border-t border-[#D9E1EA] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-[#0056A6] hover:bg-white border border-transparent hover:border-[#D9E1EA] transition-all cursor-pointer"
                      title="View Full Slip & Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handlePrintSlip(ticket)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-[#0056A6] hover:bg-white border border-transparent hover:border-[#D9E1EA] transition-all cursor-pointer"
                      title="Print Official Slip"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDirectWhatsApp(ticket)}
                      className="p-1.5 rounded-lg text-[#198754] hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                      title="Send / Resend via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {onOpenWhatsappWithData && (
                      <button
                        onClick={() => {
                          onOpenWhatsappWithData({
                            name: ticket.candidateName,
                            mobile: ticket.mobile,
                            email: ticket.email,
                            cetRegNo: ticket.cetNo,
                            capAppNo: ticket.capId,
                            courseName: ticket.course,
                            ticketNo: ticket.ticketNo,
                            query: ticket.query,
                          });
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                        title="Create or edit WhatsApp notice for this ticket"
                      >
                        <Send className="w-3 h-3" />
                        <span>Notice</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openStatusModal(ticket)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-[#D9E1EA] transition-colors cursor-pointer"
                    >
                      Status
                    </button>

                    {deleteConfirmId === ticket.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-1 rounded text-[10px] bg-slate-200 text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(ticket.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-[#D9E1EA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B73] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Ticket No</th>
                  <th className="py-3 px-4">Candidate & Course</th>
                  <th className="py-3 px-4">Mobile & IDs</th>
                  <th className="py-3 px-4">Query Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1EA]">
                {filteredTickets.map((ticket) => {
                  const isMyTicket = currentUser && (ticket.createdBy === currentUser.username || ticket.createdBy === currentUser.id);

                  return (
                    <tr key={ticket.id} className="hover:bg-[#F7F9FC] transition-colors">
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#003B73]">{ticket.ticketNo}</span>
                          <button
                            onClick={() => handleCopyText(ticket.formattedText || ticket.ticketNo, ticket.id)}
                            className="text-slate-400 hover:text-[#0056A6]"
                            title="Copy Ticket"
                          >
                            {copiedId === ticket.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {ticket.ticketType === 'whatsapp_ticket' ? 'WhatsApp' : 'Candidate Desk'}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <p className="font-bold text-slate-900">{ticket.candidateName}</p>
                        <p className="text-[11px] text-slate-500 max-w-xs truncate">{ticket.course}</p>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <p className="font-medium text-slate-800">{ticket.mobile}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {ticket.cetNo || ticket.capId || 'N/A'}
                        </p>
                      </td>

                      <td className="py-3 px-4 align-top max-w-xs">
                        <p className="text-slate-700 line-clamp-2 leading-relaxed">{ticket.query}</p>
                        {ticket.resolutionNotes && (
                          <p className="text-[10px] text-emerald-700 mt-1 font-medium truncate">
                            Remark: {ticket.resolutionNotes}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top">
                        <button
                          onClick={() => openStatusModal(ticket)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {ticket.status}
                        </button>
                      </td>

                      <td className="py-3 px-4 align-top text-[11px]">
                        <p className="font-semibold text-slate-800">
                          {ticket.creatorName || ticket.createdBy}
                          {isMyTicket && <span className="ml-1 text-[10px] text-[#0056A6] font-bold">(You)</span>}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </p>
                      </td>

                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1 text-slate-600 hover:text-[#0056A6]"
                            title="View Slip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintSlip(ticket)}
                            className="p-1 text-slate-600 hover:text-[#0056A6]"
                            title="Print Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDirectWhatsApp(ticket)}
                            className="p-1 text-emerald-600 hover:text-emerald-800"
                            title="Direct WhatsApp Share"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {onOpenWhatsappWithData && (
                            <button
                              onClick={() => {
                                onOpenWhatsappWithData({
                                  name: ticket.candidateName,
                                  mobile: ticket.mobile,
                                  email: ticket.email,
                                  cetRegNo: ticket.cetNo,
                                  capAppNo: ticket.capId,
                                  courseName: ticket.course,
                                  ticketNo: ticket.ticketNo,
                                  query: ticket.query,
                                });
                              }}
                              className="p-1 text-emerald-700 hover:text-emerald-900"
                              title="Open in WhatsApp Notice Dispatcher"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#003B73]/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#D9E1EA] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#003B73] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold text-white">Ticket Note Details • {selectedTicket.ticketNo}</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Creator & Meta Bar */}
              <div className="p-3.5 rounded-2xl bg-[#F7F9FC] border border-[#D9E1EA] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Created By</span>
                  <span className="font-bold text-slate-800">
                    {selectedTicket.creatorName} ({selectedTicket.creatorRole})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Timestamp</span>
                  <span className="font-medium text-slate-700">
                    {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Current Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              {/* Formatted Output Console */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Formatted Ticket Note</label>
                <pre className="w-full p-4 bg-[#001D3D] text-emerald-400 font-mono text-xs rounded-xl border border-[#002850] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.formattedText || selectedTicket.query}
                </pre>
              </div>

              {/* Resolution Notes */}
              {selectedTicket.resolutionNotes && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-900 block mb-1">Resolution Remark</span>
                  <p className="text-emerald-800">{selectedTicket.resolutionNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#F7F9FC] border-t border-[#D9E1EA] flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openStatusModal(selectedTicket);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-[#D9E1EA]"
              >
                Change Status & Notes
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(selectedTicket.formattedText || selectedTicket.ticketNo, selectedTicket.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0056A6] text-white hover:bg-[#003B73] flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Note</span>
                </button>
                <button
                  onClick={() => handlePrintSlip(selectedTicket)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#198754] text-white hover:bg-[#146c43] flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && statusTargetTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#003B73]/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#D9E1EA] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-[#003B73] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Update Ticket Status • {statusTargetTicket.ticketNo}</h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Ticket Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Open', 'In Progress', 'Resolved', 'Closed'] as TicketStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        newStatus === st
                          ? 'bg-[#0056A6] text-white border-[#0056A6] shadow-xs'
                          : 'bg-[#F7F9FC] text-slate-700 border-[#D9E1EA] hover:bg-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Resolution Notes / Officer Remarks
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add resolution details (e.g., 'Discrepancy resolved, candidate uploaded updated income certificate')..."
                  className="w-full p-3 text-xs bg-[#F7F9FC] border border-[#D9E1EA] rounded-xl focus:border-[#0056A6] outline-none text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 bg-[#F7F9FC] border-t border-[#D9E1EA] flex justify-end gap-2">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatus}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
