import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Key,
  RefreshCw,
  Users,
  MapPin,
  Lock,
  Power,
  Sliders,
  Check,
  AlertCircle,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types/auth';
import { MAHARASHTRA_DISTRICTS } from '../../constants/districts';
import {
  getAllUsers,
  saveUser,
  saveUserAsync,
  toggleUserStatusAsync,
} from '../../services/authService';
import {
  grantApiKeyToAllUsers,
  getMasterApiKey,
} from '../../services/apiConfigService';

interface UserBulkOperationsHubProps {
  currentUser?: UserProfile | null;
  onRefreshSession?: () => void;
  onOpenMasterKeyModal?: () => void;
}

export const UserBulkOperationsHub: React.FC<UserBulkOperationsHubProps> = ({
  currentUser,
  onRefreshSession,
  onOpenMasterKeyModal,
}) => {
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUsers());
  const [targetDistrict, setTargetDistrict] = useState<string>('Washim');
  const [newDistrict, setNewDistrict] = useState<string>('Akola');
  const [selectedRoleForTransfer, setSelectedRoleForTransfer] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const refreshList = () => {
    setUsers(getAllUsers());
  };

  // 1. Bulk District Transfer
  const handleBulkDistrictTransfer = async () => {
    if (targetDistrict === newDistrict) {
      alert('Source and destination districts cannot be the same.');
      return;
    }

    const matches = users.filter((u) => {
      if (u.username.toLowerCase() === 'shrinath') return false;
      const matchDist = (u.district || 'Washim').toLowerCase() === targetDistrict.toLowerCase();
      const matchRole = selectedRoleForTransfer === 'all' || u.role === selectedRoleForTransfer;
      return matchDist && matchRole;
    });

    if (matches.length === 0) {
      alert(`No matching users found in ${targetDistrict} District.`);
      return;
    }

    if (
      !confirm(
        `Are you sure you want to reassign ${matches.length} user profile(s) from ${targetDistrict} to ${newDistrict} District?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    let updatedCount = 0;
    for (const u of matches) {
      const updated: UserProfile = { ...u, district: newDistrict };
      saveUser(updated);
      try {
        await saveUserAsync(updated);
        updatedCount++;
      } catch {}
    }

    setIsProcessing(false);
    refreshList();
    if (onRefreshSession) onRefreshSession();
    setFeedback({
      msg: `Successfully transferred ${updatedCount} user(s) to ${newDistrict} District.`,
      type: 'success',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 2. Grant API Key to All Users
  const handleGrantApiKeyAll = async () => {
    const masterKey = getMasterApiKey();
    if (!masterKey) {
      alert('No master Gemini API key is configured yet. Please configure the key first.');
      if (onOpenMasterKeyModal) onOpenMasterKeyModal();
      return;
    }

    if (!confirm('Grant central Gemini Vision API Key access to all active user profiles?')) {
      return;
    }

    setIsProcessing(true);
    const res = await grantApiKeyToAllUsers();
    setIsProcessing(false);
    refreshList();
    if (onRefreshSession) onRefreshSession();
    setFeedback({
      msg: res.message,
      type: res.success ? 'success' : 'error',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 3. Revoke API Key from All Non-Admins
  const handleRevokeApiKeyAll = async () => {
    if (!confirm('Revoke central Gemini API Key access from all non-administrative staff?')) {
      return;
    }

    setIsProcessing(true);
    let count = 0;
    for (const u of users) {
      if (u.role !== 'super_admin' && u.role !== 'dno') {
        const updated: UserProfile = { ...u, canUseApiKey: false };
        saveUser(updated);
        try {
          await saveUserAsync(updated);
          count++;
        } catch {}
      }
    }
    setIsProcessing(false);
    refreshList();
    if (onRefreshSession) onRefreshSession();
    setFeedback({
      msg: `Revoked API Key permission from ${count} staff accounts.`,
      type: 'info',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 4. Activate All Accounts
  const handleActivateAllAccounts = async () => {
    if (!confirm('Activate all registered user accounts?')) {
      return;
    }

    setIsProcessing(true);
    let count = 0;
    for (const u of users) {
      if (!u.isActive) {
        await toggleUserStatusAsync(u.id, true);
        count++;
      }
    }
    setIsProcessing(false);
    refreshList();
    if (onRefreshSession) onRefreshSession();
    setFeedback({
      msg: `Activated ${count} previously disabled user accounts.`,
      type: 'success',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 5. Export Detailed CSV Audit
  const handleExportAudit = () => {
    const headers = [
      'User ID',
      'Username',
      'Full Name',
      'Designation',
      'Role',
      'District',
      'Active Status',
      'Allowed Tabs Count',
      'Allowed Features Count',
      'API Key Access',
      'Phone',
      'Email',
      'Account Created At',
      'Last Login',
    ];

    const rows = users.map((u) => [
      `"${u.id}"`,
      `"${u.username}"`,
      `"${u.fullName.replace(/"/g, '""')}"`,
      `"${u.designation.replace(/"/g, '""')}"`,
      `"${u.role}"`,
      `"${u.district || 'Washim'}"`,
      u.isActive ? 'Active' : 'Disabled',
      Array.isArray(u.allowedTabs) ? u.allowedTabs.length : 0,
      Array.isArray(u.allowedFeatures) ? u.allowedFeatures.length : 0,
      u.canUseApiKey ? 'Granted' : 'Revoked',
      `"${u.phone || ''}"`,
      `"${u.email || ''}"`,
      `"${u.createdAt || ''}"`,
      `"${u.lastLogin || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `cet_users_security_audit_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 text-xs text-[#102544]">
      {/* Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FC] text-[#0866D9] uppercase tracking-wider border border-[#DCE5F0]">
              Super Admin Tools
            </span>
            <span className="text-xs text-[#62738D]">Batch Operations & Administration</span>
          </div>
          <h3 className="text-base font-bold text-[#102544] mt-1">
            Bulk User Management & Security Hub
          </h3>
          <p className="text-xs text-[#62738D] mt-0.5">
            Execute state-wide district reassignments, batch API key distributions, mass activations, and compliance audits.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAudit}
          className="px-4 py-2 rounded-xl bg-[#073B70] hover:bg-[#092744] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0 self-start sm:self-center"
        >
          <Download className="w-4 h-4 text-sky-300" />
          <span>Export Security Audit (CSV)</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Grid of Bulk Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tool 1: State-wide District Reassignment */}
        <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EBF3FC] text-[#0866D9] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#102544]">
                  District-wide Staff Transfer & Reassignment
                </h4>
                <p className="text-[11px] text-[#62738D]">
                  Transfer scrutiny staff or counsellors between administrative districts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#62738D] mb-1">
                  Target Role
                </label>
                <select
                  value={selectedRoleForTransfer}
                  onChange={(e) => setSelectedRoleForTransfer(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="supporting_staff">Supporting Staff</option>
                  <option value="operator">Scrutiny Operators</option>
                  <option value="counsellor">Counsellors</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#62738D] mb-1">
                  From District
                </label>
                <select
                  value={targetDistrict}
                  onChange={(e) => setTargetDistrict(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl outline-none"
                >
                  {MAHARASHTRA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#62738D] mb-1">
                  To Destination District
                </label>
                <select
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  className="w-full text-xs p-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl outline-none font-bold text-[#073B70]"
                >
                  {MAHARASHTRA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleBulkDistrictTransfer}
            className="w-full py-2.5 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            <span>Apply District Reassignment</span>
          </button>
        </div>

        {/* Tool 2: Master Gemini API Key Batch Distribution */}
        <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#102544]">
                  Central Gemini Vision API Key Distribution
                </h4>
                <p className="text-[11px] text-[#62738D]">
                  Grant or revoke multimodal AI vision OCR permissions across staff
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
              Staff members with this permission can extract handwritten and printed Marathi/English text in the <strong>Image-to-Text OCR tool</strong> without providing their own private API keys.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGrantApiKeyAll}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Grant Key to All Staff</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRevokeApiKeyAll}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer border border-slate-300 flex items-center justify-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>Revoke Key from Staff</span>
            </button>
          </div>
        </div>

        {/* Tool 3: Account Lifecycle & Mass Activation */}
        <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Power className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#102544]">
                  Batch Account Activation
                </h4>
                <p className="text-[11px] text-[#62738D]">
                  Restore all locked or disabled personnel accounts across the roster
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0] text-[11px] text-[#62738D]">
              Total registered users: <strong className="text-[#102544]">{users.length}</strong> &bull; Active:{' '}
              <strong className="text-emerald-700">{users.filter((u) => u.isActive).length}</strong> &bull; Disabled:{' '}
              <strong className="text-amber-700">{users.filter((u) => !u.isActive).length}</strong>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleActivateAllAccounts}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <Power className="w-4 h-4" />
            <span>Activate All Disabled Accounts</span>
          </button>
        </div>

        {/* Tool 4: System Roles & User Count Statistics */}
        <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#102544]">
                  Role Distribution Summary
                </h4>
                <p className="text-[11px] text-[#62738D]">
                  Active personnel counts categorized by administrative privileges
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-2.5 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0]">
                <p className="text-[10px] text-[#62738D]">DNO Admin</p>
                <p className="text-base font-bold text-[#073B70]">
                  {users.filter((u) => u.role === 'dno').length}
                </p>
              </div>
              <div className="p-2.5 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0]">
                <p className="text-[10px] text-[#62738D]">Counsellors</p>
                <p className="text-base font-bold text-[#0866D9]">
                  {users.filter((u) => u.role === 'counsellor').length}
                </p>
              </div>
              <div className="p-2.5 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0]">
                <p className="text-[10px] text-[#62738D]">Staff/Operators</p>
                <p className="text-base font-bold text-emerald-700">
                  {users.filter((u) => u.role === 'supporting_staff' || u.role === 'operator').length}
                </p>
              </div>
              <div className="p-2.5 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0]">
                <p className="text-[10px] text-[#62738D]">Total Users</p>
                <p className="text-base font-bold text-[#102544]">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl text-center text-[10px] text-slate-500">
            State-wide synchronization active with Firebase Firestore &bull; Real-time updates
          </div>
        </div>
      </div>
    </div>
  );
};
