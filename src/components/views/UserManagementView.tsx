import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  X,
  MapPin,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { UserProfile, TabPermission, FeaturePermission, UserRole } from '../../types/auth';
import { MAHARASHTRA_DISTRICTS } from '../../constants/districts';
import {
  getAllUsers,
  subscribeToUsers,
  saveUserAsync,
  deleteUser,
  AVAILABLE_TABS,
  AVAILABLE_FEATURES,
  DNO_USER,
  SUPER_ADMIN_USER,
} from '../../services/authService';
import {
  getMasterApiKey,
  saveMasterApiKey,
  deleteMasterApiKey,
  subscribeToMasterApiKey,
  toggleUserApiKeyPermission,
  grantApiKeyToAllUsers,
} from '../../services/apiConfigService';
import { uploadImageToFirebase } from '../../services/imageStorageService';
import { FormValidationErrorModal } from '../FormValidationErrorModal';

interface UserManagementViewProps {
  currentUser: UserProfile;
  onRefreshSession?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  onRefreshSession,
}) => {
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUsers());
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'dno' | 'counsellor' | 'supporting_staff' | 'student'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.username?.toLowerCase() === 'shrinath';
  const isDno = !isSuperAdmin && (currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno');
  const currentDistrict = (currentUser?.district || 'Washim').trim().toLowerCase();

  // "show dno only his districts counselors data"
  // For Super Admin: manage all users across all districts
  // For DNO: strictly isolate users to their assigned administrative district
  const scopedUsers = useMemo(() => {
    return users.filter((u) => {
      if (isSuperAdmin) {
        return true;
      }
      // Always show this DNO's own profile
      if (u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()) {
        return true;
      }
      if (isDno) {
        const uDistrict = (u.district || 'Washim').trim().toLowerCase();
        return uDistrict === currentDistrict;
      }
      return true;
    });
  }, [users, isSuperAdmin, isDno, currentDistrict, currentUser]);

  // Filtered Users incorporating Search & District Filter Tools
  const filteredUsers = useMemo(() => {
    return scopedUsers.filter((u) => {
      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'super_admin') {
          if (!(u.role === 'super_admin' || u.username.toLowerCase() === 'shrinath')) return false;
        } else if (roleFilter === 'dno') {
          if (!(u.role === 'dno' || u.username.toLowerCase() === 'dno')) return false;
        } else if (roleFilter === 'supporting_staff') {
          if (!(u.role === 'supporting_staff' || u.role === 'operator')) return false;
        } else if (u.role !== roleFilter) {
          return false;
        }
      }

      // District filter (for Super Admin State-wide tool)
      if (isSuperAdmin && selectedDistrict !== 'all') {
        const uDist = (u.district || '').trim().toLowerCase();
        if (uDist !== selectedDistrict.toLowerCase()) return false;
      }

      // Search query filter tool
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = u.username.toLowerCase().includes(q);
        const matchName = (u.fullName || '').toLowerCase().includes(q);
        const matchPhone = (u.phone || '').toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchDesig = (u.designation || '').toLowerCase().includes(q);
        const matchDistrict = (u.district || '').toLowerCase().includes(q);
        if (!matchUser && !matchName && !matchPhone && !matchEmail && !matchDesig && !matchDistrict) {
          return false;
        }
      }

      return true;
    });
  }, [scopedUsers, roleFilter, selectedDistrict, isSuperAdmin, searchQuery]);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState<string>('Washim');
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
  const [canUseApiKey, setCanUseApiKey] = useState<boolean>(true);

  // Master Gemini API Key Management State
  const [masterApiKey, setMasterApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [tempMasterKey, setTempMasterKey] = useState<string>('');
  const [showMasterKeyInput, setShowMasterKeyInput] = useState<boolean>(false);
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [keyActionFeedback, setKeyActionFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({
    message: '',
    type: '',
  });

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | '' }>({
    message: '',
    type: '',
  });

  // Validation Popup Modal State
  const [validationPopup, setValidationPopup] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    missingFields: string[];
    extraErrors?: string[];
  }>({
    isOpen: false,
    title: 'User Details Incomplete',
    description: 'Please complete all required fields before saving user profile:',
    missingFields: [],
    extraErrors: [],
  });

  useEffect(() => {
    const unsubscribeUsers = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });
    const unsubscribeKey = subscribeToMasterApiKey((key) => {
      setMasterApiKey(key);
    });
    return () => {
      unsubscribeUsers();
      unsubscribeKey();
    };
  }, []);

  // Listen to Quick Tool triggers from Super Admin Sidebar / External Actions
  useEffect(() => {
    const handleOpenCreateModal = () => openCreateModal();
    const handleOpenKeyModal = () => handleOpenApiKeyModal();
    const handleExportUsers = () => exportUsersCsv();

    window.addEventListener('open-create-user-modal', handleOpenCreateModal);
    window.addEventListener('open-master-key-modal', handleOpenKeyModal);
    window.addEventListener('export-users-directory', handleExportUsers);

    return () => {
      window.removeEventListener('open-create-user-modal', handleOpenCreateModal);
      window.removeEventListener('open-master-key-modal', handleOpenKeyModal);
      window.removeEventListener('export-users-directory', handleExportUsers);
    };
  });

  const refreshUsersList = () => {
    setUsers(getAllUsers());
  };

  const handleToggleApiKeyAccess = async (user: UserProfile) => {
    const newStatus = user.canUseApiKey === false ? true : false;
    const res = await toggleUserApiKeyPermission(user.id, newStatus);
    if (res.success) {
      setFeedback({
        message: res.message,
        type: 'success',
      });
      setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
      refreshUsersList();
    } else {
      setFeedback({
        message: res.message,
        type: 'error',
      });
    }
  };

  const handleGrantAllStaff = async () => {
    const res = await grantApiKeyToAllUsers();
    if (res.success) {
      setFeedback({
        message: res.message,
        type: 'success',
      });
      setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
      refreshUsersList();
    }
  };

  const handleOpenApiKeyModal = () => {
    setTempMasterKey(masterApiKey);
    setShowMasterKeyInput(false);
    setKeyActionFeedback({ message: '', type: '' });
    setIsApiKeyModalOpen(true);
  };

  const handleSaveMasterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempMasterKey.trim()) {
      setKeyActionFeedback({ message: 'Please enter a valid Google Gemini API key.', type: 'error' });
      return;
    }
    setIsSavingKey(true);
    setKeyActionFeedback({ message: '', type: '' });
    try {
      const res = await saveMasterApiKey(tempMasterKey.trim(), currentUser.username || 'dno');
      if (res.success) {
        setKeyActionFeedback({ message: res.message, type: 'success' });
        setTimeout(() => {
          setIsApiKeyModalOpen(false);
          setKeyActionFeedback({ message: '', type: '' });
        }, 1200);
      } else {
        setKeyActionFeedback({ message: res.message, type: 'error' });
      }
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleDeleteMasterKey = async () => {
    if (window.confirm('Are you sure you want to remove the center Master Gemini API key? Staff users will no longer be able to run OCR without entering their own key.')) {
      setIsSavingKey(true);
      try {
        const res = await deleteMasterApiKey();
        setKeyActionFeedback({ message: res.message, type: res.success ? 'success' : 'error' });
        setTempMasterKey('');
        if (res.success) {
          setTimeout(() => {
            setIsApiKeyModalOpen(false);
          }, 1200);
        }
      } finally {
        setIsSavingKey(false);
      }
    }
  };

  // User Management Tool: Export Profiles Directory as CSV
  const exportUsersCsv = () => {
    const headers = [
      'User ID / Username',
      'Staff Name',
      'Designation',
      'Role',
      'District',
      'Phone',
      'Email',
      'Status',
      'Gemini OCR Key Access',
    ];
    const rows = filteredUsers.map((u) => [
      `"${u.username}"`,
      `"${(u.fullName || '').replace(/"/g, '""')}"`,
      `"${(u.designation || '').replace(/"/g, '""')}"`,
      `"${u.role}"`,
      `"${(u.district || 'State-wide').replace(/"/g, '""')}"`,
      `"${u.phone || ''}"`,
      `"${u.email || ''}"`,
      `"${u.isActive !== false ? 'Active' : 'Inactive'}"`,
      `"${u.canUseApiKey !== false ? 'Enabled' : 'Disabled'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `user_management_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    setDistrict(currentUser.district || 'Washim');
    setProfilePicture('');
    setIsUploadingImage(false);
    setUploadError('');
    setRole('supporting_staff');
    setAllowedTabs(['dashboard', 'visitors', 'students', 'profile']);
    setAllowedFeatures(['whatsapp_tool', 'qr_upload_tool', 'ticket_generator_tool', 'add_candidate', 'add_visitor']);
    setCanUseApiKey(true);
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
    setDistrict(user.district || currentUser.district || 'Washim');
    setProfilePicture(user.profilePicture || '');
    setIsUploadingImage(false);
    setUploadError('');
    setRole(user.role === 'operator' ? 'supporting_staff' : user.role);
    setAllowedTabs([...user.allowedTabs]);
    setAllowedFeatures([...user.allowedFeatures]);
    setCanUseApiKey(user.canUseApiKey !== false);
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
    // If Super Admin or DNO editing themselves, keep user_management
    if (
      (editingUser?.id === SUPER_ADMIN_USER.id ||
        editingUser?.id === 'super_admin_shrinath' ||
        editingUser?.username?.toLowerCase() === 'shrinath' ||
        editingUser?.id === DNO_USER.id) &&
      tabId === 'user_management'
    ) {
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

  const handleRolePreset = (selectedRole: 'super_admin' | 'dno' | 'counsellor' | 'supporting_staff' | 'student') => {
    setRole(selectedRole);
    if (selectedRole === 'super_admin') {
      setDesignation('Super Administrator');
      setAllowedTabs(['user_management', 'profile']);
      setAllowedFeatures([]);
      setCanUseApiKey(true);
    } else if (selectedRole === 'dno') {
      setDesignation('District Nodal Officer (DNO)');
      setAllowedTabs(['dashboard', 'visitors', 'tickets', 'students', 'user_management', 'settings', 'profile', 'google_sheets']);
      setAllowedFeatures(['whatsapp_tool', 'qr_upload_tool', 'ticket_generator_tool', 'img_to_pdf_tool', 'image_to_text_tool', 'add_candidate', 'add_visitor', 'export_reports']);
      setCanUseApiKey(true);
    } else if (selectedRole === 'counsellor') {
      setDesignation('Student Guidance Counsellor');
      setAllowedTabs(['dashboard', 'tickets', 'visitors', 'students', 'profile']);
      setAllowedFeatures(['whatsapp_tool', 'ticket_generator_tool', 'add_candidate', 'add_visitor']);
    } else if (selectedRole === 'supporting_staff') {
      setDesignation('Supporting Staff');
      setAllowedTabs(['dashboard', 'visitors', 'students', 'profile']);
      setAllowedFeatures(['whatsapp_tool', 'qr_upload_tool', 'ticket_generator_tool', 'add_candidate', 'add_visitor', 'export_reports']);
    } else if (selectedRole === 'student') {
      setDesignation('Student / Candidate');
      setAllowedTabs(['dashboard', 'students', 'profile']);
      setAllowedFeatures([]);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing: string[] = [];
    const extra: string[] = [];

    if (!username.trim()) missing.push('User ID / Username');
    if (!password.trim()) missing.push('Password');
    if (allowedTabs.length === 0) missing.push('At least 1 Tab Permission');

    if (phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        extra.push('Phone number must be a valid 10-digit Indian phone number.');
      }
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      extra.push('Email address format is invalid.');
    }

    if (missing.length > 0 || extra.length > 0) {
      setValidationPopup({
        isOpen: true,
        title: 'User Profile Incomplete',
        description: 'User profile cannot be saved because required information is missing or invalid:',
        missingFields: missing,
        extraErrors: extra,
      });
      setFeedback({
        message: `Validation Error: ${missing.length > 0 ? `${missing.length} required field(s) missing.` : ''} ${extra.join(' ')}`,
        type: 'error',
      });
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
      district: district.trim() || currentUser.district || 'Washim',
      role: role,
      allowedTabs: allowedTabs,
      allowedFeatures: allowedFeatures,
      canUseApiKey: canUseApiKey,
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
    if (
      userId === SUPER_ADMIN_USER.id ||
      userId === 'super_admin_shrinath' ||
      userName.toLowerCase() === 'shrinath'
    ) {
      alert('The Super Administrator profile cannot be deleted.');
      return;
    }

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
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
            isSuperAdmin ? 'bg-purple-700 shadow-purple-700/20' : 'bg-blue-600 shadow-blue-600/20'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">User Management</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                isSuperAdmin
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {isSuperAdmin ? 'Super Admin Mode' : 'DNO Admin'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSuperAdmin
                ? 'Super Administrator desk • Full control across all 36 Maharashtra districts'
                : `Managing staff and candidate accounts in ${currentUser.district || 'Washim'} District`}
            </p>
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
            {isSuperAdmin ? (
              <>
                As the <b>Super Administrator</b>, you have master privileges across the state to manage, create, and supervise all accounts (DNOs, Counsellors, Scrutiny Staff, and Students) across all 36 districts of Maharashtra.
              </>
            ) : (
              <>
                As the <b>District Nodal Officer (DNO)</b>, you can create staff profiles (Counsellor or Supporting Staff). Each user will only see the specific sidebar tabs and functional tool dialogs that you permit.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Master Gemini API Key Central Management Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4.5 text-white shadow-md border border-indigo-900/60 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
              <Key className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white">Central Gemini Vision API Key (OCR & AI Extraction)</h3>
                {masterApiKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Cloud Active (••••{masterApiKey.slice(-4)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    No Key Configured
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl leading-relaxed">
                Add your Gemini API key once here. The DNO can grant permission to individual staff members below so they can transcribe Marathi, Hindi & English handwritten documents in the Image-to-Text tool without adding their own key.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleGrantAllStaff}
              type="button"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-1.5"
              title="Grant API Key access to all active staff profiles"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Grant Key to All Staff</span>
            </button>

            <button
              onClick={handleOpenApiKeyModal}
              type="button"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-300" />
              <span>{masterApiKey ? 'Update Master Key' : 'Configure Master Key'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* District Scoping / Super Admin Banner */}
      {isSuperAdmin ? (
        <div className="p-3.5 bg-purple-50 border border-purple-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-purple-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              Super Administrator Scope: <strong className="font-bold text-purple-900 text-sm">All Maharashtra Districts</strong> &bull; Managing all user accounts, DNOs, counsellors, and scrutiny operators.
            </span>
          </div>
          <span className="px-2.5 py-1 bg-white border border-purple-200 rounded-lg font-bold text-purple-800 text-[11px] shrink-0">
            {users.length} Total Registered Users (State-wide)
          </span>
        </div>
      ) : (
        <div className="p-3.5 bg-sky-50 border border-sky-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-sky-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-sky-700 shrink-0" />
            <span>
              DNO District Scope: <strong className="font-bold text-sky-900 text-sm">{currentUser.district || 'Washim'}</strong> &bull; Showing only counselors, staff and candidate accounts in <strong>{currentUser.district || 'Washim'} District</strong>.
            </span>
          </div>
          <span className="px-2.5 py-1 bg-white border border-sky-200 rounded-lg font-bold text-sky-800 text-[11px] shrink-0">
            {scopedUsers.filter((u) => u.username.toLowerCase() !== 'dno').length} Staff in District
          </span>
        </div>
      )}

      {/* User Profiles Table */}
      <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {/* User Management Search & Quick Action Toolbar */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user ID, staff name, mobile, district..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* State-wide District Scoping Filter Tool (Super Admin) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                  title="Filter user list by Maharashtra district"
                >
                  <option value="all">All 36 Districts (State-wide)</option>
                  {MAHARASHTRA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d} District
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Export Directory Tool & Active Count */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Showing <strong className="text-slate-800 font-bold">{filteredUsers.length}</strong> of {scopedUsers.length} profiles
            </span>
            <button
              type="button"
              onClick={exportUsersCsv}
              id="export-users-directory-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-98"
              title="Export filtered directory to CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Category Filters Header */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filter by Role:
            </h3>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs select-none">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({scopedUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('super_admin')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'super_admin'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Super Admin ({scopedUsers.filter((u) => u.role === 'super_admin' || u.username.toLowerCase() === 'shrinath').length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('dno')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'dno'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              DNO ({scopedUsers.filter((u) => u.role === 'dno' || u.username.toLowerCase() === 'dno').length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('counsellor')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'counsellor'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Counsellors ({scopedUsers.filter((u) => u.role === 'counsellor').length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('supporting_staff')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'supporting_staff'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Supporting Staff ({scopedUsers.filter((u) => u.role === 'supporting_staff' || u.role === 'operator').length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('student')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                roleFilter === 'student'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Students ({scopedUsers.filter((u) => u.role === 'student').length})
            </button>
          </div>
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
                <th className="py-3 px-4 font-semibold">Gemini API Access</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No user profiles found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? `No accounts match "${searchQuery}"`
                        : 'No accounts in this category or selected district.'}
                    </p>
                    {(searchQuery || selectedDistrict !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedDistrict('all');
                        }}
                        className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                const isSuperAdminUser = u.role === 'super_admin' || u.id === 'super_admin_shrinath' || u.username.toLowerCase() === 'shrinath';
                const isMasterDno = !isSuperAdminUser && (u.id === DNO_USER.id || u.username.toLowerCase() === 'dno');

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
                              isSuperAdminUser
                                ? 'bg-purple-700 text-white shadow-xs'
                                : isMasterDno
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isSuperAdminUser ? 'S' : isMasterDno ? 'D' : u.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-mono font-bold text-slate-900">{u.username}</p>
                          {isSuperAdminUser && (
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                              Super Admin
                            </span>
                          )}
                          {isMasterDno && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              Root DNO
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Name & Designation & District */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{u.fullName}</p>
                      <p className="text-[11px] text-slate-500">{u.designation || 'Staff'}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/80">
                        <MapPin className="w-2.5 h-2.5 text-blue-600" />
                        <span>{u.district || (isSuperAdminUser ? 'All Maharashtra' : 'Washim')}</span>
                      </span>
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
                          u.role === 'super_admin'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : u.role === 'dno'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : u.role === 'counsellor'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {u.role === 'super_admin'
                          ? 'Super Admin'
                          : u.role === 'dno'
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

                    {/* Gemini API Access */}
                    <td className="py-3.5 px-4">
                      {isSuperAdminUser ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs">
                          <Key className="w-3 h-3 text-purple-600" />
                          <span>Super Admin</span>
                        </span>
                      ) : isMasterDno ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>DNO (Root)</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleApiKeyAccess(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shadow-2xs ${
                              u.canUseApiKey !== false
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                            title={
                              u.canUseApiKey !== false
                                ? 'Click to revoke Gemini API key access'
                                : 'Click to grant Gemini API key access'
                            }
                          >
                            {u.canUseApiKey !== false ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Allowed</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>Blocked</span>
                              </>
                            )}
                          </button>
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

                        {!isMasterDno && !isSuperAdminUser && (
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
              }))}
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
                  Select Staff / User Role Category
                </label>
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5`}>
                  {[
                    ...(isSuperAdmin
                      ? [
                          {
                            id: 'super_admin' as const,
                            label: 'Super Admin',
                            desc: 'Master State Administrator • All districts & full privileges',
                          },
                        ]
                      : []),
                    {
                      id: 'dno' as const,
                      label: 'DNO (District Officer)',
                      desc: 'District Nodal Officer • Full admin & supervision',
                    },
                    {
                      id: 'counsellor' as const,
                      label: 'Counsellor',
                      desc: 'Candidate guidance & tickets',
                    },
                    {
                      id: 'supporting_staff' as const,
                      label: 'Supporting Staff',
                      desc: 'Scrutiny, visitors & directory',
                    },
                    {
                      id: 'student' as const,
                      label: 'Student / Candidate',
                      desc: 'Candidate status & profile only',
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

                {/* District Selection Field for DNO Supervision */}
                <div className="sm:col-span-2 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-3.5 rounded-xl border border-blue-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>Assigned Maharashtra District: <span className="text-red-500">*</span></span>
                    </label>
                    <span className="text-[10px] text-blue-800 font-bold bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-200">
                      DNO Scoping & Visibility
                    </span>
                  </div>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {MAHARASHTRA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist} {dist === (currentUser?.district || 'Washim') ? '• (Current Center District)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                    The DNO assigned to <strong>{district}</strong> can view and supervise this staff member's uploaded files and activity data. Other counselors cannot view each other's uploaded vault files.
                  </p>
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

              {/* Gemini Vision API Key Access Switch */}
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200/80 flex items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Key className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span>Gemini Vision API Access</span>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">OCR / Handwriting</span>
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Allow this staff member to transcribe documents using the central DNO Master API Key
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                  <input
                    type="checkbox"
                    checked={canUseApiKey}
                    onChange={(e) => setCanUseApiKey(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
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

      {/* Master Gemini API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-amber-300">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Central Gemini Vision API Key</h3>
                  <p className="text-[11px] text-indigo-200">Shared handwriting recognition & document OCR</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterKey} className="p-6 space-y-4">
              {keyActionFeedback.message && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    keyActionFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {keyActionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{keyActionFeedback.message}</span>
                </div>
              )}

              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <b>Why use a Central Master API Key?</b>
                <p className="mt-0.5 text-blue-800/90 text-[11px]">
                  Setting your key here saves it securely to the cloud database. Staff users granted permission by you can transcribe student documents, certificates, and handwritten applications without needing to provide their own key or configure environment variables.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Google Gemini API Key:</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Get Key from Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showMasterKeyInput ? 'text' : 'password'}
                    value={tempMasterKey}
                    onChange={(e) => setTempMasterKey(e.target.value)}
                    placeholder="AIzaSy..."
                    required
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterKeyInput(!showMasterKeyInput)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showMasterKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Starts with <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">AIzaSy...</code> from Google AI Studio.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {masterApiKey ? (
                  <button
                    type="button"
                    onClick={handleDeleteMasterKey}
                    disabled={isSavingKey}
                    className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Remove Key</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingKey}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Master Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Validation Error Popup Modal */}
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
