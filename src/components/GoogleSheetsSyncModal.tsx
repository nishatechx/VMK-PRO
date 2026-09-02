import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  Link as LinkIcon,
  LogOut,
  ShieldCheck,
  Zap,
  Clock,
  Database,
  Copy,
  KeyRound,
  Download,
} from 'lucide-react';
import { VisitorRecord } from '../types/auth';
import {
  signInWithGoogleSheets,
  disconnectGoogleSheets,
  createVisitorsSpreadsheet,
  syncAllVisitorsToGoogleSheet,
  getSavedSheetsConfig,
  saveSheetsConfig,
  GoogleSheetsConfig,
  getCachedAccessToken,
  setManualAccessToken,
} from '../services/googleSheetsService';
import { firebaseConfig } from '../lib/firebase';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitors: VisitorRecord[];
  onSyncComplete?: (message: string) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  visitors,
  onSyncComplete,
}) => {
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(() => getSavedSheetsConfig());
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => !!getCachedAccessToken());
  const [userEmail, setUserEmail] = useState<string>(config?.userEmail || '');
  const [userName, setUserName] = useState<string>(config?.userName || '');
  
  // Custom spreadsheet link/id input
  const [customSheetId, setCustomSheetId] = useState<string>('');
  const [isLinkingExisting, setIsLinkingExisting] = useState<boolean>(false);
  
  // Manual Access Token & Error Diagnostics
  const [showManualTokenInput, setShowManualTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [sheetsApiEnableUrl, setSheetsApiEnableUrl] = useState<string>(
    'https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=700750943390'
  );
  const [authSetupErrorType, setAuthSetupErrorType] = useState<
    'operation-not-allowed' | 'popup-blocked' | 'unauthorized-domain' | 'sheets-api-disabled' | null
  >(null);

  // Action states
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' | '' }>({
    message: '',
    type: '',
  });

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  useEffect(() => {
    const saved = getSavedSheetsConfig();
    setConfig(saved);
    if (saved?.userEmail) setUserEmail(saved.userEmail);
    if (saved?.userName) setUserName(saved.userName);
    setIsSignedIn(!!getCachedAccessToken());
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyCurrentDomain = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setFeedback({ message: '', type: '' });
    setAuthSetupErrorType(null);
    try {
      const { user, accessToken } = await signInWithGoogleSheets();
      setIsSignedIn(true);
      const email = user.email || 'Connected User';
      const name = user.displayName || 'Google Account';
      setUserEmail(email);
      setUserName(name);

      const existingConfig = getSavedSheetsConfig();
      const updatedConfig: GoogleSheetsConfig = existingConfig
        ? { ...existingConfig, userEmail: email, userName: name }
        : {
            spreadsheetId: '',
            spreadsheetUrl: '',
            spreadsheetTitle: 'Visitors Entry Register',
            sheetName: 'Visitors_Register',
            autoSync: true,
            userEmail: email,
            userName: name,
          };
      saveSheetsConfig(updatedConfig);
      setConfig(updatedConfig);

      setFeedback({
        message: `Successfully connected as ${email}! You can now create or link a Google Sheet.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      const code = err?.code || '';
      const msg = err?.message || '';

      if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setAuthSetupErrorType('operation-not-allowed');
        setFeedback({
          message: `Google Sign-In is not enabled in Firebase project (${firebaseConfig.projectId}). Enable it in Firebase Console -> Authentication -> Sign-in method.`,
          type: 'error',
        });
      } else if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setAuthSetupErrorType('popup-blocked');
        setFeedback({
          message: `Popup was blocked by your browser. Please allow popups or open the app in a new tab.`,
          type: 'error',
        });
      } else if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setAuthSetupErrorType('unauthorized-domain');
        setFeedback({
          message: `Firebase Domain Authorization: Domain "${currentHostname}" is not yet added in Firebase Console.`,
          type: 'error',
        });
      } else {
        setFeedback({
          message: msg || 'Google Sign-In was cancelled or failed.',
          type: 'error',
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleManualTokenSubmit = () => {
    if (!manualToken.trim()) {
      setFeedback({ message: 'Please enter a valid Google OAuth Access Token.', type: 'error' });
      return;
    }

    setManualAccessToken(manualToken.trim(), 'Google Authorized Officer', 'Workspace Account');
    setIsSignedIn(true);
    setUserEmail('Authorized Token User');
    setUserName('Workspace Officer');
    setShowManualTokenInput(false);
    setAuthSetupErrorType(null);

    const existingConfig = getSavedSheetsConfig();
    const updatedConfig: GoogleSheetsConfig = existingConfig
      ? { ...existingConfig, userEmail: 'Authorized Token User', userName: 'Workspace Officer' }
      : {
          spreadsheetId: '',
          spreadsheetUrl: '',
          spreadsheetTitle: 'Visitors Entry Register',
          sheetName: 'Visitors_Register',
          autoSync: true,
          userEmail: 'Authorized Token User',
          userName: 'Workspace Officer',
        };
    saveSheetsConfig(updatedConfig);
    setConfig(updatedConfig);

    setFeedback({
      message: 'Access Token applied successfully! You can now create or sync Google Sheets.',
      type: 'success',
    });
  };

  const handleDownloadCsv = () => {
    if (visitors.length === 0) {
      setFeedback({ message: 'No visitor entries to export.', type: 'error' });
      return;
    }

    const headers = [
      'Sr No',
      'Date & Time Stamp',
      'Date',
      'Visitor Name',
      'Mobile Number',
      'Visitor Type',
      'Address / Location',
      'Purpose of Visit',
      'Check In Time',
      'Check Out Time',
      'Status',
      'Candidate App ID',
      'Remarks',
    ];

    const rows = visitors.map((v) => [
      v.srNo,
      `"${(v.timestamp || `${v.date} ${v.checkInTime}`).replace(/"/g, '""')}"`,
      `"${v.date.replace(/"/g, '""')}"`,
      `"${v.name.replace(/"/g, '""')}"`,
      `"${v.mobile.replace(/"/g, '""')}"`,
      `"${v.visitorType.replace(/"/g, '""')}"`,
      `"${(v.address || 'Washim').replace(/"/g, '""')}"`,
      `"${v.purpose.replace(/"/g, '""')}"`,
      `"${v.checkInTime.replace(/"/g, '""')}"`,
      `"${(v.checkOutTime || '').replace(/"/g, '""')}"`,
      `"${v.status.replace(/"/g, '""')}"`,
      `"${(v.candidateAppId || '').replace(/"/g, '""')}"`,
      `"${(v.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Visitors_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedback({
      message: `Downloaded ${visitors.length} visitor record(s) as CSV file.`,
      type: 'success',
    });
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleSheets();
      setIsSignedIn(false);
      saveSheetsConfig(null);
      setConfig(null);
      setUserEmail('');
      setUserName('');
      setFeedback({
        message: 'Disconnected from Google Sheets.',
        type: 'info',
      });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to disconnect.', type: 'error' });
    }
  };

  const handleCreateSheet = async () => {
    if (!isSignedIn) {
      await handleGoogleSignIn();
      return;
    }

    setIsCreatingSheet(true);
    setFeedback({ message: '', type: '' });
    try {
      const title = `Visitors Entry Register ${new Date().getFullYear()}`;
      const result = await createVisitorsSpreadsheet(title);

      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        spreadsheetTitle: title,
        sheetName: result.sheetName,
        autoSync: true,
        lastSyncedAt: new Date().toISOString(),
        userEmail: userEmail,
        userName: userName,
      };

      saveSheetsConfig(newConfig);
      setConfig(newConfig);

      // Now sync all existing visitor records to it immediately
      if (visitors.length > 0) {
        await syncAllVisitorsToGoogleSheet(result.spreadsheetId, result.sheetName, visitors);
      }

      setFeedback({
        message: `Created new Google Sheet "${title}" and synced ${visitors.length} visitor record(s)!`,
        type: 'success',
      });

      if (onSyncComplete) {
        onSyncComplete(`Connected & Synced ${visitors.length} visitors to Google Sheets.`);
      }
    } catch (err: any) {
      console.error(err);
      const isApiDisabled =
        err?.code === 'sheets/api-disabled' ||
        err?.message?.includes('Google Sheets API has not been used') ||
        err?.message?.includes('disabled') ||
        err?.message?.includes('sheets.googleapis.com');

      if (isApiDisabled) {
        setAuthSetupErrorType('sheets-api-disabled');
        if (err.enableUrl) {
          setSheetsApiEnableUrl(err.enableUrl);
        }
        setFeedback({
          message: 'Google Sheets API is disabled in your Google Cloud Project. Please click "Enable Sheets API" below to activate it.',
          type: 'error',
        });
      } else {
        setFeedback({
          message: err.message || 'Failed to create Google Sheet. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleLinkExistingSheet = async () => {
    if (!customSheetId.trim()) {
      setFeedback({ message: 'Please enter a valid Google Spreadsheet ID or URL.', type: 'error' });
      return;
    }

    let parsedId = customSheetId.trim();
    const match = customSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      parsedId = match[1];
    }

    const title = 'Connected Google Sheet';
    const newConfig: GoogleSheetsConfig = {
      spreadsheetId: parsedId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${parsedId}/edit`,
      spreadsheetTitle: title,
      sheetName: 'Visitors_Register',
      autoSync: true,
      userEmail: userEmail,
      userName: userName,
    };

    saveSheetsConfig(newConfig);
    setConfig(newConfig);
    setIsLinkingExisting(false);
    setCustomSheetId('');

    setFeedback({
      message: `Linked Spreadsheet ID: ${parsedId}. Click "Sync All Now" to push current visitors.`,
      type: 'success',
    });
  };

  const handleSyncAllNow = async () => {
    if (!config?.spreadsheetId) {
      setFeedback({ message: 'No Google Sheet connected. Create or link one first.', type: 'error' });
      return;
    }

    if (!isSignedIn) {
      setFeedback({ message: 'Please sign in with Google to continue syncing.', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setFeedback({ message: '', type: '' });
    try {
      await syncAllVisitorsToGoogleSheet(config.spreadsheetId, config.sheetName || 'Visitors_Register', visitors);
      
      const updatedConfig = {
        ...config,
        lastSyncedAt: new Date().toISOString(),
      };
      saveSheetsConfig(updatedConfig);
      setConfig(updatedConfig);

      setFeedback({
        message: `Successfully synced ${visitors.length} visitor record(s) to Google Sheets!`,
        type: 'success',
      });

      if (onSyncComplete) {
        onSyncComplete(`Successfully synced ${visitors.length} records to Google Sheet.`);
      }
    } catch (err: any) {
      console.error(err);
      const isApiDisabled =
        err?.code === 'sheets/api-disabled' ||
        err?.message?.includes('Google Sheets API has not been used') ||
        err?.message?.includes('disabled') ||
        err?.message?.includes('sheets.googleapis.com');

      if (isApiDisabled) {
        setAuthSetupErrorType('sheets-api-disabled');
        if (err.enableUrl) {
          setSheetsApiEnableUrl(err.enableUrl);
        }
        setFeedback({
          message: 'Google Sheets API is disabled in your Google Cloud Project. Please click "Enable Sheets API" below to activate it.',
          type: 'error',
        });
      } else {
        setFeedback({
          message: err.message || 'Failed to sync to Google Sheets. Verify permissions.',
          type: 'error',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAutoSync = () => {
    if (!config) return;
    const updated = { ...config, autoSync: !config.autoSync };
    saveSheetsConfig(updated);
    setConfig(updated);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="google-sheets-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#001D3D]/70 backdrop-blur-xs overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="google-sheets-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-[#F7F9FC] text-[#1F2937] rounded-2xl shadow-2xl border border-[#D9E1EA] overflow-hidden my-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#003B73] text-white px-6 py-4 border-b border-[#002850] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0056A6] flex items-center justify-center text-white shadow-xs border border-white/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Google Sheets Live Sync</span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                      Auto-Save
                    </span>
                  </h2>
                  <p className="text-xs text-blue-100">
                    Store and synchronize Visitor Entry logs directly to your Google Spreadsheet
                  </p>
                </div>
              </div>

              <button
                id="close-sheets-modal"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              {/* Feedback Alert */}
              {feedback.message && (
                <div
                  className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border flex items-start gap-2.5 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : feedback.type === 'error'
                      ? 'bg-rose-50 text-rose-900 border-rose-200'
                      : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                  }`}
                >
                  {feedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                  {feedback.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                  {feedback.type === 'info' && <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />}
                  <span className="flex-1 leading-relaxed">{feedback.message}</span>
                </div>
              )}

              {/* Firebase Diagnostic Helper Cards */}
              {authSetupErrorType === 'operation-not-allowed' && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-3 text-xs text-rose-900 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-950 text-sm">
                        Action Required: Enable Google Sign-In in Firebase Console
                      </h4>
                      <p className="text-rose-800 mt-1 leading-relaxed">
                        Google Authentication provider is not yet turned ON for Firebase project <b>({firebaseConfig.projectId})</b>.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-rose-200 space-y-2">
                    <p className="font-bold text-slate-800">Quick 2-Click Setup:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                      <li>Click the button below to open <b>Sign-in method</b> in Firebase Console.</li>
                      <li>Click <b>Google</b> provider, toggle <b>Enable</b>, select support email, and click <b>Save</b>.</li>
                    </ol>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors text-xs"
                      >
                        <span>Enable Google Sign-In in Firebase</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {authSetupErrorType === 'popup-blocked' && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 text-xs text-amber-900 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-sm">
                        Browser Popup Was Blocked
                      </h4>
                      <p className="text-amber-800 mt-1 leading-relaxed">
                        Your browser or preview container prevented the Google login window from opening.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                    <p className="font-bold text-slate-800">Choose one of the following solutions:</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleOpenInNewTab}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open App in Full Tab</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowManualTokenInput(true)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Use Direct Access Token</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadCsv}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV Instead</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {authSetupErrorType === 'unauthorized-domain' && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 text-xs text-amber-900 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-sm">
                        Firebase Authorized Domain Setup Required (1-Minute Fix)
                      </h4>
                      <p className="text-amber-800 mt-1 leading-relaxed">
                        Google Firebase Authentication blocks popup logins from preview domains until added to your Firebase project (<b>{firebaseConfig.projectId}</b>).
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                    <p className="font-bold text-slate-800">Quick 2-Step Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                      <li>
                        Copy this domain:{' '}
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-900 font-bold">
                          {currentHostname}
                        </code>
                      </li>
                      <li>
                        In Firebase Console, go to: <b>Authentication &rarr; Settings &rarr; Authorized domains</b> and click <b>"Add domain"</b>.
                      </li>
                    </ol>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={copyCurrentDomain}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedDomain ? 'Domain Copied!' : 'Copy Domain'}</span>
                      </button>

                      <a
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <span>Open Firebase Auth Settings</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {authSetupErrorType === 'sheets-api-disabled' && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 text-xs text-amber-900 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-sm">
                        One-Time Setup: Google Sheets API Needs to be Enabled
                      </h4>
                      <p className="text-amber-800 mt-1 leading-relaxed">
                        Google Cloud requires turning ON the Google Sheets API for project <b>(700750943390 / {firebaseConfig.projectId})</b> before spreadsheets can be created or updated via API.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                    <p className="font-bold text-slate-800">Quick 1-Click Activation:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                      <li>Click the button below to open Google Cloud Console API overview.</li>
                      <li>Click the blue <b>"ENABLE"</b> button.</li>
                      <li>Return here and click <b>"Create New Google Sheet"</b> or <b>"Sync All Now"</b>.</li>
                    </ol>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={sheetsApiEnableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs shadow-xs"
                      >
                        <span>Enable Google Sheets API (Google Console)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={handleDownloadCsv}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV Instead (Instant)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Authentication Card */}
              {!isSignedIn ? (
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-center space-y-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 mx-auto flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Connect your Google Account</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Grant secure permission to create and append visitor registers directly in your Google Drive & Google Sheets.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      id="btn-google-signin"
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                      className="inline-flex items-center gap-3 px-6 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSigningIn ? (
                        <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowManualTokenInput(!showManualTokenInput)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>{showManualTokenInput ? 'Hide Token Input' : 'Direct OAuth Token'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Instant Export CSV</span>
                    </button>
                  </div>

                  {/* Direct Manual Token Input Box */}
                  {showManualTokenInput && (
                    <div className="p-4 bg-white rounded-xl border border-blue-200 text-left space-y-2 mt-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          <span>Paste Google OAuth Access Token (ya29...):</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Bypasses domain restriction</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          placeholder="ya29.a0AcM612..."
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-600"
                        />
                        <button
                          type="button"
                          onClick={handleManualTokenSubmit}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Authenticated Account Info */
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {userName ? userName.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-950">{userName || 'Google Account'}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Connected
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-mono mt-0.5">{userEmail || 'OAuth Active'}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnect}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-rose-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}

              {/* Step 2: Spreadsheet Connection & Actions */}
              {isSignedIn && (
                <div className="space-y-4">
                  {config?.spreadsheetId ? (
                    /* Active Linked Spreadsheet Card */
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Active Destination Spreadsheet
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>{config.spreadsheetTitle || 'Visitors Entry Register'}</span>
                          </h4>
                        </div>

                        {config.spreadsheetUrl && (
                          <a
                            href={config.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors shadow-2xs"
                          >
                            <span>Open in Google Sheets</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Spreadsheet Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block text-[11px]">Sheet Tab Name</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {config.sheetName || 'Visitors_Register'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block text-[11px]">Spreadsheet ID</span>
                          <span className="font-mono text-slate-800 text-[11px] truncate block" title={config.spreadsheetId}>
                            {config.spreadsheetId}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 font-semibold block text-[11px]">Last Sync Timestamp</span>
                            <span className="text-slate-700 font-medium text-xs flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {config.lastSyncedAt
                                ? new Date(config.lastSyncedAt).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true,
                                  })
                                : 'Not synced yet'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-400 font-semibold block text-[11px]">Current Records</span>
                            <span className="font-bold text-slate-900 text-xs">{visitors.length} entries</span>
                          </div>
                        </div>
                      </div>

                      {/* Auto-Sync Switch */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              config.autoSync ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Auto-Append New Visitors</p>
                            <p className="text-[11px] text-slate-500">
                              Instantly write new entries and checkout logs to this spreadsheet
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={toggleAutoSync}
                          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            config.autoSync ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
                          }`}
                        >
                          <motion.div
                            layout
                            className="bg-white w-4 h-4 rounded-full shadow-xs"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      {/* Manual Sync All Button */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          id="btn-sync-all-sheets"
                          onClick={handleSyncAllNow}
                          disabled={isSyncing}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSyncing ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <RefreshCw className="w-4 h-4 text-white" />
                          )}
                          <span>{isSyncing ? 'Syncing All Records...' : `Sync All ${visitors.length} Visitors Now`}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm('Create a brand new spreadsheet for visitors?')) {
                              handleCreateSheet();
                            }
                          }}
                          disabled={isCreatingSheet}
                          className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>New Sheet</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadCsv}
                          className="py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-emerald-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Setup Options: Create New OR Link Existing */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Option 1: Create New */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-300 transition-all">
                          <div className="space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                              <PlusCircle className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">Create New Google Sheet</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Creates a formatted <b>"Visitors Entry Register"</b> sheet in your Google Drive with frozen header columns.
                            </p>
                          </div>

                          <button
                            id="btn-create-sheet"
                            onClick={handleCreateSheet}
                            disabled={isCreatingSheet}
                            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isCreatingSheet ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 text-white" />
                            )}
                            <span>{isCreatingSheet ? 'Creating Sheet...' : 'Create & Sync Now'}</span>
                          </button>
                        </div>

                        {/* Option 2: Link Existing */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-300 transition-all">
                          <div className="space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                              <LinkIcon className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">Connect Existing Sheet</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Paste an existing Google Spreadsheet link or ID to write visitor logs into that sheet.
                            </p>
                          </div>

                          <button
                            onClick={() => setIsLinkingExisting(true)}
                            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4 text-indigo-600" />
                            <span>Paste Sheet URL / ID</span>
                          </button>
                        </div>
                      </div>

                      {/* Modal or Box for Pasting Sheet ID */}
                      {isLinkingExisting && (
                        <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-3">
                          <label className="text-xs font-bold text-indigo-950 block">
                            Google Spreadsheet URL or ID:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customSheetId}
                              onChange={(e) => setCustomSheetId(e.target.value)}
                              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                              className="flex-1 px-3.5 py-2 text-xs border border-indigo-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={handleLinkExistingSheet}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              Link
                            </button>
                            <button
                              onClick={() => setIsLinkingExisting(false)}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Data Schema Columns Preview */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#003B73] uppercase tracking-wide flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#0056A6]" />
                    <span>Included Visitor Register Columns (14 Fields)</span>
                  </h4>
                  <span className="text-[11px] font-mono text-[#6B7280] font-semibold">Standard Register Schema</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Sr No',
                    'Date & Time Stamp',
                    'Date',
                    'Visitor Name',
                    'Mobile Number',
                    'Visitor Type',
                    'Address / City',
                    'Purpose of Visit',
                    'Check In Time',
                    'Check Out Time',
                    'Status',
                    'Candidate App ID',
                    'Remarks',
                    'Logged At (ISO)',
                  ].map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium font-mono"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#F7F9FC] px-6 py-3.5 border-t border-[#D9E1EA] flex items-center justify-between shrink-0">
              <span className="text-xs text-[#6B7280] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Encrypted OAuth token stored securely in memory</span>
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#003B73] hover:bg-[#002850] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

