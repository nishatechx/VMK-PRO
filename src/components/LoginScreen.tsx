import React, { useState, useRef, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { authenticateAsync } from '../services/authService';
import { UserProfile } from '../types/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  sessionTimeoutMessage?: string | null;
}

// Lush green rice fields with majestic mountains background video (Pexels 36796314)
const VIDEO_BG_URL =
  'https://videos.pexels.com/video-files/36796314/15592600_3840_2160_60fps.mp4';
const VIDEO_POSTER_URL =
  'https://images.pexels.com/videos/36796314/pictures/preview-0.jpg';

export function LoginScreen({ onLoginSuccess, sessionTimeoutMessage }: LoginScreenProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Guarantee seamless video playback and continuous looping
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;

    const playVideo = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy fallback: re-try on first user interaction if needed
          const handleFirstClick = () => {
            video.play().catch(() => {});
            window.removeEventListener('click', handleFirstClick);
            window.removeEventListener('keydown', handleFirstClick);
          };
          window.addEventListener('click', handleFirstClick, { once: true });
          window.addEventListener('keydown', handleFirstClick, { once: true });
        });
      }
    };

    playVideo();

    // Redundant onEnded restart handler for continuous looping across all browsers
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('Please enter your User ID');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('Please enter your password');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await authenticateAsync(cleanUsername, cleanPassword);
      if (user) {
        onLoginSuccess(user);
      } else {
        setErrorMsg('Invalid User ID or Password');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Unable to connect. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-screen-root"
      className="relative min-h-screen w-full font-sans select-none overflow-hidden flex items-center justify-end px-6 sm:px-12 md:px-16 lg:px-24"
    >
      {/* 100% Crisp Video Background with Zero Blur and Zero Darkening Overlay */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={VIDEO_POSTER_URL}
          onEnded={(e) => {
            e.currentTarget.currentTime = 0;
            e.currentTarget.play().catch(() => {});
          }}
          className="w-full h-full object-cover object-center"
        >
          <source src={VIDEO_BG_URL} type="video/mp4" />
        </video>
      </div>

      {/* Right Side Container: Login Form */}
      <form
        id="login-form"
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[320px] sm:max-w-[360px] flex flex-col gap-3.5 bg-transparent p-0 m-0 my-auto"
      >
        {/* Auto-logout / Session Timeout Notice */}
        {sessionTimeoutMessage && (
          <div
            id="session-timeout-alert"
            className="w-full flex items-start gap-2.5 p-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-semibold shadow-lg border border-amber-400 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <Clock className="w-4 h-4 shrink-0 text-slate-950 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-slate-950">Auto-Logout (1 Min Inactivity)</span>
              <span className="text-slate-900 leading-tight block mt-0.5">{sessionTimeoutMessage}</span>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="w-full flex items-center gap-2 p-2.5 bg-red-600 text-white rounded-xl text-xs font-medium shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* User ID Field */}
        <div className="relative flex items-center">
          <User className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            id="username-input"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="User ID"
            required
            autoComplete="username"
            autoFocus
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 focus:border-[#002b5c] rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#002b5c]/25 shadow-md transition-all"
          />
        </div>

        {/* Password Field */}
        <div className="relative flex items-center">
          <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            id="password-input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full pl-11 pr-11 py-3 bg-white border border-slate-300 focus:border-[#002b5c] rounded-xl text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#002b5c]/25 shadow-md transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Darker Blue Login Button */}
        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading || !username.trim() || !password.trim()}
          className="w-full py-3 px-5 rounded-xl bg-[#002b5c] hover:bg-[#001e40] active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>Login</span>
          )}
        </button>
      </form>
    </div>
  );
}
