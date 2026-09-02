import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  User,
  Sliders,
  Sparkles,
  Info,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  UploadCloud,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Camera,
  Trash,
  Settings2,
} from 'lucide-react';
import { UserProfile, TabPermission, FeaturePermission, UserRole } from '../../types/auth';
import {
  getAllUsers,
  subscribeToUsers,
  saveUserAsync,
  deleteUser,
  AVAILABLE_TABS,
  AVAILABLE_FEATURES,
  DNO_USER,
} from '../../services/authService';
import { uploadImageToFirebase } from '../../services/imageStorageService';

interface UserManagementViewProps {
  currentUser: UserProfile;
  onRefreshSession?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  onRefreshSession,
}) => {
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUsers());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [role, setRole] = useState<UserRole>('supporting_staff');
  const [allowedTabs, setAllowedTabs] = useState<TabPermission[]>([
    'dashboard',
    'visitors',
    'students',
    'profile',
  ]);
  const [allowedFeatures, setAllowedFeatures] = useState<FeaturePermission[]>([
    'whatsapp_tool',
    'qr_upload_tool',
    'ticket_generator_tool',
    'add_candidate',
    'add_visitor',
  ]);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({
    message: '',
    type: '',
  });

  useEffect(() => {
    const unsubscribe = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });
    return () => unsubscribe();
  }, []);

  const refreshUsersList = () => {
    setUsers(getAllUsers());
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setFullName('');
    setDesignation('Supporting Staff');
    setPhone('');
    setEmail('');
    setProfilePicture('');
    setIsUploadingImage(false);
    setUploadError('');
    setRole('supporting_staff');
    setAllowedTabs(['dashboard', 'visitors', 'students', 'profile']);
    setAllowedFeatures(['whatsapp_tool', 'qr_upload_tool', 'ticket_generator_tool', 'add_candidate', 'add_visitor']);
    setIsActive(true);
    setFeedback({ message: '', type: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(user.password);
    setShowPassword(false);
    setFullName(user.fullName);
    setDesignation(user.designation || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setProfilePicture(user.profilePicture || '');
    setIsUploadingImage(false);
    setUploadError('');
    setRole(user.role === 'operator' ? 'supporting_staff' : user.role);
    setAllowedTabs([...user.allowedTabs]);
    setAllowedFeatures([...user.allowedFeatures]);
    setIsActive(user.isActive);
    setFeedback({ message: '', type: '' });
    setIsModalOpen(true);
  };

  // Handle uploading selected image file directly to Firebase Cloud Database
  const handleFileForFirebase = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP, etc.)');
      return;
    }

    // Limit to 20MB for fast processing
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Image file is too large (Maximum 20MB allowed).');
      return;
    }

    try {
      setIsUploadingImage(true);
      setUploadError('');

      const result = await uploadImageToFirebase(file, `${username || 'user'}_avatar`, currentUser?.id);
      if (result.displayUrl || result.url) {
        setProfilePicture(result.displayUrl || result.url);
      }
    } catch (err: any) {
      console.error('Firebase Image Upload Failed:', err);
      setUploadError('Could not process image file. Please try another image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileForFirebase(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileForFirebase(file);
    }
  };

  const handleToggleTab = (tabId: TabPermission) => {
    // If DNO editing themselves, keep user_management
    if (editingUser?.id === DNO_USER.id && tabId === 'user_management') {
      return;
    }
    setAllowedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]
    );
  };

  const handleToggleFeature = (featureId: FeaturePermission) => {
    setAllowedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((f) => f !== featureId) : [...prev, featureId]
    );
  };

  const handleSelectAllTabs = () => {
    setAllowedTabs(AVAILABLE_TABS.map((t) => t.id));
  };

  const handleClearAllTabs = () => {
    setAllowedTabs(['profile']);
  };

  const handleRolePreset = (selectedRole: 'counsellor' | 'supporting_staff') => {
    setRole(selectedRole);
    if (selectedRole === 'counsellor') {
      setDesignation('Student Guidance Counsellor');
      setAllowedTabs(['dashboard', 'tickets', 'visitors', 'students', 'profile']);
      setAllowedFeatures(['whatsapp_tool', 'ticket_generator_tool', 'add_candidate', 'add_visitor']);
    } else if (selectedRole === 'supporting_staff') {
      setDesignation('Supporting Staff');
      setAllowedTabs(['dashboard', 'visitors', 'students', 'profile']);
      setAllowedFeatures(['whatsapp_tool', 'qr_upload_tool', 'ticket_generator_tool', 'add_candidate', 'add_visitor']);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setFeedback({ message: 'Please enter a valid User ID / Username.', type: 'error' });
      return;
    }

    if (!password.trim()) {
      setFeedback({ message: 'Please enter a password for this user.', type: 'error' });
      return;
    }

    if (allowedTabs.length === 0) {
      setFeedback({ message: 'Please grant access to at least 1 tab permission.', type: 'error' });
      return;
    }

    const newUser: UserProfile = {
      id: editingUser ? editingUser.id : `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      username: username.trim().toLowerCase(),
      password: password.trim(),
      fullName: fullName.trim() || username.trim(),
      designation: designation.trim() || 'Portal Operator',
      phone: phone.trim(),
      email: email.trim(),
      role: role,
      allowedTabs: allowedTabs,
      allowedFeatures: allowedFeatures,
      isActive: isActive,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
      ...(profilePicture.trim() ? { profilePicture: profilePicture.trim() } : {}),
      ...(editingUser?.lastLogin ? { lastLogin: editingUser.lastLogin } : {}),
    };

    const res = await saveUserAsync(newUser);
    if (!res.success) {
      setFeedback({ message: res.message, type: 'error' });
      return;
    }

    refreshUsersList();
    if (onRefreshSession) {
      onRefreshSession();
    }
    setIsModalOpen(false);
  };

  const handleDelete = (userId: string, userName: string) => {
    if (userId === DNO_USER.id) {
      alert('The root DNO administrator profile cannot be deleted.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove user profile "${userName}"?`)) {
      const res = deleteUser(userId);
      if (!res.success) {
        alert(res.message);
      } else {
        refreshUsersList();
      }
    }
  };

  return (
    <div className="relative z-10 w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">User Management</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wide">
                DNO Admin
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          id="create-new-user-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New User Profile</span>
        </button>
      </div>

      {/* Rules Notice */}
      <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-950 shadow-2xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Role-Based Access Control (RBAC) System</p>
          <p className="text-blue-800/90 leading-relaxed">
            As the <b>District Nodal Officer (DNO)</b>, you can create staff profiles (Counsellor or Supporting Staff). Each user will only see the specific sidebar tabs and functional tool dialogs that you permit.
          </p>
        </div>
      </div>

      {/* User Profiles Table */}
      <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active System Profiles ({users.length})
          </h3>
          <span className="text-xs text-slate-400">Total authorized accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/70">
                <th className="py-3 px-4 font-semibold">User ID / Username</th>
                <th className="py-3 px-4 font-semibold">Staff Name & Designation</th>
                <th className="py-3 px-4 font-semibold">Password</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Accessible Tabs & Rules</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMasterDno = u.id === DNO_USER.id || u.username.toLowerCase() === 'dno';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Username & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.profilePicture ? (
                          <img
                            src={u.profilePicture}
                            alt={u.fullName || u.username}
                            className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-xs ring-1 ring-blue-500/10 shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isMasterDno
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isMasterDno ? 'D' : u.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-mono font-bold text-slate-900">{u.username}</p>
                          {isMasterDno && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                              Root DNO
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Name & Designation */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{u.fullName}</p>
                      <p className="text-[11px] text-slate-500">{u.designation || 'Staff'}</p>
                    </td>

                    {/* Password */}
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium">
                        {u.password}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                          u.role === 'dno'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : u.role === 'counsellor'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {u.role === 'dno'
                          ? 'DNO Admin'
                          : u.role === 'counsellor'
                          ? 'Counsellor'
                          : 'Supporting Staff'}
                      </span>
                    </td>

                    {/* Allowed Tabs & Rules */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {u.allowedTabs.map((tab) => (
                          <span
                            key={tab}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 capitalize font-medium"
                          >
                            {tab.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                      {u.allowedFeatures && u.allowedFeatures.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{u.allowedFeatures.length} Feature Tools Enabled</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.isActive ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit Rules & Credentials"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isMasterDno && (
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            title="Delete User Profile"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-300 transition-colors cursor-pointer"
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
        </div>
      </div>

      {/* Create / Edit User Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {editingUser ? `Edit Profile (${editingUser.username})` : 'Create New User Profile'}
                  </h3>
                  <p className="text-[11px] text-blue-200/80">
                    Define login credentials, accessible views, and feature permissions
                  </p>
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
            <form onSubmit={handleSaveForm} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-900 text-xs">
              {feedback.message && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 font-medium ${
                    feedback.type === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {feedback.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Profile Picture & Firebase Cloud Storage Section */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <Camera className="w-4 h-4 text-[#0056A6]" />
                      Profile Picture (Firebase Cloud Storage)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Photos are compressed & synced to Firebase Firestore database in real-time
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Firebase Active
                  </span>
                </div>

                {/* Upload Zone & Photo Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                  {/* Photo Preview Thumbnail */}
                  <div className="relative shrink-0">
                    {profilePicture ? (
                      <div className="relative group">
                        <img
                          src={profilePicture}
                          alt="User Profile Preview"
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0056A6] shadow-md ring-2 ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={() => setProfilePicture('')}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                          title="Remove Profile Picture"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <User className="w-8 h-8 text-slate-300 mb-0.5" />
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          No Photo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dropzone & Action Controls */}
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Drag & Drop Box */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                      className={`p-3 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer ${
                        isDragOver
                          ? 'border-[#0056A6] bg-blue-50/60'
                          : isUploadingImage
                          ? 'border-blue-300 bg-blue-50/30 cursor-wait'
                          : 'border-slate-200 hover:border-[#006BB6] hover:bg-slate-50'
                      }`}
                    >
                      {isUploadingImage ? (
                        <div className="flex items-center justify-center gap-2 text-blue-700 py-1 font-semibold text-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-[#0056A6]" />
                          <span>Saving image to Firebase Cloud Storage...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-0.5">
                          <div className="flex items-center gap-1.5 text-[#0056A6] font-bold text-xs">
                            <UploadCloud className="w-4 h-4 text-[#0056A6]" />
                            <span>Choose Photo to Upload (Firebase)</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Click to browse or drag & drop (JPG, PNG, WebP up to 20MB)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Upload error banner if any */}
                    {uploadError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{uploadError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="font-bold underline text-red-800 ml-2"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Stored Photo status */}
                    {profilePicture && (
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-medium">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Photo ready & stored in Firebase</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Role Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Select Staff Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'counsellor' as const,
                      label: 'Counsellor',
                      desc: 'Candidate guidance, ticket creation & candidate register',
                    },
                    {
                      id: 'supporting_staff' as const,
                      label: 'Supporting Staff',
                      desc: 'Verification, QR upload, visitor register & student directory',
                    },
                  ].map((r) => {
                    const isSelected = role === r.id || (r.id === 'supporting_staff' && role === 'operator');
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRolePreset(r.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-bold ring-2 ring-blue-100 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold">{r.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal leading-tight">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                  <Key className="w-4 h-4 text-blue-600" />
                  Login Credentials
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      User ID / Username: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. operator1, scrutiny_washim"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Password: <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="e.g. pass123"
                        required
                        className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal & Station Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Staff / Officer Name:</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh K. Deshmukh"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation:</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. E-Scrutiny Verification Incharge"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone / Mobile:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98221 00000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. operator@vmk.mah.gov.in"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Tab Permission Rules */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wide">
                      Allowed Navigation Tabs (RBAC Rules)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Check which views this user is authorized to open in the portal
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTabs}
                      className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllTabs}
                      className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_TABS.map((tab) => {
                    const isChecked = allowedTabs.includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-300 text-blue-950'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTab(tab.id)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900">{tab.label}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{tab.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Feature Tools Permissions */}
              <div className="space-y-2">
                <div className="border-b border-slate-100 pb-1.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide">
                    Allowed Feature Tools & Modals
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Control access to interactive dialog tools and data mutation actions
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_FEATURES.map((feature) => {
                    const isChecked = allowedFeatures.includes(feature.id);
                    return (
                      <label
                        key={feature.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleFeature(feature.id)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900">{feature.label}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {feature.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Account Status Switch */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-xs">Profile Status</p>
                  <p className="text-[11px] text-slate-500">Enable or disable login access instantly</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {editingUser ? 'Save Profile Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
