import React, { useState, useRef } from 'react';
import {
  Settings,
  Shield,
  User,
  Building,
  Save,
  Check,
  Users,
  Bell,
  Lock,
  Mail,
  Phone,
  Camera,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Key,
  Sliders,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Eye,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types/auth';
import { uploadImageToFirebase } from '../../services/imageStorageService';
import { saveUserAsync, saveUser } from '../../services/authService';
import { UserTabAccessManager } from '../superadmin/UserTabAccessManager';
import {
  DashboardBannerConfig,
  getDashboardBannerConfig,
  saveDashboardBannerConfig,
  subscribeToDashboardBanner,
} from '../../services/dashboardBannerService';

interface SettingsViewProps {
  currentUser?: UserProfile | null;
  onNavigateToUsers?: () => void;
  onRefreshSession?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onNavigateToUsers,
  onRefreshSession,
}) => {
  const [activeTab, setActiveTab] = useState<'center' | 'profile' | 'notifications' | 'tab_access' | 'dashboard_banner'>('center');

  // Center settings
  const [centerName, setCenterName] = useState('Facilitation Center FC-1102');
  const [centerCode, setCenterCode] = useState('FC-1102');
  const [nodalOfficer, setNodalOfficer] = useState('Mr. Shrinath Ghodake (DNO)');
  const [contactNumber, setContactNumber] = useState('+91 98220 12345');
  const [centerAddress, setCenterAddress] = useState('Government Polytechnic Campus, Risod Road, Washim 444505');
  const [saved, setSaved] = useState(false);

  // Profile update settings
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState(currentUser?.password || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notifications settings
  const [broadcastAlerts, setBroadcastAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Dashboard Banner state (Super Admin)
  const [bannerConfig, setBannerConfig] = useState<DashboardBannerConfig>(() => getDashboardBannerConfig());
  const [bannerImageUrl, setBannerImageUrl] = useState(bannerConfig.imageUrl || '');
  const [bannerLinkUrl, setBannerLinkUrl] = useState(bannerConfig.linkUrl || '');
  const [bannerTitle, setBannerTitle] = useState(bannerConfig.title || '');
  const [bannerSubtitle, setBannerSubtitle] = useState(bannerConfig.subtitle || '');
  const [bannerEnabled, setBannerEnabled] = useState(bannerConfig.enabled ?? true);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [bannerPreviewError, setBannerPreviewError] = useState(false);

  const isDno = currentUser?.role === 'dno' || currentUser?.username === 'dno';
  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.username?.toLowerCase() === 'shrinath';

  const handleSaveCenter = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      fullName: fullName.trim() || currentUser.fullName,
      phone: phone.trim() || currentUser.phone,
      email: email.trim() || currentUser.email,
      password: password.trim() || currentUser.password,
    };
    saveUser(updated);
    saveUserAsync(updated).catch(() => {});
    setProfileSaved(true);
    if (onRefreshSession) onRefreshSession();
    setTimeout(() => setProfileSaved(false), 2200);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setIsUploading(true);
      setUploadMsg(null);
      const res = await uploadImageToFirebase(file, `${currentUser.username}_profile`, currentUser.id);
      const photoUrl = res.displayUrl || res.url;
      if (!photoUrl) throw new Error('Encoding error');

      const updatedUser: UserProfile = {
        ...currentUser,
        profilePicture: photoUrl,
      };
      saveUser(updatedUser);
      await saveUserAsync(updatedUser);
      setUploadMsg({ text: 'Profile picture updated successfully', type: 'success' });
      if (onRefreshSession) onRefreshSession();
    } catch {
      setUploadMsg({ text: 'Failed to upload photo', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageUrl.trim()) return;
    try {
      const updated = await saveDashboardBannerConfig(
        {
          imageUrl: bannerImageUrl.trim(),
          linkUrl: bannerLinkUrl.trim() || undefined,
          title: bannerTitle.trim() || undefined,
          subtitle: bannerSubtitle.trim() || undefined,
          enabled: bannerEnabled,
        },
        currentUser?.username || 'Super Admin'
      );
      setBannerConfig(updated);
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 2500);
    } catch {}
  };

  const handleRemoveBanner = async () => {
    if (confirm('Are you sure you want to remove the dashboard banner?')) {
      const updated = await saveDashboardBannerConfig(
        {
          imageUrl: '',
          linkUrl: '',
          title: '',
          subtitle: '',
          enabled: false,
        },
        currentUser?.username || 'Super Admin'
      );
      setBannerConfig(updated);
      setBannerImageUrl('');
      setBannerLinkUrl('');
      setBannerTitle('');
      setBannerSubtitle('');
      setBannerEnabled(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-8 select-none font-sans">
      {/* Header */}
      <div className="bg-white border border-[#DCE5F0] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF3FC] text-[#0866D9] border border-[#DCE5F0]">
              Administration & Preferences
            </span>
            <span className="text-xs text-[#62738D]">Center Code: FC-1102</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#102544] tracking-tight mt-1">
            System & Center Settings
          </h2>
          <p className="text-xs text-[#62738D] mt-0.5">
            Configure center institutional details, personal credentials, notification alerts, and administrative user controls.
          </p>
        </div>

        {(isSuperAdmin || isDno) && onNavigateToUsers && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={onNavigateToUsers}
              className="px-4 py-2 rounded-xl bg-[#073B70] hover:bg-[#092744] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Users className="w-4 h-4 text-sky-300" />
              <span>Manage User Profiles (RBAC)</span>
            </button>
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="bg-white border border-[#DCE5F0] rounded-xl p-1.5 shadow-[0_1px_3px_rgba(16,37,68,0.04)] flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('center')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'center' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Center Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'profile' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Officer Profile & Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'notifications' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications & Sync</span>
        </button>

        {(isSuperAdmin || isDno) && (
          <button
            type="button"
            onClick={() => setActiveTab('tab_access')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'tab_access' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
            }`}
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>User Tab Access Control</span>
          </button>
        )}

        {(isSuperAdmin || isDno) && (
          <button
            type="button"
            onClick={() => setActiveTab('dashboard_banner')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'dashboard_banner' ? 'bg-[#073B70] text-white shadow-xs' : 'text-[#62738D] hover:text-[#102544] hover:bg-[#F4F7FB]'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>Dashboard Banner (By URL)</span>
          </button>
        )}
      </div>

      {/* TAB 1: Center Configuration */}
      {activeTab === 'center' && (
        <form onSubmit={handleSaveCenter} className="bg-white border border-[#DCE5F0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#102544] mb-1">Center Name</label>
              <input
                type="text"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">Official Center Code</label>
              <input
                type="text"
                value={centerCode}
                onChange={(e) => setCenterCode(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs font-mono text-[#073B70] font-bold outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">District Nodal Officer (DNO)</label>
              <input
                type="text"
                value={nodalOfficer}
                onChange={(e) => setNodalOfficer(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">Official Helpline / WhatsApp Number</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs font-mono text-[#102544] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#102544] mb-1">Center Physical Address</label>
            <textarea
              value={centerAddress}
              onChange={(e) => setCenterAddress(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none"
            />
          </div>

          <div className="pt-4 border-t border-[#DCE5F0] flex items-center justify-between">
            <p className="text-[11px] text-[#62738D]">
              Changes apply across printable receipts, SAC ticket footers, and official slips.
            </p>

            <button
              type="submit"
              className="px-5 py-2 bg-[#0866D9] hover:bg-[#073B70] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Saved Successfully' : 'Save Center Details'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Officer Profile & Security */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white border border-[#DCE5F0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-5 text-xs">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4 pb-4 border-b border-[#DCE5F0]">
            <div className="relative">
              {currentUser?.profilePicture ? (
                <img
                  src={currentUser.profilePicture}
                  alt={currentUser.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#0866D9]"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#073B70] text-white flex items-center justify-center font-bold text-xl">
                  {currentUser?.fullName?.charAt(0) || 'O'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 p-1.5 bg-[#0866D9] text-white rounded-lg shadow-xs hover:bg-[#073B70] cursor-pointer"
                title="Change Photo"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div>
              <h3 className="font-bold text-sm text-[#102544]">{currentUser?.fullName || currentUser?.username}</h3>
              <p className="text-[11px] text-[#62738D]">{currentUser?.designation} &bull; {currentUser?.district || 'Washim'}</p>
              {uploadMsg && (
                <span className={`text-[10px] font-bold ${uploadMsg.type === 'success' ? 'text-[#079669]' : 'text-[#D92D3A]'}`}>
                  {uploadMsg.text}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#102544] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">User Identifier</label>
              <input
                type="text"
                value={currentUser?.username || ''}
                disabled
                className="w-full px-3.5 py-2 bg-slate-100 border border-[#DCE5F0] rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">Mobile Contact</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs font-mono text-[#102544] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">Account Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs font-mono text-[#102544] outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#DCE5F0] flex items-center justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-[#0866D9] hover:bg-[#073B70] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              {profileSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
              <span>{profileSaved ? 'Profile Saved' : 'Update Credentials'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Notifications & Sync Preferences */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-[#DCE5F0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0]">
            <div>
              <span className="font-bold text-[#102544] block">Official Broadcast Popup Alerts</span>
              <p className="text-[#62738D] text-[11px]">Display high-priority DNO notices upon login</p>
            </div>
            <input
              type="checkbox"
              checked={broadcastAlerts}
              onChange={(e) => setBroadcastAlerts(e.target.checked)}
              className="w-4 h-4 accent-[#0866D9] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0]">
            <div>
              <span className="font-bold text-[#102544] block">Background Queue Auto-Sync</span>
              <p className="text-[#62738D] text-[11px]">Automatically flush offline candidate records when network restores</p>
            </div>
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#0866D9] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#F4F7FB] rounded-xl border border-[#DCE5F0]">
            <div>
              <span className="font-bold text-[#102544] block">Audio Notifications</span>
              <p className="text-[#62738D] text-[11px]">Sound chime when QR upload receives mobile document</p>
            </div>
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="w-4 h-4 accent-[#0866D9] cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB 4: User Tab Access Control (Super Admin RBAC) */}
      {activeTab === 'tab_access' && (
        <UserTabAccessManager
          currentUser={currentUser}
          onRefreshSession={onRefreshSession}
        />
      )}

      {/* TAB 5: Dashboard Announcement Banner by URL */}
      {activeTab === 'dashboard_banner' && (
        <form
          onSubmit={handleSaveBanner}
          className="bg-white border border-[#DCE5F0] rounded-2xl p-6 shadow-[0_1px_3px_rgba(16,37,68,0.04)] space-y-5 text-xs text-[#102544]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE5F0]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FC] text-[#0866D9] uppercase tracking-wider border border-[#DCE5F0]">
                  Super Admin Facility
                </span>
                <span className="text-xs text-[#62738D]">Center Visual Branding</span>
              </div>
              <h3 className="text-base font-bold text-[#102544] mt-1">
                Dashboard Announcement Banner (By URL)
              </h3>
              <p className="text-xs text-[#62738D] mt-0.5">
                Set an official institutional banner image applied as the background behind the Welcome Back section on the dashboard.
              </p>
            </div>

            {bannerSaved && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Banner Saved & Applied!</span>
              </span>
            )}
          </div>

          {/* Visibility Toggle */}
          <div className="p-3.5 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-[#102544]">Banner Visibility</p>
              <p className="text-[11px] text-[#62738D]">
                Turn this switch on to show the banner on the main dashboard
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bannerEnabled}
                onChange={(e) => setBannerEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0866D9]"></div>
            </label>
          </div>

          {/* Banner Image URL */}
          <div>
            <label className="block font-semibold text-[#102544] mb-1">
              Banner Image Direct URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                required
                value={bannerImageUrl}
                onChange={(e) => {
                  setBannerImageUrl(e.target.value);
                  setBannerPreviewError(false);
                }}
                placeholder="https://example.com/banner-image.jpg"
                className="w-full pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-[#62738D] mt-1">
              Paste any public direct image URL. Ideal size: <strong className="text-[#102544]">1600 × 200 px</strong> (or <strong className="text-[#102544]">1200 × 150 px</strong>, ~8:1 to 10:1 wide panoramic strip).
            </p>
          </div>

          {/* Destination Link URL */}
          <div>
            <label className="block font-semibold text-[#102544] mb-1">
              Destination Link URL <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                value={bannerLinkUrl}
                onChange={(e) => setBannerLinkUrl(e.target.value)}
                placeholder="https://cetcell.mahacet.org"
                className="w-full pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#102544] mb-1">
                Headline / Caption <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="e.g. CAP 2026-27 Facilitation Center"
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#102544] mb-1">
                Supporting Subtitle <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={bannerSubtitle}
                onChange={(e) => setBannerSubtitle(e.target.value)}
                placeholder="e.g. Scrutiny & Guidance Desk Active"
                className="w-full px-3.5 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-1.5 pt-2">
            <span className="font-semibold text-[#102544] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#0866D9]" />
              Live Visual Preview
            </span>
            <div className="w-full min-h-[90px] max-h-48 rounded-xl border border-[#DCE5F0] bg-slate-50 overflow-hidden flex items-center justify-center p-1 relative">
              {bannerImageUrl ? (
                bannerPreviewError ? (
                  <div className="p-4 text-center text-red-600 space-y-1">
                    <AlertCircle className="w-5 h-5 mx-auto" />
                    <p className="font-bold text-xs">Failed to load image preview</p>
                    <p className="text-[10px] text-slate-500">Check the image link.</p>
                  </div>
                ) : (
                  <div className="w-full h-full relative group">
                    <img
                      src={bannerImageUrl}
                      alt={bannerTitle || 'Dashboard Banner'}
                      onError={() => setBannerPreviewError(true)}
                      className="w-full h-auto max-h-44 object-contain rounded-lg mx-auto"
                    />
                    {bannerTitle && (
                      <div className="absolute bottom-2 left-2 bg-[#102544]/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[11px] font-semibold">
                        {bannerTitle}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="p-6 text-center text-[#62738D]">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <p>Paste an image URL above to view the preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-[#DCE5F0] flex items-center justify-between">
            <div>
              {bannerImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="px-3.5 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Banner</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2 bg-[#0866D9] hover:bg-[#073B70] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply Banner</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
