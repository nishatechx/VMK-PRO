import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { authenticateAsync, findUserByUsername } from '../services/authService';
import { UserProfile } from '../types/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Step 1: Ask for username; Step 2: Show Welcome message + BIG photo above password field
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [detectedUser, setDetectedUser] = useState<UserProfile | null>(null);

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
        // Fallback user placeholder
        setDetectedUser({
          id: cleanUsername,
          username: cleanUsername,
          fullName: cleanUsername,
          role: 'operator',
          designation: 'Staff Member',
          allowedTabs: ['dashboard', 'visitors', 'students'],
          allowedFeatures: ['whatsapp_tool', 'add_candidate', 'add_visitor'],
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        setStep('password');
        setErrorMsg(null);
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

  // 12 pulsating dots for the opening circular animation
  const dotsCount = 12;
  const dots = Array.from({ length: dotsCount });

  return (
    <div
      id="login-screen-root"
      className="relative flex items-center justify-center lg:justify-end min-h-screen w-full bg-slate-900 text-slate-900 font-sans select-none overflow-hidden px-4 sm:px-8 md:px-12 lg:px-20 py-8"
    >
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <img
          src={bgImageUrl}
          alt="Portal Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-slate-950/25 backdrop-brightness-95" />
      </div>

      {/* Main Login Form Container */}
      <main className="relative z-10 w-full max-w-[320px] sm:max-w-[340px]">
        <div id="login-card" className="w-full flex flex-col items-center gap-3">
          {/* Error Message Alert */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="w-full flex items-center gap-2 p-2.5 bg-red-950/85 backdrop-blur-md border border-red-500/50 rounded-xl text-red-200 text-xs shadow-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="leading-tight">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 'username' ? (
              /* STEP 1: Ask for username */
              <motion.form
                key="step-username"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleUsernameNext}
                className="w-full space-y-3"
              >
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-sky-300 absolute left-3.5 pointer-events-none" />
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
                    className="w-full pl-10 pr-3 py-2.5 bg-black/40 hover:bg-black/50 focus:bg-black/60 backdrop-blur-md border border-white/25 focus:border-sky-400 rounded-xl text-white placeholder-sky-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 font-mono transition-all shadow-lg"
                  />
                </div>

                <button
                  id="username-next-btn"
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-sky-950/60 disabled:opacity-60 disabled:cursor-not-allowed"
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
              </motion.form>
            ) : (
              /* STEP 2: Welcome: username & BIG Photo above password field */
              <motion.form
                key="step-password"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onSubmit={handlePasswordSubmit}
                className="w-full flex flex-col items-center gap-3"
              >
                {/* BIG Profile Photo in Circle with Animated Opening Orbit Dots */}
                <div className="relative flex items-center justify-center my-2">
                  {/* Expanding Opening Animated Dots Orbit */}
                  <motion.div
                    initial={{ scale: 0.2, rotate: -30, opacity: 0 }}
                    animate={{ scale: 1, rotate: 360, opacity: 1 }}
                    transition={{
                      scale: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                      rotate: { duration: 22, repeat: Infinity, ease: 'linear' },
                      opacity: { duration: 0.3 },
                    }}
                    className="absolute w-32 h-32 pointer-events-none"
                  >
                    {dots.map((_, i) => {
                      const angle = (i * 360) / dotsCount;
                      const radius = 54; // distance from center
                      const x = radius * Math.cos((angle * Math.PI) / 180);
                      const y = radius * Math.sin((angle * Math.PI) / 180);

                      return (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{
                            scale: { duration: 2, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' },
                            opacity: { duration: 2, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' },
                          }}
                          style={{
                            position: 'absolute',
                            left: `calc(50% + ${x}px - 4px)`,
                            top: `calc(50% + ${y}px - 4px)`,
                          }}
                          className={`w-2 h-2 rounded-full ${
                            i % 2 === 0
                              ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                              : 'bg-indigo-300 shadow-[0_0_8px_#a5b4fc]'
                          }`}
                        />
                      );
                    })}
                  </motion.div>

                  {/* Pulsing Glow behind photo */}
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.65, 0.35] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-sky-400/40 via-blue-500/40 to-indigo-500/40 blur-md pointer-events-none"
                  />

                  {/* Big Circular Profile Photo */}
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="relative z-10"
                  >
                    {detectedUser?.profilePicture ? (
                      <img
                        src={detectedUser.profilePicture}
                        alt={detectedUser.fullName || detectedUser.username}
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-sky-400/90 shadow-2xl shadow-sky-950/80 bg-slate-900"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-3xl ring-4 ring-sky-400/90 shadow-2xl shadow-sky-950/80">
                        {(detectedUser?.fullName || detectedUser?.username || 'U')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    {/* Active Status Badge */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-md flex items-center justify-center"
                      title="Active"
                    >
                      <div className="w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Welcome Message Above Password Field */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  id="welcome-user-banner"
                  className="w-full px-3 py-2 bg-black/45 hover:bg-black/50 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-between shadow-lg"
                >
                  <div className="min-w-0 pr-2 text-left">
                    <div className="text-[12px] font-semibold text-sky-300 leading-tight">
                      welcome: {detectedUser?.fullName || detectedUser?.username}
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono">
                      @{detectedUser?.username}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchUser}
                    className="text-[11px] text-sky-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    title="Change user"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Switch</span>
                  </button>
                </motion.div>

                {/* Password Input Field */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full"
                >
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-sky-300 absolute left-3.5 pointer-events-none" />
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
                      className="w-full pl-10 pr-10 py-2.5 bg-black/40 hover:bg-black/50 focus:bg-black/60 backdrop-blur-md border border-white/25 focus:border-sky-400 rounded-xl text-white placeholder-sky-200/60 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 font-mono transition-all shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-sky-300 hover:text-white p-1 cursor-pointer transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading || !password.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-sky-950/60 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
