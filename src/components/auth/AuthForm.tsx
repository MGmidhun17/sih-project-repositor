'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/database';
import {
  Lock,
  Mail,
  User,
  GraduationCap,
  Briefcase,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { loginWithEmail, signUpWithEmail, loginWithGoogle, devSetRole } = useAuth();
  const router = useRouter();

  const formatAuthError = (err: unknown): string => {
    if (!err || typeof err !== 'object') return 'Authentication failed. Please check your input.';
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj.code || '';
    const message = errorObj.message || '';

    if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
      return 'This email is already registered! Please click the "Sign In" tab above to log into your account.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password' || message.includes('invalid-credential')) {
      return 'Invalid email or password. If you don\'t have an account yet, click "Register Account" above.';
    }
    if (code === 'auth/weak-password' || message.includes('weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (code === 'auth/invalid-email' || message.includes('invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google Sign In popup was closed before completing.';
    }
    return message || 'Authentication failed. Check your input or credentials.';
  };

  const redirectUserByRole = (role: UserRole) => {
    if (role === 'admin') router.push('/dashboard/admin');
    else if (role === 'teacher') router.push('/dashboard/teacher');
    else router.push('/dashboard/student');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const profile = await signUpWithEmail(email, password, name, selectedRole);
        redirectUserByRole(profile?.role || selectedRole);
      } else {
        const profile = await loginWithEmail(email, password);
        redirectUserByRole(profile?.role || 'student');
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const profile = await loginWithGoogle(selectedRole);
      redirectUserByRole(profile?.role || selectedRole);
    } catch (err: unknown) {
      console.error('Google Sign In error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Instant Demo Login handler for easy testing
  const handleQuickDemo = async (role: UserRole, approved: boolean = true) => {
    await devSetRole(role, approved);
    redirectUserByRole(role);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
      {/* Mode Switch Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(false);
            setError(null);
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            !isSignUp
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(true);
            setError(null);
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            isSignUp
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Register Account
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAuthSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@institution.edu"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Role Selection on Sign Up */}
        {isSignUp && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Select Your Platform Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  selectedRole === 'student'
                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <GraduationCap className="w-4 h-4" /> Student
                </div>
                <span className="text-[10px] text-slate-400">
                  Submit projects & track status
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('teacher')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  selectedRole === 'teacher'
                    ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Briefcase className="w-4 h-4" /> Teacher
                </div>
                <span className="text-[10px] text-slate-400">
                  Requires Admin Approval
                </span>
              </button>
            </div>
            {selectedRole === 'teacher' && (
              <p className="mt-2 text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                ⚠️ Teacher accounts default to <strong>approved: false</strong> until an Admin approves your account in the Admin Dashboard.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        >
          {loading ? (
            'Processing...'
          ) : (
            <>
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800"></div>
        </div>
        <span className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500">
          Or Quick Test Demo
        </span>
      </div>

      {/* Google Auth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 mb-4"
      >
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
        Sign in with Google
      </button>

      {/* Instant Role Demo Launchers */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Instant Developer Mode Access:</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickDemo('student')}
            className="py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg text-[10px] font-semibold transition-colors text-center"
          >
            As Student
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('teacher', false)}
            className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg text-[10px] font-semibold transition-colors text-center"
          >
            As Teacher
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('admin')}
            className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-[10px] font-semibold transition-colors text-center"
          >
            As Admin
          </button>
        </div>
      </div>
    </div>
  );
}
