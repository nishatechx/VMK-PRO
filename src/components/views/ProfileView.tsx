import React, { useState, useRef } from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Shield,
  CheckCircle2,
  Camera,
  UploadCloud,
  Loader2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { UserProfile } from '../../types/auth';
import { uploadImageToFirebase } from '../../services/imageStorageService';
import { saveUserAsync } from '../../services/authService';

interface ProfileViewProps {
  onLogout: () => void;
  currentUser?: UserProfile | null;
  onRefreshSession?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onLogout,
  currentUser,
  onRefreshSession,
}) => {
  const isDno = currentUser?.role === 'dno' || currentUser?.username === 'dno';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      setUploadMsg({ text: 'Please choose an image file (JPG, PNG, WebP)', type: 'error' });
      return;
    }

    try {
      setIsUploading(true);
      setUploadMsg(null);

      const res = await uploadImageToFirebase(file, `${currentUser.username}_profile`, currentUser.id);
      const photoUrl = res.displayUrl || res.url;

      if (!photoUrl) {
        throw new Error('Image could not be encoded');
      }

      const updatedUser: UserProfile = {
        ...currentUser,
        profilePicture: photoUrl,
      };

      const saveRes = await saveUserAsync(updatedUser);
      if (saveRes.success) {
        setUploadMsg({
          text: 'Profile photo saved and updated in your profile!',
          type: 'success',
        });
        if (onRefreshSession) {
          onRefreshSession();
        }
      } else {
        setUploadMsg({ text: saveRes.message, type: 'error' });
      }
    } catch (err: any) {
      console.error('Profile photo error:', err);
      setUploadMsg({ text: 'Could not save photo. Please try a smaller image.', type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentUser) return;
    try {
      setIsUploading(true);
      const updatedUser: UserProfile = { ...currentUser };
      delete updatedUser.profilePicture;
      const saveRes = await saveUserAsync(updatedUser);
      if (saveRes.success) {
        setUploadMsg({ text: 'Profile picture removed successfully.', type: 'success' });
        if (onRefreshSession) {
          onRefreshSession();
        }
      }
    } catch (err) {
      console.error('Remove photo error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative z-10 w-full space-y-5">
      <div className="bg-white/90 backdrop-blur-xs p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar / Firebase Photo */}
          <div className="relative group shrink-0">
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={currentUser.fullName || currentUser.username}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0056A6] shadow-md ring-2 ring-blue-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0056A6] to-[#003B73] border border-[#003B73] flex items-center justify-center text-white text-3xl font-bold shadow-md">
                {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            {/* Quick Upload Trigger Icon */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-1.5 -right-1.5 p-2 bg-[#0056A6] hover:bg-[#003B73] text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Upload / Change Photo (Firebase Cloud Storage)"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-lg font-bold text-[#1F2937]">
                {currentUser?.fullName || 'User Profile'}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit mx-auto sm:mx-0 ${
                  isDno
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isDno
                  ? 'District Nodal Officer (DNO)'
                  : currentUser?.role === 'counsellor'
                  ? 'Counsellor'
                  : 'Supporting Staff'}
              </span>
            </div>
            <p className="text-xs text-[#4B5563] font-medium">
              {currentUser?.designation || (currentUser?.role === 'counsellor' ? 'Student Guidance Counsellor' : 'Supporting Staff')}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-400 font-mono">
              <span>User ID: <strong className="text-slate-700">{currentUser?.username || 'dno'}</strong></span>
              <span>•</span>
              <span>
                Role:{' '}
                <strong className="text-slate-700">
                  {currentUser?.role === 'dno'
                    ? 'DNO ADMIN'
                    : currentUser?.role === 'counsellor'
                    ? 'COUNSELLOR'
                    : 'SUPPORTING STAFF'}
                </strong>
              </span>
            </div>

            {/* Photo Action Links */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0056A6] hover:text-[#003B73] transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Profile Picture (Firebase)</span>
              </button>

              {currentUser?.profilePicture && (
                <>
                  <span>•</span>
                  <button
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                  >
                    <span>Remove Photo</span>
                  </button>
                </>
              )}
            </div>

            {uploadMsg && (
              <div
                className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                  uploadMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {uploadMsg.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                )}
                <span>{uploadMsg.text}</span>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Station & Jurisdiction
          </h3>
          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Washim Scrutiny Center, Maharashtra</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Scrutiny & Verification Desk</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{currentUser?.phone || '+91 98220 00000'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{currentUser?.email || 'dno.washim@cetcell.mah.gov.in'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active Rules & Assigned Privileges
          </h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Authorized Tabs:</span>
              <span className="font-bold text-slate-900">
                {currentUser?.allowedTabs ? `${currentUser.allowedTabs.length} Views` : 'All'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Interactive Feature Tools:</span>
              <span className="font-bold text-emerald-700">
                {currentUser?.allowedFeatures ? `${currentUser.allowedFeatures.length} Active` : 'All'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Account Status:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Session
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

