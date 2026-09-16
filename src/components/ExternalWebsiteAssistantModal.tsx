import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  HardDrive,
  FileText,
  Clock,
  Sparkles,
  Terminal,
  Send,
  Eye,
  X,
  FileCheck,
  FileUp,
  HelpCircle,
  Link2,
  Radio,
  FileQuestion,
  ChevronRight,
  Info
} from 'lucide-react';
import { QrUploadedFile } from '../types/qrUpload';
import { VaultFilePickerModal } from './VaultFilePickerModal';
import {
  TARGET_PORTAL_URL,
  TARGET_PORTAL_DOMAIN,
  generateUserscriptCode,
  copyFileBlobToClipboard,
  attachVaultFileToInput,
  getAuditLogs,
  VaultAttachmentAuditLog,
  VAULT_BRIDGE_CHANNEL
} from '../services/vaultBridgeService';
import { getCurrentUser } from '../services/authService';

interface ExternalWebsiteAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVaultPickerDirectly?: () => void;
}

export const ExternalWebsiteAssistantModal: React.FC<ExternalWebsiteAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'extension_setup' | 'audit_logs'>('overview');
  const [isVaultPickerOpen, setIsVaultPickerOpen] = useState(false);
  const [selectedVaultFile, setSelectedVaultFile] = useState<QrUploadedFile | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedClipboardFile, setCopiedClipboardFile] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [auditLogsList, setAuditLogsList] = useState<VaultAttachmentAuditLog[]>([]);

  // Simulator State (MHCET Scrutiny Ticket Desk Simulator)
  const simulatorFileInputRef = useRef<HTMLInputElement | null>(null);
  const [simulatorSubject, setSimulatorSubject] = useState('Grievance regarding Document Discrepancy (Seat Allotment)');
  const [simulatorAppId, setSimulatorAppId] = useState('EN26108492');
  const [simulatorQuery, setSimulatorQuery] = useState('Kindly verify attached Domicile & Caste Validity certificate uploaded from Scrutiny Desk.');
  const [simulatorAttachedFileName, setSimulatorAttachedFileName] = useState<string | null>(null);
  const [simulatorSubmitted, setSimulatorSubmitted] = useState(false);

  const currentUser = getCurrentUser();
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const userscriptCode = generateUserscriptCode(appOrigin);

  useEffect(() => {
    if (isOpen) {
      setAuditLogsList(getAuditLogs());

      // Listen for heartbeat or messages on the bridge channel
      let channel: BroadcastChannel | null = null;
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          channel = new BroadcastChannel(VAULT_BRIDGE_CHANNEL);
          channel.onmessage = (event) => {
            if (event.data?.type === 'PONG_TARGET_TAB') {
              setBridgeConnected(true);
            }
          };
          // Send ping to see if target tab is listening
          channel.postMessage({ type: 'PING_TARGET_TAB' });
        }
      } catch {
        // ignore
      }

      return () => {
        if (channel) channel.close();
      };
    }
  }, [isOpen]);

  const handleOpenTargetWebsite = () => {
    // Exact user requirement: The target website must open in a NEW TAB
    window.open(TARGET_PORTAL_URL, '_blank', 'noopener,noreferrer');
  };

  const handleFileSelectedFromPicker = async (file: QrUploadedFile) => {
    setSelectedVaultFile(file);
    setIsVaultPickerOpen(false);

    // 1. Copy to clipboard as real file blob if supported
    const copied = await copyFileBlobToClipboard(file);
    setCopiedClipboardFile(copied);

    // 2. If simulator is active or file input ref exists, attach to it
    if (simulatorFileInputRef.current) {
      await attachVaultFileToInput(simulatorFileInputRef.current, file);
      setSimulatorAttachedFileName(file.name);
    }

    // Refresh audit logs
    setAuditLogsList(getAuditLogs());
  };

  const handleCopyUserscript = () => {
    navigator.clipboard.writeText(userscriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleDownloadUserscript = () => {
    const blob = new Blob([userscriptCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vmk-mhcet-vault-bridge.user.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSimulatorSubmitted(true);
    setTimeout(() => {
      setSimulatorSubmitted(false);
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        id="external-assistant-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
      >
        <div
          id="external-assistant-modal-container"
          className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-[#D9E1EA] flex flex-col overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#003B73] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Vault File Picker • External Portal Integration
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
                    MHCET Bridge
                  </span>
                </div>
                <p className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                  <span>Target:</span>
                  <a
                    href={TARGET_PORTAL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono underline hover:text-white flex items-center gap-1"
                  >
                    {TARGET_PORTAL_DOMAIN}/mhcet/portal/tickets/my-tickets
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center border-b border-[#D9E1EA] px-5 bg-[#F7F9FC] text-xs font-semibold gap-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-[#0056A6] text-[#003B73] font-bold'
                  : 'border-transparent text-[#6B7280] hover:text-[#003B73]'
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span>Workflow & Actions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'simulator'
                  ? 'border-[#0056A6] text-[#003B73] font-bold'
                  : 'border-transparent text-[#6B7280] hover:text-[#003B73]'
              }`}
            >
              <Terminal className="w-4 h-4 text-[#0056A6]" />
              <span>Interactive Form Simulator</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EAF4FB] text-[#0056A6] font-bold">
                Test Input
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('extension_setup')}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'extension_setup'
                  ? 'border-[#0056A6] text-[#003B73] font-bold'
                  : 'border-transparent text-[#6B7280] hover:text-[#003B73]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Companion Extension / Userscript</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit_logs')}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'audit_logs'
                  ? 'border-[#0056A6] text-[#003B73] font-bold'
                  : 'border-transparent text-[#6B7280] hover:text-[#003B73]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Audit Logs ({auditLogsList.length})</span>
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FBFDFF]">
            {/* Tab 1: Overview & Flow */}
            {activeTab === 'overview' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Primary Action Card: Open Website in New Tab */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#EAF4FB] to-white border border-[#0056A6]/20 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0056A6]">
                      Step 1 & 2 • Target Portal Launch
                    </span>
                    <h3 className="text-base font-bold text-[#003B73]">
                      Launch Maharashtra CET Tickets & Grievance Portal
                    </h3>
                    <p className="text-xs text-[#4B5563] leading-relaxed">
                      Opens{' '}
                      <code className="text-[#0056A6] font-mono font-semibold">
                        sac.maharashtracet.org/mhcet/portal/tickets/my-tickets
                      </code>{' '}
                      in a <strong>new browser tab</strong>. Your authenticated session in our webapp remains open and active to supply Vault documents.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      id="open-mhcet-portal-new-tab-btn"
                      onClick={handleOpenTargetWebsite}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Website in New Tab</span>
                    </button>
                  </div>
                </div>

                {/* Vault File Selection Action */}
                <div className="p-5 rounded-2xl bg-white border border-[#D9E1EA] shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9E1EA]">
                    <div>
                      <h4 className="text-sm font-bold text-[#003B73]">
                        Step 5 & 6 • Select File from Vault
                      </h4>
                      <p className="text-xs text-[#6B7280]">
                        Browse and select candidate documents directly from your secure scrutiny Vault.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="open-vault-file-picker-btn"
                      onClick={() => setIsVaultPickerOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#198754] hover:bg-[#146c43] text-white shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>Select from Vault</span>
                    </button>
                  </div>

                  {/* Selected File Status */}
                  {selectedVaultFile ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedVaultFile.name.endsWith('.pdf') ? 'PDF' : 'DOC'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-emerald-950">
                              {selectedVaultFile.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 font-bold">
                              Ready
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            {selectedVaultFile.type} • {(selectedVaultFile.size / 1024).toFixed(1)} KB •
                            Uploaded {new Date(selectedVaultFile.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyFileBlobToClipboard(selectedVaultFile).then((ok) => setCopiedClipboardFile(ok))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Copy file blob to system clipboard"
                        >
                          {copiedClipboardFile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedClipboardFile ? 'Copied to Clipboard!' : 'Copy to Clipboard (Ctrl+V)'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#F7F9FC] border border-dashed border-[#D9E1EA] text-center">
                      <p className="text-xs text-[#6B7280]">
                        No file currently staged. Click <strong>"Select from Vault"</strong> to pick a document.
                      </p>
                    </div>
                  )}
                </div>

                {/* Architecture & Browser Security Transparency */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#0056A6]" />
                    <span>Cross-Origin Browser Architecture (Same-Origin Policy & Extension Bridge)</span>
                  </div>
                  <p className="leading-relaxed">
                    Because <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">sac.maharashtracet.org</code> is an external domain, web browsers enforce the <strong>Same-Origin Policy (SOP)</strong> preventing one tab from directly altering another origin's DOM without companion software.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <strong className="text-[#003B73] block mb-1">Approach A: Companion Extension / Userscript</strong>
                      <p className="text-[11px] text-slate-600">
                        Injects a native <code className="bg-slate-100 px-1 py-0.5 rounded font-semibold text-[#0056A6]">📂 Select from Vault</code> button directly next to file inputs on the CET website, populating the input using the standard <code className="font-mono text-[10px]">DataTransfer</code> API without downloading.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <strong className="text-[#003B73] block mb-1">Approach C: Clipboard & Fast Bridge</strong>
                      <p className="text-[11px] text-slate-600">
                        Places the real binary file on the OS clipboard via the modern Clipboard File API. On the target website, simply click the upload box and press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono text-[10px]">Ctrl+V</kbd> to paste!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Interactive Target Form Simulator */}
            {activeTab === 'simulator' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3.5 rounded-xl bg-[#EAF4FB] border border-[#0056A6]/20 text-xs text-[#003B73] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#0056A6] shrink-0" />
                    <span>
                      <strong>Interactive Test Harness:</strong> Simulates the exact grievance submission form on{' '}
                      <code className="font-mono">sac.maharashtracet.org/mhcet/portal/tickets</code> with real <code className="font-mono">&lt;input type="file"&gt;</code> controls.
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white text-[#0056A6] font-bold text-[10px] shrink-0 border border-[#D9E1EA]">
                    Live DOM Binding
                  </span>
                </div>

                {simulatorSubmitted && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">MHCET Ticket Submitted Successfully!</p>
                      <p className="text-[11px] text-emerald-700">
                        Attachment "{simulatorAttachedFileName}" was bundled and transmitted in the multipart/form-data payload.
                      </p>
                    </div>
                  </div>
                )}

                {/* The MHCET Replica Form */}
                <form
                  onSubmit={handleSimulatorSubmit}
                  className="p-5 rounded-2xl bg-white border border-[#D9E1EA] shadow-2xs space-y-4"
                >
                  <div className="border-b border-[#D9E1EA] pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#003B73]">
                        Maharashtra State CET Cell • Scrutiny Grievance Ticket Form
                      </h4>
                      <p className="text-[11px] text-[#6B7280]">
                        Portal Form ID: #CET-GRIEV-2026-FORM • Target: sac.maharashtracet.org
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Standard HTML Form
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#4B5563] mb-1">
                        Ticket Subject / Category
                      </label>
                      <input
                        type="text"
                        value={simulatorSubject}
                        onChange={(e) => setSimulatorSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F9FC] border border-[#D9E1EA] text-xs text-[#111827] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0056A6]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4B5563] mb-1">
                        Candidate Application ID / Roll No.
                      </label>
                      <input
                        type="text"
                        value={simulatorAppId}
                        onChange={(e) => setSimulatorAppId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F9FC] border border-[#D9E1EA] text-xs font-mono text-[#111827] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0056A6]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4B5563] mb-1">
                      Query Description / Scrutiny Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={simulatorQuery}
                      onChange={(e) => setSimulatorQuery(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F9FC] border border-[#D9E1EA] text-xs text-[#111827] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0056A6]"
                      required
                    />
                  </div>

                  {/* The Target File Input Control */}
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E1EA] space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#003B73] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#0056A6]" />
                        <span>Supporting Document Attachment (Max 2 MB, PDF/JPG/PNG)</span>
                      </label>
                      <span className="text-[10px] text-[#6B7280]">
                        Standard &lt;input type="file"&gt;
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Standard file input */}
                      <input
                        ref={simulatorFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSimulatorAttachedFileName(file.name);
                          }
                        }}
                        className="text-xs text-[#4B5563] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EAF4FB] file:text-[#0056A6] hover:file:bg-[#0056A6] hover:file:text-white transition-all cursor-pointer"
                      />

                      {/* Injected "Select from Vault" button */}
                      <button
                        type="button"
                        id="simulator-select-vault-btn"
                        onClick={() => setIsVaultPickerOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-amber-300" />
                        <span>Select from Vault</span>
                      </button>
                    </div>

                    {simulatorAttachedFileName && (
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Attached: <strong>{simulatorAttachedFileName}</strong></span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                          Attached to &lt;input&gt;
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#198754] hover:bg-[#146c43] text-white shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Grievance Ticket</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 3: Companion Extension & Userscript Installation */}
            {activeTab === 'extension_setup' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-[#EAF4FB] border border-[#0056A6]/20 text-xs text-[#003B73] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#003B73]">
                      Install Browser Companion Script (Tampermonkey / Violentmonkey)
                    </h4>
                    <p className="text-xs text-[#4B5563] mt-0.5">
                      Enables the automatic "📂 Select from Vault" button right inside{' '}
                      <code className="font-mono font-semibold">sac.maharashtracet.org</code> upload fields!
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyUserscript}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#0056A6] border border-[#D9E1EA] hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Copied!' : 'Copy Script Code'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadUserscript}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .user.js</span>
                    </button>
                  </div>
                </div>

                {/* 3 Step Installation Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-white border border-[#D9E1EA] space-y-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#003B73] text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-[#003B73]">Install Tampermonkey</h5>
                    <p className="text-[11px] text-[#6B7280]">
                      Add the free Tampermonkey or Violentmonkey extension from Chrome Web Store or Edge Add-ons.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#D9E1EA] space-y-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#0056A6] text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h5 className="text-xs font-bold text-[#003B73]">Add New Script</h5>
                    <p className="text-[11px] text-[#6B7280]">
                      Click "Create a new script" in Tampermonkey, paste the code below, and press <strong>Save</strong> (Ctrl+S).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#D9E1EA] space-y-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#198754] text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h5 className="text-xs font-bold text-[#003B73]">Enjoy Direct Injection</h5>
                    <p className="text-[11px] text-[#6B7280]">
                      Open <code className="font-mono">sac.maharashtracet.org</code>. Every upload field will now have a "Select from Vault" button!
                    </p>
                  </div>
                </div>

                {/* Code Preview */}
                <div className="rounded-xl border border-[#D9E1EA] overflow-hidden">
                  <div className="bg-[#1E293B] text-slate-300 px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-slate-700">
                    <span>vmk-mhcet-vault-bridge.user.js</span>
                    <span className="text-[10px] text-slate-400">Target: sac.maharashtracet.org/*</span>
                  </div>
                  <pre className="p-4 bg-[#0F172A] text-emerald-400 font-mono text-[11px] max-h-60 overflow-y-auto leading-relaxed select-all">
                    {userscriptCode}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 4: Audit Logs */}
            {activeTab === 'audit_logs' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#003B73]">
                    Vault File Attachment Audit History
                  </h4>
                  <span className="text-xs text-[#6B7280]">
                    Logged for verification & scrutiny compliance
                  </span>
                </div>

                {auditLogsList.length === 0 ? (
                  <div className="p-8 text-center bg-[#F7F9FC] rounded-xl border border-dashed border-[#D9E1EA] space-y-2">
                    <ShieldCheck className="w-8 h-8 text-[#0056A6] mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-[#003B73]">No attachment audit logs yet</p>
                    <p className="text-[11px] text-[#6B7280]">
                      When files are chosen and attached from the Vault, verification logs will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#D9E1EA] overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F9FC] border-b border-[#D9E1EA] text-[#4B5563] font-semibold">
                        <tr>
                          <th className="p-3">File Name</th>
                          <th className="p-3">Target Portal</th>
                          <th className="p-3">Operator</th>
                          <th className="p-3">Method</th>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9E1EA]">
                        {auditLogsList.map((log) => (
                          <tr key={log.id} className="hover:bg-[#FBFDFF]">
                            <td className="p-3 font-semibold text-[#003B73]">{log.fileName}</td>
                            <td className="p-3 font-mono text-[11px] text-[#6B7280]">
                              {TARGET_PORTAL_DOMAIN}
                            </td>
                            <td className="p-3 text-[#4B5563]">{log.userName || 'DNO Desk'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                {log.method}
                              </span>
                            </td>
                            <td className="p-3 text-[#6B7280]">
                              {new Date(log.attachedAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {log.status}
                              </span>
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

          {/* Footer */}
          <div className="px-5 py-3.5 bg-white border-t border-[#D9E1EA] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Target Website: sac.maharashtracet.org</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-[#4B5563] border border-[#D9E1EA] transition-colors cursor-pointer"
              >
                Close Assistant
              </button>

              <button
                type="button"
                onClick={handleOpenTargetWebsite}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0056A6] hover:bg-[#003B73] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Website in New Tab</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Vault File Picker Modal */}
      <VaultFilePickerModal
        isOpen={isVaultPickerOpen}
        onClose={() => setIsVaultPickerOpen(false)}
        onSelectFile={handleFileSelectedFromPicker}
        acceptedFormats={['.pdf', '.jpg', '.jpeg', '.png']}
        maxSizeBytes={2 * 1024 * 1024}
        targetWebsiteName="MHCET Ticket Portal"
        targetWebsiteUrl={TARGET_PORTAL_URL}
      />
    </>
  );
};
