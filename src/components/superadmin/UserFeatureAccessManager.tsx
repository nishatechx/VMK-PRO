import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Check,
  X,
  Search,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { UserProfile, FeaturePermission } from '../../types/auth';
import {
  getAllUsers,
  saveUser,
  saveUserAsync,
  subscribeToUsers,
  AVAILABLE_FEATURES,
  SUPER_ADMIN_USER,
} from '../../services/authService';

interface UserFeatureAccessManagerProps {
  currentUser?: UserProfile | null;
  onRefreshSession?: () => void;
}

export const UserFeatureAccessManager: React.FC<UserFeatureAccessManagerProps> = ({
  currentUser,
  onRefreshSession,
}) => {
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    const unsub = subscribeToUsers((freshUsers) => {
      setUsers(freshUsers);
    });
    return () => unsub();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (u.username.toLowerCase() === 'shrinath' || u.id === SUPER_ADMIN_USER.id) {
      return false;
    }
    const matchSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.district && u.district.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchRole = selectedRole === 'all' || u.role === selectedRole;
    return matchSearch && matchRole;
  });

  const handleToggleFeature = async (user: UserProfile, featureId: FeaturePermission) => {
    setSavingUserId(user.id);
    const currentFeatures = Array.isArray(user.allowedFeatures) ? [...user.allowedFeatures] : [];
    let updatedFeatures: FeaturePermission[];

    if (currentFeatures.includes(featureId)) {
      updatedFeatures = currentFeatures.filter((f) => f !== featureId);
    } else {
      updatedFeatures = [...currentFeatures, featureId];
    }

    const updatedUser: UserProfile = {
      ...user,
      allowedFeatures: updatedFeatures,
    };

    saveUser(updatedUser);
    try {
      await saveUserAsync(updatedUser);
      setFeedback({
        msg: `Updated feature tool permissions for ${user.fullName}`,
        type: 'success',
      });
      if (onRefreshSession) onRefreshSession();
    } catch {
      setFeedback({
        msg: `Permissions updated locally for ${user.username}`,
        type: 'info',
      });
    } finally {
      setSavingUserId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleApplyPreset = async (
    user: UserProfile,
    preset: 'all' | 'scrutiny' | 'reception' | 'clear'
  ) => {
    setSavingUserId(user.id);
    let targetFeatures: FeaturePermission[] = [];

    switch (preset) {
      case 'all':
        targetFeatures = [
          'whatsapp_tool',
          'qr_upload_tool',
          'ticket_generator_tool',
          'img_to_pdf_tool',
          'image_to_text_tool',
          'add_candidate',
          'add_visitor',
          'export_reports',
        ];
        break;
      case 'scrutiny':
        targetFeatures = [
          'qr_upload_tool',
          'ticket_generator_tool',
          'img_to_pdf_tool',
          'image_to_text_tool',
          'add_candidate',
          'export_reports',
        ];
        break;
      case 'reception':
        targetFeatures = ['whatsapp_tool', 'add_visitor', 'qr_upload_tool'];
        break;
      case 'clear':
        targetFeatures = [];
        break;
    }

    const updatedUser: UserProfile = {
      ...user,
      allowedFeatures: targetFeatures,
    };

    saveUser(updatedUser);
    try {
      await saveUserAsync(updatedUser);
      setFeedback({
        msg: `Applied feature preset "${preset.toUpperCase()}" for ${user.fullName}`,
        type: 'success',
      });
      if (onRefreshSession) onRefreshSession();
    } catch {
      setFeedback({
        msg: `Feature preset applied locally for ${user.fullName}`,
        type: 'info',
      });
    } finally {
      setSavingUserId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-5 text-xs text-[#102544]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE5F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FC] text-[#0866D9] uppercase tracking-wider border border-[#DCE5F0]">
              Super Admin Control
            </span>
            <span className="text-xs text-[#62738D]">Interactive Tools & Utilities Security</span>
          </div>
          <h3 className="text-base font-bold text-[#102544] mt-1">
            Feature Tools Permissions Matrix
          </h3>
          <p className="text-xs text-[#62738D] mt-0.5">
            Configure permission for interactive facilitation desk tools, modals, and data export operations per user.
          </p>
        </div>

        {feedback && (
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.msg}</span>
          </div>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user by name, username or district..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-[#102544] placeholder:text-[#62738D] outline-none focus:border-[#0866D9] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#62738D]" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs py-2 px-2.5 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-[#102544] outline-none"
            >
              <option value="all">All Roles ({users.length})</option>
              <option value="dno">DNO Admin</option>
              <option value="counsellor">Admission Counsellors</option>
              <option value="supporting_staff">Supporting Staff</option>
              <option value="operator">Scrutiny Operators</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-[#62738D] font-medium">
          Showing {filteredUsers.length} user profiles
        </div>
      </div>

      {/* Feature Matrix Table */}
      <div className="overflow-x-auto border border-[#DCE5F0] rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFD] border-b border-[#DCE5F0] text-[#475569]">
              <th className="py-3 px-3.5 font-bold min-w-[180px]">User Profile</th>
              <th className="py-3 px-2 font-bold min-w-[90px]">Role</th>
              {AVAILABLE_FEATURES.map((feature) => (
                <th
                  key={feature.id}
                  className="py-3 px-2 font-bold text-center text-[11px] whitespace-nowrap min-w-[80px]"
                  title={feature.description}
                >
                  <span className="truncate">{feature.label.split(' ')[0]}</span>
                </th>
              ))}
              <th className="py-3 px-3 font-bold text-right min-w-[140px]">Quick Presets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE5F0]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={AVAILABLE_FEATURES.length + 3} className="py-8 text-center text-[#62738D]">
                  No users found matching your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const userFeatures = Array.isArray(user.allowedFeatures) ? user.allowedFeatures : [];
                const isSaving = savingUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-[#F4F7FB]/60 transition-colors">
                    {/* User Info */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#073B70] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#102544] truncate">{user.fullName}</p>
                          <p className="text-[10px] text-[#62738D] font-mono">@{user.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-2">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Feature Checkboxes */}
                    {AVAILABLE_FEATURES.map((feature) => {
                      const hasAccess = userFeatures.includes(feature.id);

                      return (
                        <td key={feature.id} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleToggleFeature(user, feature.id)}
                            className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              hasAccess
                                ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                : 'bg-slate-100 text-slate-300 hover:bg-slate-200 border border-slate-200'
                            }`}
                            title={`${hasAccess ? 'Revoke' : 'Grant'} ${feature.label} for ${user.username}`}
                          >
                            {hasAccess ? (
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            ) : (
                              <span className="text-[11px] font-mono text-slate-400">&minus;</span>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    {/* Presets */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(user, 'all')}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 text-[10px] font-bold transition-all cursor-pointer"
                          title="Grant All Tools"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(user, 'scrutiny')}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-all cursor-pointer"
                          title="Scrutiny Tools"
                        >
                          Scrutiny
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(user, 'reception')}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-all cursor-pointer"
                          title="Reception Tools"
                        >
                          Reception
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(user, 'clear')}
                          className="p-1 rounded text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                          title="Revoke All Tools"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl flex items-center justify-between text-[11px] text-[#62738D]">
        <span>
          &bull; Controls modal tools: WhatsApp Ticket, Mobile QR Scanner, SAC Tickets, Image-to-PDF, OCR AI, and exports.
        </span>
        <span className="font-semibold text-emerald-800">
          Super Admin maintains master access across all tools
        </span>
      </div>
    </div>
  );
};
