import React, { useState, useEffect, useRef } from "react";
import {
  authenticateAsync,
  authenticateWithResultAsync,
  findUserByUsername,
  getAllUsers,
  syncUsersFromServer,
  SUPER_ADMIN_USER,
} from "../services/authService";
import { UserProfile } from "../types/auth";
import { ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
import { APP_ASSETS } from "../constants/assets";

interface LoginScreenProps {
  onLoginSuccess?: (user: UserProfile) => void;
  sessionTimeoutMessage?: string | null;
}

const BACKGROUND_IMAGE_URL =
  "https://blogger.googleusercontent.com/img/a/AVvXsEiCfgSBobC0QO7wxdO4El6WiJPyRaJRPwfNCho5cNz-uDrLf-eIqNAp0YtrOxeU8v5U9aunXe1nZ56ugNIMANhLg3Z1PJi6ZYm41qgEElTeL_xo34Gna6rLAIv45CJwdzakCDw2M1m1roPKrWbOgWUKsq4HgIZtJPw2Iyeh981r-pmf3IsLdMcBeWMbzGg=s1600";

/**
 * Cleanly extracts a friendly display name (e.g., "Shrinath")
 */
function extractDisplayName(user: UserProfile | null, rawInput: string): string {
  if (user?.fullName) {
    const withoutSalutation = user.fullName
      .replace(/^(Mr\.|Dr\.|Mrs\.|Ms\.|Prof\.)\s*/i, "")
      .trim();
    const firstWord = withoutSalutation.split(" ")[0];
    return firstWord || withoutSalutation;
  }
  const clean = rawInput.trim();
  if (clean.toLowerCase() === "shri123" || clean.toLowerCase() === "shrinath") {
    return "Shrinath";
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Step 1: User ID input | Step 2: Password input
  const [step, setStep] = useState<1 | 2>(1);

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authenticated or resolved user profile for step 2
  const [resolvedUser, setResolvedUser] = useState<UserProfile | null>(null);

  const userIdInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Sync users from persistent server on mount so logins created on other laptops are instantly available
  useEffect(() => {
    syncUsersFromServer().catch(() => {});
  }, []);

  // Auto-focus input when transitioning between steps
  useEffect(() => {
    if (step === 1) {
      userIdInputRef.current?.focus();
    } else if (step === 2) {
      passwordInputRef.current?.focus();
    }
  }, [step]);

  // Handle Step 1: User ID Validation & Step Transition
  const handleUserIdSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = userId.trim();

    if (!cleanId) {
      setErrorMsg("Please enter your User ID");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Check direct lookup in auth service
      let matchedUser = await findUserByUsername(cleanId);

      // 2. Fallback check from memory/local storage
      if (!matchedUser) {
        const all = getAllUsers();
        matchedUser =
          all.find((u) => u.username.toLowerCase() === cleanId.toLowerCase()) || null;
      }

      // 3. Common alias support (e.g. SHRI123 -> Super Admin Shrinath)
      if (!matchedUser && cleanId.toLowerCase() === "shri123") {
        matchedUser = SUPER_ADMIN_USER;
      }

      if (matchedUser) {
        setResolvedUser(matchedUser);
        setStep(2);
      } else {
        // If not in known database list, allow user to proceed with entered ID
        setResolvedUser(null);
        setStep(2);
      }
    } catch (err) {
      console.warn("User lookup issue:", err);
      // Still proceed to password prompt cleanly
      setResolvedUser(null);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Password Authentication
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = userId.trim();
    const cleanPass = password.trim();

    if (!cleanPass) {
      setErrorMsg("Please enter your password");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      // Authenticate with resolved user profile or entered identifier
      let authId = resolvedUser?.username || cleanId;
      if (cleanId.toLowerCase() === "shri123" || cleanId.toLowerCase() === "shri") {
        authId = "shrinath";
      }

      const result = await authenticateWithResultAsync(authId, cleanPass, resolvedUser);
      if (result.user) {
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        setErrorMsg(result.error || "Invalid password. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setErrorMsg("Unable to verify credentials. Please try again.");
      setIsLoading(false);
    }
  };

  // Return from Step 2 back to Step 1
  const handleChangeUserId = () => {
    setStep(1);
    setPassword("");
    setErrorMsg(null);
  };

  const displayName = extractDisplayName(resolvedUser, userId);

  return (
    <main
      id="login-screen-root"
      style={{
        backgroundImage: `url("${BACKGROUND_IMAGE_URL}")`,
      }}
      className="relative w-screen h-screen min-h-screen bg-cover bg-center bg-no-repeat overflow-hidden flex flex-col justify-between text-white select-none"
    >
      {/* Subtle overlay only on small mobile viewports for enhanced contrast without a card */}
      <div className="absolute inset-0 bg-slate-950/20 lg:bg-transparent pointer-events-none" />

      {/* Top Header with Logo Touching Header Top & Left Edge with Radius */}
      <header
        id="login-screen-header"
        className="relative z-20 w-full p-0 flex items-start justify-between shrink-0"
      >
        <div className="flex items-start">
          <div className="bg-white/95 backdrop-blur-xs shadow-xl rounded-br-2xl sm:rounded-br-3xl border-b border-r border-slate-200/90 p-1.5 sm:p-2 overflow-hidden transition-all flex items-center justify-center">
            <img
              id="login-page-brand-logo"
              src={APP_ASSETS.LOGO}
              alt="State Common Entrance Test Cell, Maharashtra"
              className="h-12 sm:h-14 md:h-16 lg:h-18 w-auto max-w-[240px] sm:max-w-[320px] md:max-w-[380px] object-contain block select-none rounded-br-xl sm:rounded-br-2xl transition-transform hover:scale-[1.01]"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* LOGIN UI: Form in vertical middle, positioned on the right side of the page */}
      <div className="relative z-10 flex-1 flex items-center justify-center md:justify-end px-6 sm:px-12 md:pr-16 lg:pr-24 xl:pr-32 py-4">
        <div className="w-full max-w-[420px] flex flex-col justify-center">
          {/* ========================================================================= */}
          {/* STEP 1: USER ID                                                           */}
          {/* ========================================================================= */}
        {step === 1 && (
          <div
            key="step-1"
            className="w-full space-y-6 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-3"
          >
            {/* Inline Error Message */}
            {errorMsg && (
              <div
                role="alert"
                className="flex items-center gap-2 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-semibold backdrop-blur-md animate-in fade-in shadow-md"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1 Form */}
            <form onSubmit={handleUserIdSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="user-id-field"
                  className="block text-xs font-bold uppercase tracking-wider text-white drop-shadow-xs"
                >
                  User ID
                </label>
                <input
                  ref={userIdInputRef}
                  id="user-id-field"
                  type="text"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleUserIdSubmit();
                    }
                  }}
                  placeholder="Enter your User ID"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={isLoading}
                  className="w-full h-[54px] px-4 rounded-xl border-2 border-white bg-white/95 focus:bg-white text-slate-900 placeholder-slate-400 text-sm font-semibold outline-none transition-all duration-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/30 shadow-md"
                />
              </div>

              {/* Continue Button - 100% Solid (Non-Transparent) Yellow Gradient */}
              <button
                type="submit"
                disabled={isLoading || !userId.trim()}
                className="w-full h-[54px] rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 active:scale-[0.99] text-slate-950 font-black text-base shadow-xl shadow-yellow-950/30 border border-yellow-300 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-yellow-400/40"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: USER NAME + PASSWORD                                              */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div
            key="step-2"
            className="w-full space-y-6 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-3"
          >
            {/* Heading: Welcome back line with white text, yellow user name, and hi emoji */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md leading-tight text-white">
                Welcome back, <span className="text-yellow-400 font-black">{displayName}</span> 👋
              </h1>
            </div>

            {/* Inline Error Message */}
            {errorMsg && (
              <div
                role="alert"
                className="flex items-center gap-2 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-semibold backdrop-blur-md animate-in fade-in shadow-md"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 2 Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="password-field"
                  className="block text-xs font-bold uppercase tracking-wider text-white drop-shadow-xs"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="password-field"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={isLoading}
                    className="w-full h-[54px] pl-4 pr-12 rounded-xl border-2 border-white bg-white/95 focus:bg-white text-slate-900 placeholder-slate-400 text-sm font-semibold outline-none transition-all duration-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/30 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Sign In and Back below password field */}
              <div className="space-y-2.5 pt-1">
                {/* Sign In Button - 100% Solid (Non-Transparent) Yellow Gradient */}
                <button
                  type="submit"
                  disabled={isLoading || !password.trim()}
                  className="w-full h-[54px] rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 active:scale-[0.99] text-slate-950 font-black text-base shadow-xl shadow-yellow-950/30 border border-yellow-300 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-yellow-400/40"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* Back Button - 100% Solid (Non-Transparent) Dark Button */}
                <button
                  type="button"
                  onClick={handleChangeUserId}
                  disabled={isLoading}
                  className="w-full h-[48px] rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-[0.99] text-white font-bold text-sm border border-slate-700 shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>
            </form>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}

export default LoginScreen;
