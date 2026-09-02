import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  MessageCircle,
  FileText,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Phone,
  BookOpen,
  Trash2,
  Check,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { StudentRecord, UserProfile } from '../../types/auth';
import {
  getStudentRecords,
  subscribeToStudents,
  saveStudentRecord,
  deleteStudentRecord,
  hasFeaturePermission,
} from '../../services/authService';

interface StudentsViewProps {
  onOpenWhatsappTool: () => void;
  onOpenTicketTool: () => void;
  onOpenQrTool: () => void;
  currentUser?: UserProfile | null;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  onOpenWhatsappTool,
  onOpenTicketTool,
  onOpenQrTool,
  currentUser,
}) => {
  const [students, setStudents] = useState<StudentRecord[]>(() => getStudentRecords());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    const unsub = subscribeToStudents((list) => {
      setStudents(list);
    });
    return () => unsub();
  }, []);

  // Add Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCourse, setNewCourse] = useState('B.E. / B.Tech');
  const [newMode, setNewMode] = useState<'E-Scrutiny' | 'Physical Scrutiny'>('E-Scrutiny');
  const [newStatus, setNewStatus] = useState<'Verified' | 'Objection Raised' | 'Document Pending'>('Verified');
  const [newRemarks, setNewRemarks] = useState('');

  const refreshList = () => {
    setStudents(getStudentRecords());
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim() || !newMobile.trim()) {
      alert('Please fill in Application No, Name, and Mobile Number.');
      return;
    }

    const newRecord: StudentRecord = {
      id: newId.trim().toUpperCase(),
      name: newName.trim(),
      mobile: newMobile.trim(),
      email: newEmail.trim() || undefined,
      course: newCourse,
      mode: newMode,
      status: newStatus,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      remarks: newRemarks.trim() || 'Candidate profile registered in scrutiny desk',
      createdAt: new Date().toISOString(),
    };

    saveStudentRecord(newRecord);
    refreshList();
    setIsAddModalOpen(false);

    // Reset Form
    setNewId('');
    setNewName('');
    setNewMobile('');
    setNewEmail('');
    setNewRemarks('');
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete candidate record ${id} (${name})?`)) {
      deleteStudentRecord(id);
      refreshList();
    }
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.mobile.includes(searchTerm);

    const matchesCourse = selectedCourse === 'All' || s.course === selectedCourse;
    const matchesStatus = selectedStatus === 'All' || s.status === selectedStatus;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const canAdd = hasFeaturePermission(currentUser, 'add_candidate');
  const canWhatsapp = hasFeaturePermission(currentUser, 'whatsapp_tool');
  const canTicket = hasFeaturePermission(currentUser, 'ticket_generator_tool');
  const canQr = hasFeaturePermission(currentUser, 'qr_upload_tool');

  return (
    <div className="relative z-10 w-full space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Students</h2>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              {students.length} Records
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAdd && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              id="add-candidate-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          )}

          {canQr && (
            <button
              onClick={onOpenQrTool}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>QR Upload</span>
            </button>
          )}

          {canWhatsapp && (
            <button
              onClick={onOpenWhatsappTool}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send Notice</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white/80 p-3 rounded-xl border border-slate-200/80">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, candidate name, or mobile..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="All">All Courses</option>
            <option value="B.E. / B.Tech">B.E. / B.Tech</option>
            <option value="B.Pharmacy">B.Pharmacy</option>
            <option value="MBA / MMS">MBA / MMS</option>
            <option value="B.Sc Agriculture">B.Sc Agriculture</option>
            <option value="LLB 3 Yrs">LLB 3 Yrs</option>
            <option value="Polytechnic Diploma">Polytechnic Diploma</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Objection Raised">Objection Raised</option>
            <option value="Document Pending">Document Pending</option>
          </select>
        </div>
      </div>

      {/* Student Records Table or Empty State */}
      <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Candidate Records Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {students.length === 0
                  ? 'There are currently no candidate records in the database. Use "+ Add Candidate" or the tools above to register scrutiny candidates.'
                  : 'No records match your active search filters.'}
              </p>
            </div>
            {canAdd && students.length === 0 && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                + Register First Candidate
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/70">
                  <th className="py-3 px-4 font-semibold">Application No</th>
                  <th className="py-3 px-4 font-semibold">Candidate Info</th>
                  <th className="py-3 px-4 font-semibold">Course & Mode</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Verification Remarks</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{st.id}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{st.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{st.mobile}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{st.course}</p>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {st.mode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          st.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : st.status === 'Objection Raised'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {st.status === 'Verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {st.status === 'Objection Raised' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        {st.status === 'Document Pending' && <Clock className="w-3 h-3 text-blue-600" />}
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">{st.remarks}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canWhatsapp && (
                          <button
                            onClick={onOpenWhatsappTool}
                            title="Send WhatsApp Notice"
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        {canTicket && (
                          <button
                            onClick={onOpenTicketTool}
                            title="Generate Candidate Ticket"
                            className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(st.id, st.name)}
                          title="Delete Candidate Record"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Candidate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Register New Candidate</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-5 overflow-y-auto space-y-3.5 text-xs text-slate-900">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Application No: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. EN24109432"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Candidate Full Name: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Rohan Suresh Deshmukh"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobile Number: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="e.g. 9822144521"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Name:</label>
                  <select
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="B.E. / B.Tech">B.E. / B.Tech</option>
                    <option value="B.Pharmacy">B.Pharmacy</option>
                    <option value="MBA / MMS">MBA / MMS</option>
                    <option value="B.Sc Agriculture">B.Sc Agriculture</option>
                    <option value="LLB 3 Yrs">LLB 3 Yrs</option>
                    <option value="Polytechnic Diploma">Polytechnic Diploma</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scrutiny Mode:</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="E-Scrutiny">E-Scrutiny</option>
                    <option value="Physical Scrutiny">Physical Scrutiny</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Verification Status:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Objection Raised">Objection Raised</option>
                    <option value="Document Pending">Document Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Discrepancy Note:</label>
                <textarea
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. All documents verified & stamped / NCL certificate renewal required..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
