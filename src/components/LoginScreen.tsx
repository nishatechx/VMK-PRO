import React, { useState, useEffect } from "react";
import {
  authenticateWithResultAsync,
  findUserByUsername,
  getAllUsers,
  syncUsersFromServer,
  SUPER_ADMIN_USER,
} from "../services/authService";
import { UserProfile } from "../types/auth";
import { APP_ASSETS } from "../constants/assets";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
  Mail,
  KeyRound,
  Loader2,
} from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateToSignup?: () => void;
  onOpenForgotPassword?: () => void;
}

const BACKGROUND_IMAGE_URL =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhmYLVn2cOpaW_xLjRKo_qzogWHJB6gIcpMfNZD1TuwUDUU_SCO-O_tzdTTML1sf5tiE-MNkACF3De__5jEUKNB-aMp1BXL_diCzVauJk43i_9ASvkPSnMnH1DSA82aAGfqE1XvB89v7y9q3T_KAZUD0vwtpe8rUmYmzVypTPi15aPd-c0uhPUoqlV0WOVK/s1600/image.png";

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onOpenForgotPassword,
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    // Sync users on mount
    syncUsersFromServer().catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedInput = usernameOrEmail.trim();
    if (!trimmedInput || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateWithResultAsync(trimmedInput, password);
      if (result.user) {
        setSuccessMessage("Login successful! Redirecting...");
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 600);
      } else {
        setErrorMessage(result.error || "Invalid username/email or password.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An error occurred during sign in.");
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    const email = forgotEmail.trim();
    if (!email) {
      setForgotError("Please enter your registered email or username.");
      return;
    }

    setForgotStatus("loading");
    setTimeout(() => {
      // Check if user exists
      const allUsers = getAllUsers();
      const found = allUsers.find(
        (u) =>
          u.username.toLowerCase() === email.toLowerCase() ||
          u.email.toLowerCase() === email.toLowerCase()
      );

      if (found || email.includes("@")) {
        setForgotStatus("success");
      } else {
        setForgotStatus("error");
        setForgotError("No account found matching that username or email.");
      }
    }, 800);
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-end overflow-x-hidden font-sans"
      style={{
        backgroundImage: `url("${BACKGROUND_IMAGE_URL}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Semi-transparent backdrop for mobile readability if background is bright */}
      <div className="absolute inset-0 bg-black/10 lg:bg-transparent pointer-events-none" />

      {/* Main Container - Right Aligned Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4 sm:mx-8 lg:mr-24 my-auto">
        <div className="bg-white border border-[#DCE5F0] shadow-2xl p-6 sm:p-8 rounded-none">
          
          {/* VMK Tools Logo - Bigger & Perfect Fit with robust fallback */}
          <div className="flex justify-center mb-6">
            <div className="w-[340px] h-[105px] flex items-center justify-center overflow-hidden bg-white">
              <img
                src={APP_ASSETS.LOGO}
                alt="VMK Tools"
                className="w-full h-full object-contain object-center"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div className="hidden font-black text-3xl tracking-tight text-[#092744] items-center justify-center gap-1.5 w-full h-full">
                VMK <span className="text-[#0866D9]">TOOLS</span>
              </div>
            </div>
          </div>

          {/* Error / Success Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2 rounded-none">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 rounded-none">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#102544] mb-1.5">
                USERNAME / EMAIL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#62738D]">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#DCE5F0] text-[#102544] text-sm placeholder-[#94A3B8] focus:outline-none focus:border-[#0866D9] focus:bg-white transition-colors rounded-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#102544] mb-1.5">
                PASSWORD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#62738D]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-12 py-3 bg-[#F8FAFC] border border-[#DCE5F0] text-[#102544] text-sm placeholder-[#94A3B8] focus:outline-none focus:border-[#0866D9] focus:bg-white transition-colors rounded-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#62738D] hover:text-[#102544] focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#0866D9] border-[#DCE5F0] rounded-none focus:ring-[#0866D9]"
                />
                <span className="text-[#62738D] font-medium text-xs">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(usernameOrEmail.includes("@") ? usernameOrEmail : "");
                  setForgotStatus("idle");
                  setForgotError("");
                  setIsForgotModalOpen(true);
                }}
                className="text-xs font-semibold text-[#0866D9] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#0866D9] hover:bg-[#0753b8] active:bg-[#064299] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 rounded-none shadow-md disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>



        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-none max-w-md w-full p-6 shadow-2xl border border-[#DCE5F0] relative">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 text-[#62738D] hover:text-[#102544]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 flex items-center justify-center text-[#0866D9] rounded-none">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#092744]">Reset Password</h3>
                <p className="text-xs text-[#62738D]">Enter your account username or email to recover access.</p>
              </div>
            </div>

            {forgotStatus === "success" ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-none flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Reset instructions sent!</p>
                    <p className="text-xs mt-1 text-emerald-700">
                      If an account matches <span className="font-medium">{forgotEmail}</span>, a password reset link has been dispatched. (For demo testing, admin credentials are admin / admin123).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full py-2.5 bg-[#092744] text-white text-sm font-semibold rounded-none hover:bg-[#071d33]"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded-none">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{forgotError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#102544] mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#62738D]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. admin or user@example.com"
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-[#F8FAFC] border border-[#DCE5F0] text-[#102544] text-sm placeholder-[#94A3B8] focus:outline-none focus:border-[#0866D9] rounded-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2 border border-[#DCE5F0] text-[#62738D] text-xs font-semibold rounded-none hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotStatus === "loading"}
                    className="px-5 py-2 bg-[#0866D9] text-white text-xs font-semibold rounded-none hover:bg-[#0753b8] flex items-center gap-1.5 disabled:opacity-70"
                  >
                    {forgotStatus === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Send Reset Instructions</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
