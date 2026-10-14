import React, { useState, useEffect, useRef } from "react";
import {
  authenticateWithResultAsync,
  findUserByUsername,
  getAllUsers,
  syncUsersFromServer,
  SUPER_ADMIN_USER,
} from "../services/authService";
import { UserProfile } from "../types/auth";
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { APP_ASSETS } from "../constants/assets";

interface LoginScreenProps {
  onLoginSuccess?: (user: UserProfile) => void;
  sessionTimeoutMessage?: string | null;
}

const BACKGROUND_IMAGE_URL =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhmYLVn2cOpaW_xLjRKo_qzogWHJB6gIcpMfNZD1TuwUDUU_SCO-O_tzdTTML1sf5tiE-MNkACF3De__5jEUKNB-aMp1BXL_diCzVauJk43i_9ASvkPSnMnH1DSA82aAGfqE1XvB89v7y9q3T_KAZUD0vwtpe8rUmYmzVypTPi15aPd-c0uhPUoqlV0WOVK/s1600/image.png";

export function LoginScreen({ onLoginSuccess, sessionTimeoutMessage }: LoginScreenProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(sessionTimeoutMessage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Sync users from persistent server on mount
  useEffect(() => {
    syncUsersFromServer().catch(() => {});
    usernameInputRef.current?.focus();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = usernameOrEmail.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setErrorMsg("Please enter your username or email.");
      return;
    }
    if (!cleanPass) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      let matchedUser = await findUserByUsername(cleanId);
      if (!matchedUser) {
        const all = getAllUsers();
        matchedUser =
          all.find(
            (u) =>
              u.username.toLowerCase() === cleanId.toLowerCase() ||
              u.email?.toLowerCase() === cleanId.toLowerCase()
          ) || null;
      }

      if (!matchedUser && (cleanId.toLowerCase() === "shri123" || cleanId.toLowerCase() === "shri")) {
        matchedUser = SUPER_ADMIN_USER;
      }

      let authId = matchedUser?.username || cleanId;
      if (cleanId.toLowerCase() === "shri123" || cleanId.toLowerCase() === "shri") {
        authId = "shrinath";
      }

      const result = await authenticateWithResultAsync(authId, cleanPass, matchedUser);
      if (result.user) {
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        setErrorMsg(result.error || "Invalid username or password. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setErrorMsg("Unable to verify credentials. Please try again.");
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setShowForgotPasswordModal(false);
      setForgotEmail("");
    }, 3500);
  };

  return (
    <main
      id="login-screen-root"
      style={{
        backgroundImage: `url("${BACKGROUND_IMAGE_URL}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      className="relative w-screen h-screen min-h-screen overflow-hidden flex items-center justify-end px-4 sm:px-8 md:px-12 lg:px-20 select-none"
    >
      {/* Fallback overlay for mobile viewports */}
      <div className="absolute inset-0 bg-slate-950/30 lg:bg-transparent pointer-events-none" />

      {/* LOGIN CARD ON THE RIGHT SIDE, VERTICALLY CENTERED */}
      <div className="relative z-10 w-full max-w-[560px] bg-white rounded-[20px] border border-[#DCE5F0] shadow-2xl p-8 sm:p-10 my-auto animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Logo - Centered */}
        <div className="flex flex-col items-center justify-center mb-6">
          <img
            id="login-page-brand-logo"
            src={APP_ASSETS.LOGO}
            alt="VMK Tools Logo"
            className="h-14 sm:h-16 w-auto object-contain block mb-4 select-none"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl sm:text-[26px] font-bold text-[#102544] tracking-tight">
            Sign in to your account
          </h1>
        </div>

        {/* Error Message Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5" noValidate>
          {/* 1. Username / Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="username-email-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[#62738D]"
            >
              Username / Email
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#62738D] pointer-events-none">
                <User className="w-5 h-5 stroke-[2]" />
              </span>
              <input
                ref={usernameInputRef}
                id="username-email-input"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => {
                  setUsernameOrEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter your username or email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isLoading}
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#DCE5F0] bg-white text-[#102544] placeholder-[#62738D]/60 text-sm font-medium outline-none transition-all duration-200 focus:border-[#0866D9] focus:ring-2 focus:ring-[#0866D9]/20"
              />
            </div>
          </div>

          {/* 2. Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[#62738D]"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#62738D] pointer-events-none">
                <Lock className="w-5 h-5 stroke-[2]" />
              </span>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full h-12 pl-11 pr-12 rounded-xl border border-[#DCE5F0] bg-white text-[#102544] placeholder-[#62738D]/60 text-sm font-medium outline-none transition-all duration-200 focus:border-[#0866D9] focus:ring-2 focus:ring-[#0866D9]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-[#62738D] hover:text-[#102544] transition-colors focus:outline-none p-1"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5 stroke-[2]" /> : <Eye className="w-5 h-5 stroke-[2]" />}
              </button>
            </div>
          </div>

          {/* 3. Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#DCE5F0] text-[#0866D9] focus:ring-[#0866D9] cursor-pointer"
              />
              <span className="text-[#62738D] font-medium text-xs sm:text-sm">Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setShowForgotPasswordModal(true);
                setForgotSent(false);
                setForgotEmail("");
              }}
              className="text-xs sm:text-sm font-semibold text-[#0866D9] hover:underline focus:outline-none"
            >
              Forgot password?
            </button>
          </div>

          {/* 4. Full-width Sign In Button */}
          <button
            type="submit"
            disabled={isLoading || !usernameOrEmail.trim() || !password.trim()}
            className="w-full h-12 rounded-xl bg-[#0866D9] hover:bg-[#0756bc] active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[#0866D9]/30 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#102544]">Reset Password</h3>
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {forgotSent ? (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xs shrink-0">✓</span>
                <span>If an account exists for {forgotEmail}, password reset instructions have been sent. Please contact your Super Admin / DNO for immediate password reset.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-sm text-[#62738D]">
                  Enter your registered username or email address and we will provide password recovery guidance.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#62738D] uppercase">Username or Email</label>
                  <input
                    type="text"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. shrinath or counsellor"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#DCE5F0] text-[#102544] text-sm focus:border-[#0866D9] focus:ring-2 focus:ring-[#0866D9]/20 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#DCE5F0] text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#0866D9] text-white text-sm font-bold hover:bg-[#0756bc] transition-colors shadow-md"
                  >
                    Send Instructions
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
