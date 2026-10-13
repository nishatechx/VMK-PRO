import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  MessageCircle,
  Ticket,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  X,
  Phone,
  BookOpen,
  MapPin,
  FileCheck,
} from 'lucide-react';
import { StudentRecord, UserProfile } from '../../types/auth';
import { DEPARTMENT_COURSES, DEFAULT_COURSE } from '../../data/courses';
import {
  getStudentRecords,
  subscribeToStudents,
  saveStudentRecord,
  deleteStudentRecord,
  hasFeaturePermission,
} from '../../services/authService';
import { FormValidationErrorModal } from '../FormValidationErrorModal';

interface CandidatesViewProps {
  onOpenWhatsappTool?: () => void;
  onOpenTicketTool?: () => void;
  onOpenQrTool?: () => void;
  currentUser?: UserProfile | null;
}

export const CandidatesView: React.FC<CandidatesViewProps> = ({
  onOpenWhatsappTool,
  onOpenTicketTool,
  onOpenQrTool,
  currentUser,
}) => {
  const [candidates, setCandidates] = useState<StudentRecord[]>(() => getStudentRecords());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCandidate, setSelectedCandidate] = useState<StudentRecord | null>(null);

  useEffect(() => {
    const unsub = subscribeToStudents((list) => {
      setCandidates(list);
    });
    return () => unsub();
  }, []);

  // Add Candidate Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCourse, setNewCourse] = useState(DEFAULT_COURSE);
  const [newMode, setNewMode] = useState<'E-Scrutiny' | 'Physical Scrutiny'>('E-Scrutiny');
  const [newStatus, setNewStatus] = useState<'Verified' | 'Objection Raised' | 'Document Pending'>('Verified');
  const [newCategory, setNewCategory] = useState('OPEN');
  const [newRemarks, setNewRemarks] = useState('');

  // Validation Popup State
  const [validationPopup, setValidationPopup] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    missingFields: string[];
    extraErrors?: string[];
  }>({
    isOpen: false,
    title: 'Candidate Information Missing',
    description: 'Please complete all required fields.',
    missingFields: [],
  });

  const canAddCandidate = hasFeaturePermission(currentUser, 'add_candidate');
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.username?.toLowerCase() === 'shrinath';
  const isDno = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const cName = c.candidateName || c.name || '';
      const cId = c.applicationId || c.id || '';
      const matchSearch =
        cName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.mobile && c.mobile.includes(searchTerm));
      const matchCourse = selectedCourse === 'All' || c.course === selectedCourse;
      const matchStatus = selectedStatus === 'All' || c.status === selectedStatus;
      return matchSearch && matchCourse && matchStatus;
    });
  }, [candidates, searchTerm, selectedCourse, selectedStatus]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, currentPage, pageSize]);

  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!newId.trim()) missing.push('Application / Registration ID');
    if (!newName.trim()) missing.push('Candidate Full Name');
    if (!newMobile.trim()) missing.push('Mobile Number');

    if (missing.length > 0) {
      setValidationPopup({
        isOpen: true,
        title: 'Mandatory Fields Required',
        description: 'Complete the missing fields to register the candidate in the official scrutiny register.',
        missingFields: missing,
      });
      return;
    }

    const newRecord: StudentRecord = {
      id: newId.trim().toUpperCase() || `cnd-${Date.now()}`,
      applicationId: newId.trim().toUpperCase(),
      name: newName.trim(),
      candidateName: newName.trim(),
      mobile: newMobile.trim(),
      email: newEmail.trim() || undefined,
      course: newCourse,
      mode: newMode,
      scrutinyMode: newMode,
      status: newStatus,
      category: newCategory,
      remarks: newRemarks.trim() || 'Verified scrutiny documents',
      scrutinyOfficer: currentUser?.fullName || currentUser?.username || 'Officer',
      district: currentUser?.district || 'Washim',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.username || 'staff',
    };

    saveStudentRecord(newRecord);
    setIsAddModalOpen(false);
    setNewId('');
    setNewName('');
    setNewMobile('');
    setNewEmail('');
    setNewRemarks('');
  };

  const handleDeleteCandidate = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove candidate record "${name}"?`)) {
      deleteStudentRecord(id);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Application ID', 'Candidate Name', 'Mobile', 'Course', 'Scrutiny Mode', 'Status', 'District', 'Registered Date'];
    const rows = filteredCandidates.map((c) => [
      c.applicationId,
      `"${c.candidateName.replace(/"/g, '""')}"`,
      c.mobile,
      `"${c.course.replace(/"/g, '""')}"`,
      c.scrutinyMode,
      c.status,
      c.district || 'Washim',
      c.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `candidates_register_${new Date().toISOString().split('T')[0]}.csv`);
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
              Candidate Registry
            </span>
            <span className="text-xs text-[#62738D]">Total: {candidates.length} Registered</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            Candidates & Scrutiny Records
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Search, verify, and track candidate application dossiers across E-Scrutiny and Physical Verification desks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-white hover:bg-[#F4F7FB] text-[#102544] border border-[#DCE5F0] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#62738D]" />
            <span>Export CSV</span>
          </button>

          {canAddCandidate && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register Candidate</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl p-4 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search candidate by name, application ID, or mobile..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-lg text-[#102544] placeholder:text-[#62738D] focus:border-[#0866D9] focus:bg-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#62738D]" />
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="text-xs py-2 px-3 bg-white border border-[#DCE5F0] rounded-lg text-[#102544] outline-none"
            >
              <option value="All">All Verification Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Objection Raised">Objection Raised</option>
              <option value="Document Pending">Document Pending</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-[#62738D]">
          Showing <strong>{filteredCandidates.length}</strong> matching candidate{filteredCandidates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl shadow-[0_1px_3px_rgba(16,37,68,0.04)] overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          {paginatedCandidates.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <FileCheck className="w-10 h-10 text-[#62738D] mx-auto opacity-40" />
              <p className="text-sm font-bold text-[#102544]">No candidates found</p>
              <p className="text-xs text-[#62738D]">Try adjusting your search criteria or register a new candidate.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#DCE5F0] bg-[#F4F7FB] text-[#62738D] text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Candidate Full Name</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Course</th>
                  <th className="py-3 px-3">Scrutiny Mode</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5F0]">
                {paginatedCandidates.map((c) => {
                  const isVerified = c.status === 'Verified';
                  const isObjection = c.status === 'Objection Raised';

                  return (
                    <tr key={c.id} className="hover:bg-[#F4F7FB]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#073B70]">
                        {c.applicationId}
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#102544]">
                        <div>{c.candidateName}</div>
                        {c.remarks && (
                          <div className="text-[10px] text-[#62738D] font-normal truncate max-w-xs">
                            {c.remarks}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[#62738D] font-mono whitespace-nowrap">
                        {c.mobile}
                      </td>

                      <td className="py-3 px-3 text-[#102544] max-w-[150px] truncate">
                        {c.course}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                          {c.scrutinyMode}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isVerified
                            ? 'bg-[#079669]/10 text-[#079669] border border-[#079669]/20'
                            : isObjection
                            ? 'bg-[#D99100]/10 text-[#D99100] border border-[#D99100]/20'
                            : 'bg-[#0866D9]/10 text-[#0866D9] border border-[#0866D9]/20'
                        }`}>
                          {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span>{c.status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidate(c)}
                            className="p-1.5 rounded-lg bg-[#F4F7FB] hover:bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0] cursor-pointer"
                            title="View candidate dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onOpenWhatsappTool && (
                            <button
                              type="button"
                              onClick={onOpenWhatsappTool}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#079669] border border-emerald-200 cursor-pointer"
                              title="Send WhatsApp notice"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenTicketTool && (
                            <button
                              type="button"
                              onClick={onOpenTicketTool}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#073B70] border border-blue-200 cursor-pointer"
                              title="Generate SAC Ticket"
                            >
                              <Ticket className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(isSuperAdmin || isDno) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCandidate(c.id, c.candidateName)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filteredCandidates.length > 0 && (
          <div className="p-3.5 bg-white border-t border-[#DCE5F0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#62738D]">
            <div className="flex items-center gap-2">
              <span>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredCandidates.length)} of {filteredCandidates.length}
              </span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="ml-2 text-xs py-1 px-2 border border-[#DCE5F0] rounded-md bg-white text-[#102544]"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
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

      {/* Candidate Registration Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-xl w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#0866D9]" />
                <h3 className="font-bold text-sm text-[#102544]">Register Candidate Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#102544] mb-1">
                    Application ID <span className="text-[#D92D3A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. EN26123456"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg font-mono focus:border-[#0866D9] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">
                    Candidate Full Name <span className="text-[#D92D3A]">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Rohan Suresh Deshmukh"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg focus:border-[#0866D9] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">
                    Mobile Number <span className="text-[#D92D3A]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="e.g. 9822144521"
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg font-mono focus:border-[#0866D9] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Course Stream</label>
                  <select
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg bg-white outline-none"
                  >
                    {DEPARTMENT_COURSES.map((dept, i) => (
                      <optgroup key={i} label={`${dept.department}${dept.subCategory ? ` - ${dept.subCategory}` : ''}`}>
                        {dept.courses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Scrutiny Mode</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg bg-white outline-none"
                  >
                    <option value="E-Scrutiny">E-Scrutiny</option>
                    <option value="Physical Scrutiny">Physical Scrutiny</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#102544] mb-1">Verification Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg bg-white outline-none"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Objection Raised">Objection Raised</option>
                    <option value="Document Pending">Document Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#102544] mb-1">Remarks / Discrepancy Note</label>
                <textarea
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Domicile verified & stamped / Valid Caste Validity certificate submitted..."
                  className="w-full px-3 py-2 border border-[#DCE5F0] rounded-lg focus:border-[#0866D9] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#DCE5F0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0866D9] hover:bg-[#073B70] text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Dossier Detail Drawer */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-[#DCE5F0] p-6 max-w-lg w-full shadow-2xl text-[#102544] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5F0]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0866D9] px-2 py-0.5 rounded bg-[#EBF3FC]">
                  {selectedCandidate.applicationId}
                </span>
                <h3 className="font-bold text-sm text-[#102544] truncate">
                  {selectedCandidate.candidateName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Course Stream:</span>
                <span className="font-semibold text-[#102544]">{selectedCandidate.course}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Scrutiny Mode:</span>
                <span className="font-medium text-[#102544]">{selectedCandidate.scrutinyMode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Verification Status:</span>
                <span className="font-bold text-[#079669]">{selectedCandidate.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-[#62738D]">Mobile Contact:</span>
                <span className="font-mono text-[#102544]">{selectedCandidate.mobile}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#62738D]">Registered At:</span>
                <span className="text-[#62738D]">{new Date(selectedCandidate.createdAt).toLocaleString('en-IN')}</span>
              </div>
              {selectedCandidate.remarks && (
                <div className="pt-2 text-xs">
                  <span className="font-semibold text-[#102544] block mb-0.5">Scrutiny Note:</span>
                  <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-[#DCE5F0]">{selectedCandidate.remarks}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="w-full py-2.5 rounded-xl bg-[#073B70] hover:bg-[#092744] text-white font-bold text-xs cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      <FormValidationErrorModal
        isOpen={validationPopup.isOpen}
        onClose={() => setValidationPopup((prev) => ({ ...prev, isOpen: false }))}
        title={validationPopup.title}
        description={validationPopup.description}
        missingFields={validationPopup.missingFields}
        extraErrors={validationPopup.extraErrors}
      />
    </div>
  );
};
