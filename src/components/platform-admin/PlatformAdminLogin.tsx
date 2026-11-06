import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { CornerBriefLogo } from '../CornerBriefLogo';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';

interface PlatformAdminLoginProps {
  onLoginSuccess: (token: string, adminUser: any) => void;
  onNavigateHome: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const PlatformAdminLogin: React.FC<PlatformAdminLoginProps> = ({
  onLoginSuccess,
  onNavigateHome,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your administrative identifier and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/platform-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identifier.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || `Administrative authentication failed (HTTP ${response.status}).`
        );
      }

      if (data?.success && data?.token) {
        localStorage.setItem('cornerbrief_platform_admin_token', data.token);
        onLoginSuccess(data.token, data.admin);
      } else {
        throw new Error('Unexpected administrative authentication response.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Access denied. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await fetch('/api/platform-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || `Google authentication authorization failed (HTTP ${response.status}).`
        );
      }

      if (data?.success && data?.token) {
        localStorage.setItem('cornerbrief_platform_admin_token', data.token);
        onLoginSuccess(data.token, data.admin);
      } else {
        throw new Error('Administrative authorization was not granted for this account.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to authenticate via Google Account. Only authorized administrators may access.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07131F] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-slate-100 font-sans">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-[#1769E0]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
        className="w-full max-w-md relative z-10"
      >
        {/* Security Shield Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1769E0]/20 to-emerald-500/10 border border-[#1769E0]/30 shadow-lg shadow-[#1769E0]/10 mb-3">
            <Shield className="w-7 h-7 text-[#3B82F6]" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold tracking-widest text-[#3B82F6] uppercase">
              Restricted Access
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Platform Administration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Central governance, hospital verification, and system monitoring portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0B1F33]/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl p-6 sm:p-8">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="platform.admin or email"
                  className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrative password"
                  className="w-full bg-[#07131F] text-white border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 bg-[#1769E0] hover:bg-[#1558BD] text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#1769E0]/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In as Platform Administrator</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/60" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-[#0B1F33] px-3 text-slate-400 font-mono">
                or authenticate with Google
              </span>
            </div>
          </div>

          {/* Google Sign In for Authorized Admin */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full bg-[#07131F] hover:bg-slate-900 border border-slate-700 text-slate-200 font-medium py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
                <span>Authorizing Google ID...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Authorize with Superadmin Account</span>
              </>
            )}
          </button>

          {/* Security Notice */}
          <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              All administrative logins are cryptographically signed, session-bound, and permanently recorded in immutable audit logs.
            </span>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Return to CornerBrief Public Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};
