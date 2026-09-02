import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
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
  Download,
  Check,
  ShieldAlert,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { VisitorRecord, UserProfile } from '../../types/auth';
import { getVisitorRecords } from '../../services/authService';
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
} from '../../services/googleSheetsService';
import { firebaseConfig } from '../../lib/firebase';

interface GoogleSheetsViewProps {
  currentUser?: UserProfile | null;
}

const SHEETS_UNLOCK_SESSION_KEY = 'vmk_sheets_unlocked_session';

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({ currentUser }) => {
  // Security Unlock State (Password: dno1)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SHEETS_UNLOCK_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Google Sheets integration state
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(() => getSavedSheetsConfig());
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => !!getCachedAccessToken());
  const [userEmail, setUserEmail] = useState<string>(config?.userEmail || '');
  const [userName, setUserName] = useState<string>(config?.userName || '');
  const [visitors, setVisitors] = useState<VisitorRecord[]>(() => getVisitorRecords());

  // Link existing spreadsheet
  const [customSheetId, setCustomSheetId] = useState<string>('');
  const [isLinkingExisting, setIsLinkingExisting] = useState<boolean>(false);

  // Manual token & Diagnostics
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
    setVisitors(getVisitorRecords());
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const trimmed = passwordInput.trim();
    if (trimmed === 'dno1' || trimmed.toLowerCase() === 'dno1') {
      try {
        sessionStorage.setItem(SHEETS_UNLOCK_SESSION_KEY, 'true');
      } catch (err) {
        console.error(err);
      }
      setIsUnlocked(true);
      setPasswordInput('');
      setFeedback({
        message: 'Google Sheets Console unlocked successfully with DNO credentials.',
        type: 'success',
      });
      setTimeout(() => setFeedback({ message: '', type: '' }), 3500);
    } else {
      setAuthError('Incorrect passcode. Please enter the valid DNO passcode (pass: dno1).');
    }
  };

  const handleLockSession = () => {
    try {
      sessionStorage.removeItem(SHEETS_UNLOCK_SESSION_KEY);
    } catch (err) {
      console.error(err);
    }
    setIsUnlocked(false);
    setPasswordInput('');
    setAuthError('');
  };

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
      const { user } = await signInWithGoogleSheets();
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
        message: `Successfully connected Google Account: ${email}!`,
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

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setManualAccessToken(manualToken.trim());
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
      message: 'Direct Google OAuth token applied successfully!',
      type: 'success',
    });
  };

  const handleDisconnect = async () => {
    await disconnectGoogleSheets();
    setIsSignedIn(false);
    setUserEmail('');
    setUserName('');
    setFeedback({
      message: 'Disconnected from Google Sheets.',
      type: 'info',
    });
  };

  const handleCreateSheet = async () => {
    setIsCreatingSheet(true);
    setFeedback({ message: '', type: '' });
    try {
      const currentList = getVisitorRecords();
      const newSheet = await createVisitorsSpreadsheet(
        'Visitors Entry Register'
      );
      const conf: GoogleSheetsConfig = {
        spreadsheetId: newSheet.spreadsheetId,
        spreadsheetUrl: newSheet.spreadsheetUrl,
        spreadsheetTitle: 'Visitors Entry Register',
        sheetName: newSheet.sheetName,
        autoSync: true,
        userEmail: userEmail || 'Google User',
        userName: userName || 'Authorized Officer',
        lastSyncedAt: new Date().toISOString(),
      };
      saveSheetsConfig(conf);
      setConfig(conf);

      // Populate with existing visitor records
      if (currentList.length > 0) {
        await syncAllVisitorsToGoogleSheet(
          newSheet.spreadsheetId,
          newSheet.sheetName,
          currentList
        );
      }

      setFeedback({
        message: `New Google Sheet created and populated with ${currentList.length} visitor entries!`,
        type: 'success',
      });
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

  const handleLinkExistingSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetId.trim()) return;

    let extractedId = customSheetId.trim();
    const match = extractedId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      extractedId = match[1];
    }

    const currentConf = config || {
      spreadsheetId: '',
      spreadsheetUrl: '',
      spreadsheetTitle: 'Linked Google Sheet',
      sheetName: 'Sheet1',
      autoSync: true,
    };

    const newConf: GoogleSheetsConfig = {
      ...currentConf,
      spreadsheetId: extractedId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
      spreadsheetTitle: 'Linked Google Sheet',
      sheetName: currentConf.sheetName || 'Sheet1',
      autoSync: true,
    };

    saveSheetsConfig(newConf);
    setConfig(newConf);
    setIsLinkingExisting(false);
    setCustomSheetId('');
    setFeedback({
      message: 'Linked existing Google Sheet successfully! You can now perform a manual sync.',
      type: 'success',
    });
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    if (!config) return;
    const updated = { ...config, autoSync: enabled };
    saveSheetsConfig(updated);
    setConfig(updated);
  };

  const handleManualSyncAll = async () => {
    if (!config?.spreadsheetId) {
      setFeedback({ message: 'Please create or link a Google Sheet first.', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setFeedback({ message: '', type: '' });
    try {
      const currentList = getVisitorRecords();
      setVisitors(currentList);
      const res = await syncAllVisitorsToGoogleSheet(
        config.spreadsheetId,
        config.sheetName || 'Visitors_Register',
        currentList
      );
      const updated = { ...config, lastSyncedAt: new Date().toISOString() };
      saveSheetsConfig(updated);
      setConfig(updated);
      setFeedback({
        message: `Synced all ${res.totalSynced} visitor entries to Google Sheets successfully!`,
        type: 'success',
      });
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

  const handleDownloadCsv = () => {
    const currentList = getVisitorRecords();
    if (currentList.length === 0) {
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
      'Application ID',
      'Remarks',
    ];

    const rows = currentList.map((v) => [
      v.srNo,
      `"${v.timestamp || v.date}"`,
      `"${v.name}"`,
      `"${v.mobile}"`,
      `"${v.visitorType}"`,
      `"${v.address || 'Washim'}"`,
      `"${v.purpose}"`,
      `"${v.checkInTime}"`,
      `"${v.checkOutTime || ''}"`,
      `"${v.status}"`,
      `"${v.candidateAppId || ''}"`,
      `"${v.remarks || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VMK_Washim_Visitors_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If locked, render security prompt
  if (!isUnlocked) {
    return (
      <div className="relative z-10 w-full max-w-xl mx-auto py-8">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 text-center space-y-6">
          {/* Lock Icon Header */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center mx-auto shadow-md ring-4 ring-emerald-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected DNO Administrative Tab</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Google Sheets Cloud Sync
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              This feature provides live synchronization of visitor registers to Google Drive. Please enter the security passcode to access this tab.
            </p>
          </div>

          {/* Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left max-w-md mx-auto">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Passcode (Default: <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">dno1</code>)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setAuthError('');
                  }}
                  placeholder="Enter passcode (e.g. dno1)"
                  autoFocus
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-sm font-mono tracking-widest text-slate-900 outline-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Google Sheets Tab</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span>Authorized role requirement: District Nodal Officer / Admin</span>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked State -> Full Google Sheets Hub
  return (
    <div className="relative z-10 w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-radial from-emerald-500/20 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-sm shrink-0">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Google Sheets Cloud Sync</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Password: dno1 Unlocked
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl">
                Automatic real-time synchronization between local visitor register logs and official Google Drive spreadsheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleLockSession}
              title="Lock Tab Session"
              className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Tab</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ message: '', type: '' })}
            className="text-xs opacity-70 hover:opacity-100 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Diagnostics / Troubleshooting Help Boxes */}
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
              <h4 className="font-bold text-amber-950 text-sm">Browser Popup Was Blocked</h4>
              <p className="text-amber-800 mt-1 leading-relaxed">
                Your browser or preview container prevented the Google login window from opening.
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
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
                Firebase Domain Authorization Needed ({firebaseConfig.projectId})
              </h4>
              <p className="text-amber-800 mt-1 leading-relaxed">
                Google Firebase Auth requires this domain to be in your project’s Authorized Domains list.
              </p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 bg-amber-50/80 p-2 rounded-lg border border-amber-200 font-mono text-[11px] text-slate-800">
              <span className="truncate flex-1 font-bold">{currentHostname}</span>
              <button
                type="button"
                onClick={copyCurrentDomain}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-sans font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors text-xs"
              >
                <span>Add Domain in Firebase Console</span>
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
                One-Time Activation: Google Sheets API Needs to be Enabled
              </h4>
              <p className="text-amber-800 mt-1 leading-relaxed">
                Google Cloud requires turning ON the Google Sheets API for project <b>(700750943390 / {firebaseConfig.projectId})</b>.
              </p>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={sheetsApiEnableUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs shadow-xs"
              >
                <span>Enable Google Sheets API (Google Cloud Console)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid: Config on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Connection & Spreadsheet Management (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Authentication Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">Google Account Authorization</h3>
              </div>
              {isSignedIn && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authorized</span>
                </span>
              )}
            </div>

            {!isSignedIn ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sign in with your Google Workspace or Gmail account with Sheets & Drive access.
                </p>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Sign In with Google Account</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualTokenInput(!showManualTokenInput)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                  >
                    {showManualTokenInput ? 'Hide manual token input' : 'Or connect using OAuth Access Token'}
                  </button>
                </div>

                {showManualTokenInput && (
                  <form onSubmit={handleManualTokenSubmit} className="pt-2 space-y-2 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Direct Google OAuth Token (<code className="text-blue-600">ya29...</code>):
                    </label>
                    <input
                      type="password"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste Google Access Token..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Apply OAuth Token
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">{userName || 'Google Officer'}</p>
                    <p className="text-[11px] text-emerald-700 truncate font-mono">{userEmail || 'Active Access Token'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Spreadsheet Destination Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">Destination Spreadsheet</h3>
              </div>
              {config?.spreadsheetId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span>Linked</span>
                </span>
              )}
            </div>

            {config?.spreadsheetId ? (
              <div className="space-y-3.5">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {config.spreadsheetTitle || 'VMK Visitors Register'}
                    </span>
                    <a
                      href={config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <span>Open in Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    ID: {config.spreadsheetId}
                  </p>
                  {config.lastSyncedAt && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Last Synced: {new Date(config.lastSyncedAt).toLocaleString('en-GB')}</span>
                    </p>
                  )}
                </div>

                {/* Auto Sync Toggle */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${config.autoSync ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Real-Time Auto-Sync</p>
                      <p className="text-[11px] text-slate-500">Syncs immediately when a visitor entry is saved</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!config.autoSync}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {/* Sync Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleManualSyncAll}
                    disabled={isSyncing}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing All Rows...' : `Sync All ${visitors.length} Visitors Now`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLinkingExisting(true)}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                    title="Change Spreadsheet"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Choose to create a brand new Google Sheet in your Google Drive or connect an existing spreadsheet ID.
                </p>

                <button
                  type="button"
                  onClick={handleCreateSheet}
                  disabled={isCreatingSheet || !isSignedIn}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSheet ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating & Formatting Sheet...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Create New Google Sheet</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsLinkingExisting(!isLinkingExisting)}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                >
                  <span>Or Link Existing Google Sheet ID / URL</span>
                </button>
              </div>
            )}

            {isLinkingExisting && (
              <form onSubmit={handleLinkExistingSheet} className="pt-3 space-y-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700">
                  Google Sheet URL or Spreadsheet ID:
                </label>
                <input
                  type="text"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Link Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkingExisting(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Live Data Tally & Sync Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Visitor Register Queue ({visitors.length})</h3>
                <p className="text-[11px] text-slate-500">
                  Records synchronized with Google Sheets format (Columns A–L)
                </p>
              </div>
              {config?.spreadsheetUrl && (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>View Live in Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {visitors.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p>No visitor records logged yet.</p>
                <p className="mt-1 text-slate-500">Go to the Visitors tab to create visitor entries.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-bold font-mono">Sr</th>
                      <th className="py-2.5 px-3 font-semibold">Visitor Name</th>
                      <th className="py-2.5 px-3 font-semibold">Mobile</th>
                      <th className="py-2.5 px-3 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Purpose</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">#{v.srNo}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{v.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{v.mobile}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {v.visitorType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">{v.purpose}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'In Premises'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
