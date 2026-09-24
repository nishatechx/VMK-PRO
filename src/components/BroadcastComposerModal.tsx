import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Send,
  Image as ImageIcon,
  Link as LinkIcon,
  AlertTriangle,
  Info,
  ShieldAlert,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  Eye,
} from 'lucide-react';
import { BroadcastNotification, BroadcastPriority, BroadcastTargetRole } from '../types/broadcast';
import { UserProfile } from '../types/auth';
import {
  getBroadcasts,
  saveBroadcast,
  deleteBroadcast,
  subscribeToBroadcasts,
} from '../services/broadcastService';
import { compressImage } from '../services/imageStorageService';

interface BroadcastComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

export const BroadcastComposerModal: React.FC<BroadcastComposerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // Form Fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<BroadcastPriority>('important');
  const [targetAudience, setTargetAudience] = useState<BroadcastTargetRole>('all');
  const [targetDistrict, setTargetDistrict] = useState<string>('all');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkText, setLinkText] = useState<string>('Open Link / Circular');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [allBroadcasts, setAllBroadcasts] = useState<BroadcastNotification[]>(() => getBroadcasts());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.username?.toLowerCase() === 'shrinath';
  const isDno = currentUser?.role === 'dno' || currentUser?.username?.toLowerCase() === 'dno';
  const userDistrict = currentUser?.district || 'Washim';

  useEffect(() => {
    if (isDno && !isSuperAdmin) {
      setTargetDistrict(userDistrict);
    }
  }, [isDno, isSuperAdmin, userDistrict]);

  useEffect(() => {
    const unsub = subscribeToBroadcasts((list) => {
      setAllBroadcasts(list);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image for fast Firestore & localStorage sync
      const compressed = await compressImage(file, 900, 700, 0.82);
      setImageUrl(compressed);
      setErrorMsg('');
    } catch (err) {
      console.error('Image compression error:', err);
      setErrorMsg('Failed to process image. Please try a different image.');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a broadcast notification title.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Please enter the broadcast message / directive.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const newBroadcast: BroadcastNotification = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        linkText: linkText.trim() || undefined,
        senderName: currentUser?.fullName || currentUser?.username || 'District Authority',
        senderRole: isSuperAdmin ? 'super_admin' : 'dno',
        senderDistrict: isSuperAdmin ? 'State Center' : userDistrict,
        createdAt: new Date().toISOString(),
        targetRoles: targetAudience === 'all' ? ['all'] : [targetAudience],
        targetDistrict: isSuperAdmin ? targetDistrict : userDistrict,
        isActive: true,
        priority,
      };

      await saveBroadcast(newBroadcast);

      setSuccessMsg('Broadcast notification sent successfully! It will appear as a popup to counsellors & supporting staff upon login.');
      // Reset form
      setTitle('');
      setMessage('');
      setImageUrl('');
      setLinkUrl('');
      setLinkText('Open Link / Circular');

      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('manage');
      }, 1500);
    } catch (err) {
      console.error('Error broadcasting notification:', err);
      setErrorMsg('Failed to send broadcast notification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke and delete this broadcast notification?')) {
      return;
    }
    try {
      await deleteBroadcast(id);
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#003B73] via-[#0056A6] to-[#002850] text-white flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 border border-white/20 shadow-xs">
              <Radio className="w-5 h-5 animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Broadcast Center Notification</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  {isSuperAdmin ? 'Super Admin Control' : `DNO Control • ${userDistrict}`}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Broadcast messages, images & links that popup in counsellors & supporting staff logins.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 px-4 pt-2 bg-slate-50 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-[#0056A6] text-[#0056A6]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose Broadcast</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'border-[#0056A6] text-[#0056A6]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Active Broadcasts ({allBroadcasts.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* Broadcast Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Broadcast Title / Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mandatory Verification Protocol for CAP Round 1"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 outline-none text-slate-900 font-medium"
                />
              </div>

              {/* Priority & Target Audience Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as BroadcastPriority)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 outline-none text-slate-900 font-semibold cursor-pointer"
                  >
                    <option value="important">Important (Amber Notice)</option>
                    <option value="urgent">Urgent (Red Administrative Alert)</option>
                    <option value="info">General Info (Blue Center Memo)</option>
                  </select>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Receiver Group
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as BroadcastTargetRole)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 outline-none text-slate-900 font-semibold cursor-pointer"
                  >
                    <option value="all">All Staff (Counsellors & Supporting Staff)</option>
                    <option value="counsellor">Counsellors Only</option>
                    <option value="supporting_staff">Supporting Staff Only</option>
                  </select>
                </div>
              </div>

              {/* District Scope (Super Admin only can choose All or specific; DNO locked) */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District Scope
                  </label>
                  <select
                    value={targetDistrict}
                    onChange={(e) => setTargetDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 outline-none text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="all">All Facilitation Centers (State-wide)</option>
                    <option value="Washim">Washim District Only</option>
                    <option value="Akola">Akola District Only</option>
                    <option value="Amravati">Amravati District Only</option>
                    <option value="Buldhana">Buldhana District Only</option>
                    <option value="Yavatmal">Yavatmal District Only</option>
                  </select>
                </div>
              )}

              {/* Message Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Broadcast Message / Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter the detailed announcement, guidelines, or instructions that staff must read upon logging into the portal..."
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#0056A6] focus:ring-2 focus:ring-[#0056A6]/20 outline-none text-slate-900 font-normal leading-relaxed resize-y"
                />
              </div>

              {/* Image Attachment (File upload or preview) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#0056A6]" />
                    <span>Attach Official Circular / Document Image (Optional)</span>
                  </span>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold cursor-pointer"
                    >
                      Remove image
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-[#0056A6] text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:bg-slate-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#0056A6]" />
                    <span>Choose Image from Computer</span>
                  </button>

                  <span className="text-[11px] text-slate-400 text-center sm:text-left">or enter image URL:</span>

                  <input
                    type="url"
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://.../circular.png"
                    className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg outline-none text-slate-900 font-mono"
                  />
                </div>

                {imageUrl && (
                  <div className="mt-2 relative w-32 h-24 rounded-lg border border-slate-300 overflow-hidden bg-white shadow-xs">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* Reference Link */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[#0056A6]" />
                  <span>Attach Reference Link / Circular Portal (Optional)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://cetcell.mahacet.org/... or external link"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      placeholder="Button label e.g., View Official Circular"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none text-slate-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#0056A6] hover:bg-[#003B73] active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast to Counsellors & Staff'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Manage Active Broadcasts */
            <div className="space-y-3">
              {allBroadcasts.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Radio className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-slate-700">No active broadcast notifications</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Compose a broadcast above to push notifications to all counselors and supporting staff upon login.
                  </p>
                </div>
              ) : (
                allBroadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#0056A6]/40 transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              b.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : b.priority === 'important'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-sky-100 text-sky-800 border-sky-200'
                            }`}
                          >
                            {b.priority || 'Notice'}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{b.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                          {b.message}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer shrink-0"
                        title="Delete / Revoke broadcast"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>By: <strong>{b.senderName}</strong> ({b.senderRole})</span>
                        <span>&bull; Target: <strong>{b.targetRoles?.join(', ') || 'All'}</strong></span>
                        {b.targetDistrict && <span>&bull; District: {b.targetDistrict}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {b.imageUrl && <span className="text-[#0056A6] font-semibold">Has image</span>}
                        {b.linkUrl && <span className="text-[#0056A6] font-semibold">Has link</span>}
                        <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
