import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, LogIn, X } from 'lucide-react';
import { authenticateAsync, findUserByUsername } from '../services/authService';
import { UserProfile } from '../types/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Modal open state: starts with sign in button, opens modal on click
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Step 1: 'username' -> Step 2: 'password'
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [detectedUser, setDetectedUser] = useState<UserProfile | null>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setStep('username');
    setErrorMsg(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setStep('username');
    setUsername('');
    setPassword('');
    setErrorMsg(null);
    setDetectedUser(null);
  };

  const handleUsernameNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg('Please enter your username');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await findUserByUsername(cleanUsername);
      if (user) {
        setDetectedUser(user);
        setStep('password');
        setErrorMsg(null);
      } else {
        setErrorMsg('User not found. Please enter a valid registered username or contact DNO.');
      }
    } catch (err) {
      console.error('Error finding user:', err);
      setErrorMsg('Failed to verify username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter your password');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await authenticateAsync(username, password);

      if (user) {
        onLoginSuccess(user);
      } else {
        setErrorMsg('Invalid password. Please try again.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('Unable to verify credentials. Please check connection.');
      setIsLoading(false);
    }
  };

  const handleSwitchUser = () => {
    setStep('username');
    setPassword('');
    setErrorMsg(null);
    setDetectedUser(null);
  };

  const bgImageUrl =
    'https://blogger.googleusercontent.com/img/a/AVvXsEjmAY-7sCfDo5E5JYJ0XRhxw4b9ryC30M_A6kcbxNrI08JnWQeeXNLJSYmtxklJsFjv5LMr1Mnn06QcGHr0pJ6lHjwKNsIcyRLQ_DUuJgUZgd3hRbcJXjlRABvdnoPaMiRCTPahNvGIwuUfrKnDE78yChj2XQ2RJSyGLSUaJWwsByN7A5UCfk1MOFeaAIY=s1600';

  return (
    <div
      id="login-screen-root"
      className="relative min-h-screen w-full bg-slate-950 font-sans select-none overflow-hidden flex items-center justify-center"
    >
      {/* Background Image Layer (blurs when modal is open) */}
      <div
        className={`absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none transition-all duration-300 ${
          isModalOpen ? 'filter blur-md scale-105' : 'filter-none scale-100'
        }`}
      >
        <img
          src={bgImageUrl}
          alt="Portal Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
        <div
          className={`absolute inset-0 transition-colors duration-300 ${
            isModalOpen ? 'bg-black/65 backdrop-blur-md' : 'bg-black/25'
          }`}
        />
      </div>

      {/* Screen View when Modal is NOT open: Sign In button on the right side */}
      {!isModalOpen && (
        <div className="relative z-10 flex items-center justify-end w-full min-h-screen px-6 sm:px-12 md:px-20 pointer-events-none">
          <button
            id="open-login-btn"
            type="button"
            onClick={handleOpenModal}
            className="pointer-events-auto py-3 px-7 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xl shadow-black/70 border border-white/25 backdrop-blur-md hover:shadow-sky-500/30"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In</span>
          </button>
        </div>
      )}

      {/* Centered Login Modal when Sign In button is clicked */}
      {isModalOpen && (
        <div
          id="login-modal-overlay"
          className="fixed inset-0 z-20 flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Backdrop click to close */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            onClick={handleCloseModal}
          />

          {/* Form Card positioned directly in the CENTER */}
          <div
            id="login-card-center"
            className="relative z-10 w-full max-w-[360px] bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl text-white flex flex-col items-center gap-3.5 my-auto"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-20"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Error Message */}
            {errorMsg && (
              <div className="w-full flex items-center gap-2 p-2.5 bg-red-950/90 border border-red-500/50 rounded-xl text-red-200 text-xs shadow-lg">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            {step === 'username' ? (
              /* STEP 1: Ask for Username */
              <form onSubmit={handleUsernameNext} className="w-full space-y-4 pt-3">
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-sky-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Enter Username"
                    required
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-10 pr-3 py-3 bg-black/50 hover:bg-black/60 focus:bg-black/70 border border-white/20 focus:border-sky-400 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 font-mono transition-all"
                  />
                </div>

                <button
                  id="username-continue-btn"
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-950/60 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: Profile Picture perfect fit to login form + Welcome banner + Password */
              <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col items-center gap-3.5">
                {/* Profile Photo: Full-width container perfectly sized to the form */}
                <div className="w-full flex flex-col items-center justify-center pt-1">
                  <div
                    id="profile-picture-container"
                    className="relative w-full rounded-2xl overflow-hidden border-2 border-sky-400/80 bg-slate-950 shadow-2xl shadow-black/80 flex items-center justify-center"
                  >
                    {detectedUser?.profilePicture ? (
                      <img
                        src={detectedUser.profilePicture}
                        alt={detectedUser.fullName || detectedUser.username}
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-64 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-44 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg border-2 border-white/20 mb-2">
                          {(detectedUser?.fullName || detectedUser?.username || 'U')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      </div>
                    )}

                    {/* Online status indicator badge */}
                    <div
                      className="absolute top-2.5 right-2.5 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-md"
                      title="Active"
                    />
                  </div>
                </div>

                {/* Minimal detected user name and switch user button */}
                <div className="w-full flex items-center justify-between px-1">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {detectedUser?.fullName || detectedUser?.username}
                    </p>
                    <p className="text-[10px] text-sky-400 font-medium truncate">
                      {detectedUser?.designation || (detectedUser?.role ? detectedUser.role.toUpperCase() : 'PORTAL USER')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchUser}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 py-1 shrink-0 ml-2"
                    title="Switch user"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Switch</span>
                  </button>
                </div>

                {/* Password Input Field */}
                <div className="w-full">
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-sky-400 absolute left-3.5 pointer-events-none" />
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Enter Password"
                      required
                      autoComplete="current-password"
                      autoFocus
                      className="w-full pl-10 pr-10 py-3 bg-black/50 hover:bg-black/60 focus:bg-black/70 border border-white/20 focus:border-sky-400 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign In Submit Button */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading || !password.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-sky-950/60 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
