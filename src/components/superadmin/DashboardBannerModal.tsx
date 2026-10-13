import React, { useState, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Eye,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  DashboardBannerConfig,
  getDashboardBannerConfig,
  saveDashboardBannerConfig,
} from '../../services/dashboardBannerService';

interface DashboardBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserUsername?: string;
  onBannerSaved?: (config: DashboardBannerConfig) => void;
}

const PRESET_BANNERS = [
  {
    name: 'Official Admissions Portal Banner',
    url: 'https://blogger.googleusercontent.com/img/a/AVvXsEhWw3qHhT1G6M9fM1U3Yg-K7vA_rUu9lS7Xm2Pq0jKlNm8-L_h4T6mF9dK8tW1vY0eU4oZ2=s1600',
    link: 'https://cetcell.mahacet.org',
    title: 'Maharashtra Centralized Admission Process',
    subtitle: 'Centralized Admission Process (CAP) 2026-27 Facilitation Center',
  },
  {
    name: 'Government Scrutiny & Verification Desk',
    url: 'https://blogger.googleusercontent.com/img/a/AVvXsEj7b3_7O4S8_2YQ_v1bBqX7D_K8l5_Z3M2y-9v0n6=s1600',
    link: 'https://cetcell.mahacet.org',
    title: 'E-Scrutiny & Physical Verification Schedule',
    subtitle: 'Visit FC-1102 Washim for instant document verification and candidate assistance',
  },
];

export const DashboardBannerModal: React.FC<DashboardBannerModalProps> = ({
  isOpen,
  onClose,
  currentUserUsername,
  onBannerSaved,
}) => {
  const [config, setConfig] = useState<DashboardBannerConfig>(() => getDashboardBannerConfig());
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getDashboardBannerConfig();
      setConfig(current);
      setImageUrl(current.imageUrl || '');
      setLinkUrl(current.linkUrl || '');
      setTitle(current.title || '');
      setSubtitle(current.subtitle || '');
      setEnabled(current.enabled ?? true);
      setPreviewError(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      alert('Please provide a valid banner image URL.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await saveDashboardBannerConfig(
        {
          imageUrl: imageUrl.trim(),
          linkUrl: linkUrl.trim() || undefined,
          title: title.trim() || undefined,
          subtitle: subtitle.trim() || undefined,
          enabled,
        },
        currentUserUsername || 'Super Admin'
      );
      setSaveSuccess(true);
      if (onBannerSaved) onBannerSaved(updated);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 1200);
    } catch {
      setIsSaving(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (confirm('Are you sure you want to remove the dashboard banner?')) {
      setIsSaving(true);
      const updated = await saveDashboardBannerConfig(
        {
          imageUrl: '',
          linkUrl: '',
          title: '',
          subtitle: '',
          enabled: false,
        },
        currentUserUsername || 'Super Admin'
      );
      setImageUrl('');
      setLinkUrl('');
      setTitle('');
      setSubtitle('');
      setEnabled(false);
      if (onBannerSaved) onBannerSaved(updated);
      setIsSaving(false);
      onClose();
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_BANNERS[0]) => {
    setImageUrl(preset.url);
    setLinkUrl(preset.link);
    setTitle(preset.title);
    setSubtitle(preset.subtitle);
    setEnabled(true);
    setPreviewError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in select-none font-sans">
      <div className="bg-white rounded-2xl border border-[#DCE5F0] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#073B70] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-sky-300">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                Dashboard Announcement Banner (By URL)
              </h3>
              <p className="text-[11px] text-sky-200">
                Super Admin configuration &bull; Applied as background behind the Welcome Back section across all dashboards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs text-[#102544]">
          {/* Toggle Display State */}
          <div className="p-3.5 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-[#102544]">Banner Visibility</p>
              <p className="text-[11px] text-[#62738D]">
                Enable or temporarily hide the banner on the main dashboard
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0866D9]"></div>
            </label>
          </div>

          {/* Banner Image URL */}
          <div>
            <label className="block font-bold text-xs text-[#102544] mb-1">
              Banner Image URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewError(false);
                }}
                placeholder="https://example.com/banner-image.jpg"
                className="w-full pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-[#62738D] mt-1">
              Paste any public direct image URL (PNG, JPG, WebP, SVG). Ideal size: <strong className="text-[#102544]">1600 × 200 px</strong> (or <strong className="text-[#102544]">1200 × 150 px</strong>, ~8:1 to 10:1 wide panoramic strip).
            </p>
          </div>

          {/* Target Link Destination URL */}
          <div>
            <label className="block font-bold text-xs text-[#102544] mb-1">
              Destination Click URL <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-[#62738D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://cetcell.mahacet.org"
                className="w-full pl-9 pr-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-[#62738D] mt-1">
              Clicking the banner will open this official destination link in a new tab.
            </p>
          </div>

          {/* Optional Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-xs text-[#102544] mb-1">
                Banner Title / Headline <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CAP 2026-27 Facilitation Center"
                className="w-full px-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-[#102544] mb-1">
                Supporting Subtitle <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Scrutiny & Guidance Desk Active"
                className="w-full px-3 py-2 bg-[#F4F7FB] border border-[#DCE5F0] rounded-xl text-xs text-[#102544] outline-none focus:border-[#0866D9] focus:bg-white"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#102544] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#0866D9]" />
                Live Banner Preview
              </span>
              {imageUrl && !previewError && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Image verified
                </span>
              )}
            </div>

            <div className="w-full min-h-[90px] max-h-48 rounded-xl border border-[#DCE5F0] bg-slate-50 overflow-hidden flex items-center justify-center relative p-1">
              {imageUrl ? (
                previewError ? (
                  <div className="p-4 text-center text-red-600 space-y-1">
                    <AlertCircle className="w-5 h-5 mx-auto" />
                    <p className="font-bold text-xs">Failed to load image preview</p>
                    <p className="text-[10px] text-slate-500">
                      Verify that the URL points to a valid public image file.
                    </p>
                  </div>
                ) : (
                  <div className="w-full h-full relative group">
                    <img
                      src={imageUrl}
                      alt={title || 'Dashboard Banner'}
                      onError={() => setPreviewError(true)}
                      className="w-full h-auto max-h-44 object-contain rounded-lg mx-auto"
                    />
                    {title && (
                      <div className="absolute bottom-2 left-2 bg-[#102544]/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[11px] font-semibold">
                        {title}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="p-6 text-center text-[#62738D]">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <p>Enter an image URL above to see live preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Preset Suggestions */}
          <div className="pt-2 border-t border-[#DCE5F0]">
            <p className="text-[11px] font-bold text-[#62738D] mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Quick Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_BANNERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-[#EBF3FC] hover:bg-[#0866D9] hover:text-white text-[#0866D9] text-[10px] font-semibold transition-all cursor-pointer border border-[#DCE5F0]"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#DCE5F0] flex items-center justify-between gap-3">
            <div>
              {imageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Banner</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#0866D9] hover:bg-[#073B70] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved & Applied!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Apply Banner</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
