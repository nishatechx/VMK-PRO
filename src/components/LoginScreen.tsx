import React, { useState } from "react";
import { authenticateAsync } from "../services/authService";
import { UserProfile } from "../types/auth";
import { AlertCircle, Clock } from "lucide-react";
import { APP_ASSETS } from "../constants/assets";

interface LoginScreenProps {
  onLoginSuccess?: (user: UserProfile) => void;
  sessionTimeoutMessage?: string | null;
}

const OWL_USER =
  "https://blogger.googleusercontent.com/img/a/AVvXsEjJTzqBsxUb7bUn4spbV1MCF9IIV52IOZBn2CI1wk6Lhbt4Z6Ixi9aeEVLogDs0ROJPSWJp2XWjqTrgJBn8MC2e2HI9MqW18Xuf3RNdkhEQJxQ3gGuQiajpAVc_mHe6pRBv3eRdHU9f_S2p7I-I18uTW3dt02tr1EaQT4wdqOHW331QZhTmFgggO3TWRRA";

const OWL_PASSWORD =
  "https://blogger.googleusercontent.com/img/a/AVvXsEg7KiEDCaNRU9PviiSmaKBiacBQgrrVc7m4dzpw_nF2MB8_QGr-C0UY4JnwFQsP6RevNmCsyl0PGfmvemKvk6Cg75abveJa7-M4okyA8CqckwCrAN7sdlJjy8OAfwTihk6dl6DCV_hfr5pVBqNLlMTt2VDHKolPQ4XN1KIW8scu4zPtz9W7KV-2m3DeVSo";

const LOGIN_BG =
  "https://blogger.googleusercontent.com/img/a/AVvXsEgeAKwgGG1tV7qY4_y9u9NQ2dt_mGCqcSI-8zsaVnPa9Yk3YQxli3_XbRG9kyPMPUtFZwtpET9k3AMOlt17h6kM_WhC8TmJEjkMK0y-uiK1cUCHY_ik8C3K4ooZypOVq_70GmvLGQfdyqnFQRjrOGreEperImh8FrREM_4WuS-UN9X7BbFI9q_qIwyqewc=s1600";

export function LoginScreen({ onLoginSuccess, sessionTimeoutMessage }: LoginScreenProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [activeField, setActiveField] = useState("user");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    const img1 = new Image();
    img1.src = OWL_USER;
    const img2 = new Image();
    img2.src = OWL_PASSWORD;
    const imgLogo = new Image();
    imgLogo.src = APP_ASSETS.LOGO;
  }, []);

  const isTypingPassword = activeField === "password" || password.length > 0;
  const owl = isTypingPassword ? OWL_PASSWORD : OWL_USER;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = userId.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorMsg("Please enter your User ID");
      return;
    }

    if (!cleanPass) {
      setErrorMsg("Please enter your password");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await authenticateAsync(cleanUser, cleanPass);
      if (user) {
        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
      } else {
        setErrorMsg("Invalid User ID or Password");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Unable to connect. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-screen-root"
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 select-none overflow-hidden"
    >
      {/* Background Image */}
      <img
        src={LOGIN_BG}
        alt="Login Background"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />
      {/* Subtle overlay for optimal contrast */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[0.5px] pointer-events-none" />

      {/* Official Government Portal Logo - Top Left */}
      <div
        id="login-brand-logo-container"
        className="absolute top-4 left-4 sm:top-6 sm:left-8 z-30 flex items-center"
      >
        <div className="bg-white/95 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-lg border border-white/80 transition-all hover:bg-white flex items-center">
          <img
            id="login-brand-logo"
            src={APP_ASSETS.LOGO}
            alt="State Common Entrance Test Cell, Maharashtra"
            referrerPolicy="no-referrer"
            className="h-8 sm:h-11 md:h-13 w-auto max-w-[190px] sm:max-w-[270px] md:max-w-[320px] object-contain block"
          />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[430px] mx-auto">
        {/* OWL CHARACTER */}
        <div className="relative z-20 h-[155px] flex items-end justify-center -mb-[42px]">
          <img
            src={owl}
            alt="VMKTools Owl"
            referrerPolicy="no-referrer"
            className="
              h-[195px]
              w-auto
              object-contain
              block
              translate-y-[60px]
              transition-all
              duration-300
              ease-in-out
            "
          />
        </div>

        {/* LOGIN FORM CARD */}
        <div
          className="
            relative
            z-10
            rounded-[24px]
            bg-white
            px-8
            pt-[58px]
            pb-8
            shadow-2xl
            border
            border-slate-100
          "
        >
          {/* Timeout Alert Notice */}
          {sessionTimeoutMessage && (
            <div
              id="session-timeout-alert"
              className="mb-4 w-full flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold animate-in fade-in"
            >
              <Clock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-amber-900">Session Expired</span>
                <span className="text-amber-800 leading-tight block mt-0.5">{sessionTimeoutMessage}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div
              id="login-error-alert"
              className="mb-4 w-full flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          >
            {/* USER ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                User ID
              </label>

              <input
                id="username-input"
                name="user_identifier_auth"
                type="text"
                value={userId}
                onFocus={() => setActiveField("user")}
                onChange={(e) => {
                  setUserId(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter your User ID"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                data-bwignore="true"
                className="
                  w-full
                  h-12
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  px-4
                  text-slate-900
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-500/10
                  focus:bg-white
                "
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>

              <input
                id="password-input"
                name="pass_secret_token"
                type="password"
                value={password}
                onFocus={() => setActiveField("password")}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter your password"
                required
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                data-bwignore="true"
                className="
                  w-full
                  h-12
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  px-4
                  text-slate-900
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-500/10
                  focus:bg-white
                "
              />
            </div>

            {/* LOGIN BUTTON */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading || !userId.trim() || !password.trim()}
              className="
                w-full
                h-12
                rounded-xl
                bg-blue-600
                text-white
                font-semibold
                shadow-lg
                shadow-blue-600/20
                transition
                hover:bg-blue-700
                active:scale-[0.98]
                disabled:opacity-60
                disabled:cursor-not-allowed
                cursor-pointer
                flex
                items-center
                justify-center
                gap-2
              "
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
