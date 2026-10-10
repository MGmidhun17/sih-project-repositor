'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/database';
import {
  Code2,
  LogOut,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function Navbar() {
  const { user, userProfile, logout, devSetRole } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showDevMenu, setShowDevMenu] = useState(false);

  const getRoleBadge = () => {
    if (!userProfile) return null;
    switch (userProfile.role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" /> Admin
          </span>
        );
      case 'teacher':
        return userProfile.approved ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Teacher (Approved)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Teacher (Pending)
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <GraduationCap className="w-3.5 h-3.5" /> Student
          </span>
        );
    }
  };

  const handleRoleChange = async (newRole: UserRole, approved: boolean = true) => {
    await devSetRole(newRole, approved);
    setShowDevMenu(false);
    if (newRole === 'admin') router.push('/dashboard/admin');
    else if (newRole === 'teacher') router.push('/dashboard/teacher');
    else router.push('/dashboard/student');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/60 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
              SIH Project Repository
            </h1>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Smart India Hackathon Evaluation Platform
            </p>
          </div>
        </Link>

        {/* User / Nav controls */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Nav tabs based on current path */}
            <nav className="hidden md:flex items-center gap-2 mr-2">
              <Link
                href="/dashboard/student"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/dashboard/student'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Student Hub
              </Link>
              <Link
                href="/dashboard/teacher"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/dashboard/teacher'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Teacher Portal
              </Link>
              <Link
                href="/dashboard/admin"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/dashboard/admin'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admin Control
              </Link>
            </nav>

            {/* Role Badge */}
            <div className="hidden sm:block">{getRoleBadge()}</div>

            {/* Dev Mode Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowDevMenu(!showDevMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium transition-all"
                title="Quick Switch Role for Developer Testing"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline">Dev Switch Role</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDevMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1 text-xs">
                  <p className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Test As Role:
                  </p>
                  <button
                    onClick={() => handleRoleChange('student')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Student</span>
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => handleRoleChange('teacher', false)}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Teacher (Pending)</span>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                  <button
                    onClick={() => handleRoleChange('teacher', true)}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Teacher (Approved)</span>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  <button
                    onClick={() => handleRoleChange('admin')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Admin</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
          >
            Sign In / Register
          </Link>
        )}
      </div>
    </header>
  );
}
