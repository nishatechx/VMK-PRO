import React, { useState } from 'react';
import { Settings, Shield, User, Building, MessageSquare, Save, Check, Users } from 'lucide-react';
import { UserProfile } from '../../types/auth';

interface SettingsViewProps {
  currentUser?: UserProfile | null;
  onNavigateToUsers?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onNavigateToUsers }) => {
  const [centerName, setCenterName] = useState('VMK Washim');
  const [centerCode, setCenterCode] = useState('VMK-WSM-01');
  const [nodalOfficer, setNodalOfficer] = useState('Mr. Shrinath Ghodake (DNO)');
  const [contactNumber, setContactNumber] = useState('+91 98220 00000');
  const [saved, setSaved] = useState(false);

  const isDno = currentUser?.role === 'dno' || currentUser?.username === 'dno';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="relative z-10 w-full space-y-5">
      <div className="bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Center Settings</h2>
            </div>
          </div>

          {isDno && onNavigateToUsers && (
            <button
              onClick={onNavigateToUsers}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Manage User Profiles (RBAC)</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              Center Name
            </label>
            <input
              type="text"
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              Center Code
            </label>
            <input
              type="text"
              value={centerCode}
              onChange={(e) => setCenterCode(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              District Nodal Officer (DNO)
            </label>
            <input
              type="text"
              value={nodalOfficer}
              onChange={(e) => setNodalOfficer(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
              Official Helpline / WhatsApp Number
            </label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-medium"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Software Design & Developed by Mr. Shrinath Ghodake (DNO).
          </p>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved Successfully' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
