import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  Search,
  Download,
  Printer,
  Clock,
  Phone,
  Building2,
  Users,
  CheckCircle2,
  Edit2,
  Trash2,
  LogOut,
  XCircle,
  FileSpreadsheet,
  Check,
  RotateCcw,
  ListFilter,
  User,
  MapPin,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { VisitorRecord, VisitorType, UserProfile } from '../../types/auth';
import {
  getVisitorRecords,
  subscribeToVisitors,
  saveVisitorRecord,
  deleteVisitorRecord,
  checkoutVisitor,
  getNextVisitorSrNo,
  hasTabPermission,
  hasFeaturePermission,
} from '../../services/authService';
import { GoogleSheetsSyncModal } from '../GoogleSheetsSyncModal';
import {
  getSavedSheetsConfig,
  saveSheetsConfig,
  autoSyncVisitorRow,
  GoogleSheetsConfig,
  syncAllVisitorsToGoogleSheet,
  getCachedAccessToken,
} from '../../services/googleSheetsService';

interface VisitorsViewProps {
  currentUser?: UserProfile | null;
  onNavigateTab?: (tab: string) => void;
}

export const VisitorsView: React.FC<VisitorsViewProps> = ({ currentUser, onNavigateTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'entry_form'>('directory');
  const [visitors, setVisitors] = useState<VisitorRecord[]>(() => getVisitorRecords());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Google Sheets Integration State
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getSavedSheetsConfig());
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);

  // Modal State for Quick Popup Entry / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<VisitorRecord | null>(null);

  // Real-time Firestore visitors sync
  useEffect(() => {
    const unsub = subscribeToVisitors((list) => {
      setVisitors(list);
    });
    return () => unsub();
  }, []);

  // Refresh sheets config periodically or when modal closes
  useEffect(() => {
    setSheetsConfig(getSavedSheetsConfig());
  }, [isSheetsModalOpen]);

  // Form State
  const [srNo, setSrNo] = useState<number>(() => getNextVisitorSrNo());
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [timestamp, setTimestamp] = useState(() => {
    const d = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${d}, ${t}`;
  });
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [visitorType, setVisitorType] = useState<VisitorType>('Candidate');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('Document Verification & Scrutiny');
  const [customPurpose, setCustomPurpose] = useState('');
  const [checkInTime, setCheckInTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [checkOutTime, setCheckOutTime] = useState('');
  const [status, setStatus] = useState<'In Premises' | 'Checked Out'>('In Premises');
  const [candidateAppId, setCandidateAppId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({
    message: '',
    type: '',
  });

  const refreshList = () => {
    setVisitors(getVisitorRecords());
  };

  const getFormattedCurrentDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFormattedCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const resetFormState = () => {
    setEditingVisitor(null);
    const nextSr = getNextVisitorSrNo();
    setSrNo(nextSr);
    const todayStr = getFormattedCurrentDate();
    const nowTimeStr = getFormattedCurrentTime();
    setDate(todayStr);
    setTimestamp(`${todayStr}, ${nowTimeStr}`);
    setName('');
    setMobile('');
    setVisitorType('Candidate');
    setAddress('');
    setPurpose('Document Verification & Scrutiny');
    setCustomPurpose('');
    setCheckInTime(nowTimeStr);
    setCheckOutTime('');
    setStatus('In Premises');
    setCandidateAppId('');
    setRemarks('');
  };

  const openNewEntryModal = () => {
    resetFormState();
    setIsModalOpen(true);
  };

  const openEditModal = (v: VisitorRecord) => {
    setEditingVisitor(v);
    setSrNo(v.srNo);
    setDate(v.date);
    setTimestamp(v.timestamp);
    setName(v.name);
    setMobile(v.mobile);
    setVisitorType(v.visitorType);
    setAddress(v.address);
    setPurpose(v.purpose);
    setCheckInTime(v.checkInTime);
    setCheckOutTime(v.checkOutTime || '');
    setStatus(v.status);
    setCandidateAppId(v.candidateAppId || '');
    setRemarks(v.remarks || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent, isFromModal = false) => {
    e.preventDefault();

    if (!name.trim() || !mobile.trim()) {
      setFeedback({ message: 'Please provide both Visitor Name and Mobile Number.', type: 'error' });
      return;
    }

    const finalPurpose =
      purpose === 'Other' && customPurpose.trim()
        ? customPurpose.trim()
        : purpose.trim() || 'General Inquiry';

    const newRecord: VisitorRecord = {
      id: editingVisitor ? editingVisitor.id : `vis_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      srNo: srNo || 1,
      date: date || getFormattedCurrentDate(),
      timestamp: timestamp || `${date || getFormattedCurrentDate()}, ${checkInTime || getFormattedCurrentTime()}`,
      name: name.trim(),
      mobile: mobile.trim(),
      visitorType: visitorType,
      address: address.trim() || 'Washim',
      purpose: finalPurpose,
      checkInTime: checkInTime || getFormattedCurrentTime(),
      checkOutTime: checkOutTime.trim() ? checkOutTime.trim() : undefined,
      status: checkOutTime.trim() ? 'Checked Out' : status,
      candidateAppId: candidateAppId.trim() ? candidateAppId.trim().toUpperCase() : undefined,
      remarks: remarks.trim() || undefined,
      createdAt: editingVisitor ? editingVisitor.createdAt : new Date().toISOString(),
    };

    saveVisitorRecord(newRecord);
    refreshList();

    // Auto-sync row to Google Sheets if connected and enabled
    autoSyncVisitorRow(newRecord).then((synced) => {
      if (synced) {
        setSheetsConfig(getSavedSheetsConfig());
      }
    });

    // Close form modal, return to visitor directory table, and reset fields
    setIsModalOpen(false);
    setActiveSubTab('directory');
    resetFormState();

    setFeedback({
      message: `Entry saved successfully! Visitor entry #${newRecord.srNo} for "${newRecord.name}" recorded in register${
        sheetsConfig?.spreadsheetId ? ' & synced to Google Sheets' : ''
      }.`,
      type: 'success',
    });

    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 5000);
  };

  const handleQuickCheckOut = (id: string, visitorName: string) => {
    const timeNow = getFormattedCurrentTime();
    checkoutVisitor(id, timeNow);
    refreshList();

    // If active in Google Sheets, re-sync visitor record
    const updated = getVisitorRecords().find((v) => v.id === id);
    if (updated) {
      autoSyncVisitorRow(updated).then(() => {
        setSheetsConfig(getSavedSheetsConfig());
      });
    }
  };

  const handleDelete = (id: string, visitorName: string) => {
    if (window.confirm(`Delete visitor entry for "${visitorName}"?`)) {
      deleteVisitorRecord(id);
      refreshList();
    }
  };

  const handleExportCsv = () => {
    if (visitors.length === 0) {
      alert('No visitor records to export.');
      return;
    }

    const headers = [
      'Sr No',
      'Date Time Stamp',
      'Visitor Name',
      'Mobile Number',
      'Visitor Type',
      'Address',
      'Purpose of Visit',
      'Check In Time',
      'Check Out Time',
      'Status',
      'Candidate App ID',
      'Remarks',
    ];

    const csvRows = visitors.map((v) => [
      `"${v.srNo}"`,
      `"${v.timestamp}"`,
      `"${v.name.replace(/"/g, '""')}"`,
      `"${v.mobile}"`,
      `"${v.visitorType}"`,
      `"${(v.address || '').replace(/"/g, '""')}"`,
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      `"${v.checkInTime}"`,
      `"${v.checkOutTime || ''}"`,
      `"${v.status}"`,
      `"${v.candidateAppId || ''}"`,
      `"${(v.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `VMK_Washim_Visitors_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.mobile.includes(searchTerm) ||
      v.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(v.srNo).includes(searchTerm) ||
      (v.candidateAppId && v.candidateAppId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'All' || v.visitorType === selectedType;
    const matchesStatus = selectedStatus === 'All' || v.status === selectedStatus;
    const matchesDate = !selectedDate || v.date.includes(selectedDate);

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // Calculate Metrics
  const totalCount = visitors.length;
  const inPremisesCount = visitors.filter((v) => v.status === 'In Premises').length;
  const checkedOutCount = visitors.filter((v) => v.status === 'Checked Out').length;
  const candidateCount = visitors.filter((v) => v.visitorType === 'Candidate').length;
  const parentCount = visitors.filter((v) => v.visitorType === 'Parent').length;
  const instituteCount = visitors.filter((v) => v.visitorType === 'Institute').length;
  const otherCount = visitors.filter((v) => v.visitorType === 'Other').length;

  const canAddVisitor = hasFeaturePermission(currentUser, 'add_visitor');
  const canExport = hasFeaturePermission(currentUser, 'export_reports');
  const canSheets = hasTabPermission(currentUser, 'google_sheets');
  const isDnoAdmin = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';

  const purposePresets = [
    'Document Verification & Scrutiny',
    'Discrepancy Resolution & Re-upload',
    'Option Form Filling Guidance',
    'Seat Allotment & Reporting Inquiry',
    'Category / NCL / EWS Validity Query',
    'Meeting with DNO Officer',
    'Institute Coordination / Quota',
    'General Admission Helpdesk',
    'Other',
  ];

  return (
    <div className="relative z-10 w-full space-y-6 select-text">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Visitors Entry</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                Register
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab Switcher: Directory vs Entry Form (Entry form only shown if user has add_visitor permission) */}
          {canAddVisitor ? (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveSubTab('directory')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSubTab === 'directory'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Directory ({visitors.length})
              </button>
              <button
                onClick={() => {
                  resetFormState();
                  setActiveSubTab('entry_form');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'entry_form'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Entry Form</span>
              </button>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 border border-slate-200">
              Directory ({visitors.length})
            </div>
          )}

          {canSheets && (
            <button
              onClick={() => {
                if (onNavigateTab) {
                  onNavigateTab('google_sheets');
                } else {
                  setIsSheetsModalOpen(true);
                }
              }}
              id="google-sheets-sync-btn"
              title="Google Sheets Live Sync"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                sheetsConfig?.spreadsheetId
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
              }`}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${sheetsConfig?.spreadsheetId ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>Google Sheets</span>
              {sheetsConfig?.spreadsheetId && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Google Sheets Connected" />
              )}
            </button>
          )}

          {canExport && (
            <>
              <button
                onClick={handleExportCsv}
                title="Download CSV Register"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                onClick={handlePrint}
                title="Print Entry Register"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </>
          )}

          {canAddVisitor && activeSubTab === 'directory' && (
            <button
              onClick={openNewEntryModal}
              id="new-visitor-entry-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Fast Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/85 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Visitors</p>
            <p className="text-xl font-black text-slate-900 font-mono">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 relative">
            <Clock className="w-5 h-5" />
            {inPremisesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Inside Center</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black text-emerald-700 font-mono">{inPremisesCount}</span>
              {inPremisesCount > 0 && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Checked Out</p>
            <p className="text-xl font-black text-slate-700 font-mono">{checkedOutCount}</p>
          </div>
        </div>

        <div className="bg-white/85 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Breakdown</p>
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {candidateCount} Cand • {parentCount} Par • {instituteCount} Inst {otherCount > 0 ? `• ${otherCount} Oth` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback({ message: '', type: '' })}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: DEDICATED VISITOR ENTRY FORM */}
      {activeSubTab === 'entry_form' && (
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Visitor Registration & Entry Form</span>
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-700/80 rounded-lg font-bold">
                Auto Sr No: #{srNo}
              </span>
              <span className="text-xs text-slate-300 font-mono bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                VMK-WSM
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={(e) => handleFormSubmit(e, false)} className="space-y-5 text-xs text-slate-900">
            {/* Row 1: Sr No, Date Time Stamp */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sr. No. *</label>
                <input
                  type="number"
                  value={srNo}
                  onChange={(e) => setSrNo(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Date Time Stamp *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const d = getFormattedCurrentDate();
                      const t = getFormattedCurrentTime();
                      setDate(d);
                      setTimestamp(`${d}, ${t}`);
                      setCheckInTime(t);
                    }}
                    className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Sync Current Time
                  </button>
                </div>
                <input
                  type="text"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  required
                  placeholder="e.g. 24 Aug 2026, 10:45 AM"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Row 2: Visitor Type Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase">
                Visitor Type (Candidate / Parent / Institute / Other) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Candidate', 'Parent', 'Institute', 'Other'] as VisitorType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVisitorType(type)}
                    className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      visitorType === type
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-100 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{type}</span>
                    {visitorType === type && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Name & Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand R. Deshmukh"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9822144521"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-indigo-600 text-xs bg-white"
                />
              </div>
            </div>

            {/* Row 4: Address & Optional Candidate Application ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Address / Village / Town / District *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Risod, Washim / Karanja Lad"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Candidate Application ID (Optional)
                </label>
                <input
                  type="text"
                  value={candidateAppId}
                  onChange={(e) => setCandidateAppId(e.target.value)}
                  placeholder="e.g. EN24109432 / PH24..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:border-indigo-600 text-xs bg-white"
                />
              </div>
            </div>

            {/* Row 5: Purpose of Visit */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Purpose of Visit *
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 text-xs mb-2"
              >
                {purposePresets.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {purpose === 'Other' && (
                <input
                  type="text"
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="Please specify specific purpose of visit..."
                  required
                  className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-xl bg-indigo-50/40 focus:outline-none focus:border-indigo-600 text-xs"
                />
              )}
            </div>

            {/* Row 6: Check-In & Check-Out Time */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Check-In Time *</label>
                  <button
                    type="button"
                    onClick={() => setCheckInTime(getFormattedCurrentTime())}
                    className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Set Current Time
                  </button>
                </div>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  placeholder="e.g. 10:30 AM"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Check-Out Time (Optional)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const now = getFormattedCurrentTime();
                      setCheckOutTime(now);
                      setStatus('Checked Out');
                    }}
                    className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Mark Check-Out Now
                  </button>
                </div>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => {
                    setCheckOutTime(e.target.value);
                    if (e.target.value.trim()) {
                      setStatus('Checked Out');
                    }
                  }}
                  placeholder="e.g. 11:15 AM (leave blank if active)"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Row 7: Remarks */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Remarks / Token Note (Optional)</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Token #14 issued, document scrutiny completed by Operator 1"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 text-xs bg-white"
              />
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={resetFormState}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('directory')}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  View Directory Logs
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Save Visitor Entry</span>
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* VIEW 2: DIRECTORY LOGS TABLE & FILTERS */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Google Sheets Sync Status Ribbon - Only shown for DNO Admin */}
          {isDnoAdmin && sheetsConfig?.spreadsheetId ? (
            <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-950 truncate max-w-[200px] sm:max-w-[320px]">
                      {sheetsConfig.spreadsheetTitle || 'Visitors Entry Register'}
                    </span>
                    {sheetsConfig.autoSync && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                        <Zap className="w-2.5 h-2.5 text-emerald-700" />
                        Auto-Sync Live
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-800 flex items-center gap-1.5 mt-0.5">
                    <span>
                      Last Synced:{' '}
                      {sheetsConfig.lastSyncedAt
                        ? new Date(sheetsConfig.lastSyncedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : 'Ready to sync'}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{visitors.length} total entries</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!getCachedAccessToken()) {
                      setIsSheetsModalOpen(true);
                      return;
                    }
                    setIsQuickSyncing(true);
                    try {
                      await syncAllVisitorsToGoogleSheet(
                        sheetsConfig.spreadsheetId,
                        sheetsConfig.sheetName || 'Visitors_Register',
                        visitors
                      );
                      const updated = { ...sheetsConfig, lastSyncedAt: new Date().toISOString() };
                      saveSheetsConfig(updated);
                      setSheetsConfig(updated);
                      setFeedback({
                        message: `Synced ${visitors.length} visitor entries to Google Sheets!`,
                        type: 'success',
                      });
                      setTimeout(() => setFeedback({ message: '', type: '' }), 3500);
                    } catch (err: any) {
                      setFeedback({ message: err.message || 'Sync failed.', type: 'error' });
                    } finally {
                      setIsQuickSyncing(false);
                    }
                  }}
                  disabled={isQuickSyncing}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  title="Push all visitor entries to Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQuickSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isQuickSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>

                {sheetsConfig.spreadsheetUrl && (
                  <a
                    href={sheetsConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                    title="Open Spreadsheet in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={() => setIsSheetsModalOpen(true)}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline px-1 cursor-pointer"
                >
                  Manage
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>
                  Backup & store visitor entries directly in <b>Google Sheets</b>
                </span>
              </div>
              <button
                onClick={() => setIsSheetsModalOpen(true)}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Connect Google Sheets</span>
                <span className="text-[10px]">→</span>
              </button>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Sr No, Name, Mobile, Address, Purpose..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Visitor Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Types</option>
                <option value="Candidate">Candidate</option>
                <option value="Parent">Parent / Guardian</option>
                <option value="Institute">Institute Rep</option>
                <option value="Other">Other</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Statuses</option>
                <option value="In Premises">Inside Center (Active)</option>
                <option value="Checked Out">Checked Out</option>
              </select>
            </div>
          </div>

          {/* Visitors Directory Table */}
          <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs shadow-xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Visitors Directory Register ({filteredVisitors.length})
                  </h3>
                  {filteredVisitors.length !== visitors.length && (
                    <span className="text-[11px] text-slate-300">Filtered from {visitors.length} total entries</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-indigo-200 bg-slate-800/90 font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-700">
                Center Code: VMK-WSM
              </span>
            </div>

            {filteredVisitors.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">No Visitor Entries Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    {visitors.length === 0
                      ? 'No walk-in visitors have been logged yet. Click "Entry Form" or "+ Fast Entry" to register the first visitor arrival.'
                      : 'No visitor entries match your search and filter criteria.'}
                  </p>
                </div>
                {canAddVisitor && (
                  <button
                    onClick={() => {
                      resetFormState();
                      setActiveSubTab('entry_form');
                    }}
                    className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    + Open Visitor Entry Form
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white border-b-2 border-slate-800">
                    <tr className="text-white font-bold uppercase text-[11px] tracking-wider">
                      <th className="py-3.5 px-4 font-bold text-white w-16">Sr. No.</th>
                      <th className="py-3.5 px-4 font-bold text-white">Date Time Stamp</th>
                      <th className="py-3.5 px-4 font-bold text-white">Visitor Name & Type</th>
                      <th className="py-3.5 px-4 font-bold text-white">Mobile & Address</th>
                      <th className="py-3.5 px-4 font-bold text-white">Purpose of Visit</th>
                      <th className="py-3.5 px-3 font-bold text-white">Check-In</th>
                      <th className="py-3.5 px-3 font-bold text-white">Check-Out</th>
                      <th className="py-3.5 px-4 font-bold text-white">Status</th>
                      <th className="py-3.5 px-4 font-bold text-white text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVisitors.map((v) => {
                      const isInPremises = v.status === 'In Premises';

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Sr No */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs border border-slate-200">
                              #{v.srNo}
                            </span>
                          </td>

                          {/* Date Time Stamp */}
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{v.timestamp || `${v.date}, ${v.checkInTime}`}</p>
                          </td>

                          {/* Visitor Name & Type */}
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 text-xs">{v.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full border uppercase tracking-wider ${
                                  v.visitorType === 'Candidate'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : v.visitorType === 'Parent'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : v.visitorType === 'Institute'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {v.visitorType}
                              </span>
                              {v.candidateAppId && (
                                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                  {v.candidateAppId}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Mobile & Address */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 font-mono font-semibold text-slate-800">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <a href={`tel:${v.mobile}`} className="hover:text-indigo-600 hover:underline">
                                {v.mobile}
                              </a>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                              {v.address || 'Washim'}
                            </p>
                          </td>

                          {/* Purpose */}
                          <td className="py-3.5 px-4 max-w-[200px]">
                            <p className="font-medium text-slate-800 leading-snug">{v.purpose}</p>
                            {v.remarks && (
                              <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                                Note: {v.remarks}
                              </p>
                            )}
                          </td>

                          {/* Check-In */}
                          <td className="py-3.5 px-3 font-mono font-medium text-slate-700">
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                              {v.checkInTime}
                            </span>
                          </td>

                          {/* Check-Out */}
                          <td className="py-3.5 px-3 font-mono">
                            {v.checkOutTime ? (
                              <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                {v.checkOutTime}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleQuickCheckOut(v.id, v.name)}
                                title="Click to check-out visitor now"
                                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                              >
                                <LogOut className="w-3 h-3" />
                                <span>Check Out</span>
                              </button>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isInPremises
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isInPremises ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              {isInPremises ? 'In Center' : 'Checked Out'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(v)}
                                title="Edit Visitor Entry"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDelete(v.id, v.name)}
                                title="Delete Visitor Entry"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
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
            )}
          </div>
        </div>
      )}

      {/* QUICK ENTRY / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {editingVisitor ? `Edit Visitor Entry (Sr No. #${srNo})` : 'New Visitor Entry Registration'}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form onSubmit={(e) => handleFormSubmit(e, true)} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-900 text-xs">
              {/* Top Meta Details: Sr No, Date, Timestamp */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sr. No. *</label>
                  <input
                    type="number"
                    value={srNo}
                    onChange={(e) => setSrNo(Number(e.target.value))}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Date Time Stamp *</label>
                  <input
                    type="text"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* Visitor Type Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase">
                  Visitor Type (Candidate / Parent / Institute / Other) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Candidate', 'Parent', 'Institute', 'Other'] as VisitorType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVisitorType(type)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        visitorType === type
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-100 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{type}</span>
                      {visitorType === type && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name and Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Anand R. Deshmukh"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9822144521"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
              </div>

              {/* Address and Optional Candidate ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Address / Village / Town *
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Risod, Washim / Karanja Lad"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Candidate Application ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={candidateAppId}
                    onChange={(e) => setCandidateAppId(e.target.value)}
                    placeholder="e.g. EN24109432 / PH24..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:border-indigo-600 text-xs"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Purpose of Visit *
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-600 text-xs mb-2"
                >
                  {purposePresets.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                {purpose === 'Other' && (
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="Specify other purpose..."
                    required
                    className="w-full px-3 py-2 border border-indigo-300 rounded-xl bg-indigo-50/40 focus:outline-none focus:border-indigo-600 text-xs"
                  />
                )}
              </div>

              {/* Check-In and Check-Out Time */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Check-In Time *</label>
                    <button
                      type="button"
                      onClick={() => setCheckInTime(getFormattedCurrentTime())}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Set Current Time
                    </button>
                  </div>
                  <input
                    type="text"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Check-Out Time (Optional)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const now = getFormattedCurrentTime();
                        setCheckOutTime(now);
                        setStatus('Checked Out');
                      }}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Mark Check-Out Now
                    </button>
                  </div>
                  <input
                    type="text"
                    value={checkOutTime}
                    onChange={(e) => {
                      setCheckOutTime(e.target.value);
                      if (e.target.value.trim()) {
                        setStatus('Checked Out');
                      }
                    }}
                    placeholder="e.g. 11:15 AM (leave blank if active)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Token Note (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Token #14 issued, document scrutiny completed by Operator 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {editingVisitor ? 'Save Entry Changes' : 'Save Visitor Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Synchronization Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        visitors={visitors}
        onSyncComplete={(msg) => {
          setFeedback({ message: msg, type: 'success' });
          setSheetsConfig(getSavedSheetsConfig());
          setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
        }}
      />
    </div>
  );
};
