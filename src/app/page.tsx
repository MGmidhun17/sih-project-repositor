'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import {
  Code2,
  Sparkles,
  GraduationCap,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';

export default function LandingPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && userProfile) {
      if (userProfile.role === 'admin') router.push('/dashboard/admin');
      else if (userProfile.role === 'teacher') router.push('/dashboard/teacher');
      else router.push('/dashboard/student');
    }
  }, [user, userProfile, loading, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/60 backdrop-blur-md bg-slate-950/80 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                SIH Project Repository
              </h1>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wide">
                SMART INDIA HACKATHON EVALUATION PLATFORM
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Phase 1 Live
            </span>
          </div>
        </div>
      </header>

      {/* Hero Body */}
      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
        {/* Left Side: Presentation & Features */}
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Integrated Firebase Authentication & Role-Based Workflows
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Centralized Hackathon <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-rose-400 bg-clip-text text-transparent">
                Project Evaluation Engine
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Empowering students to publish hackathon projects, enabling teachers to review with structured scoring, and leveraging Gemini AI for automated tech tagging, SIH domain classification, and duplicate detection.
            </p>
          </div>

          {/* Three Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-white">Student Role</h3>
              <p className="text-[11px] text-slate-400">
                Submit projects, upload code, track evaluation feedback.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 w-fit">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-white">Teacher Role</h3>
              <p className="text-[11px] text-slate-400">
                Evaluate student submissions, leave scores & feedback.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 w-fit">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-white">Admin Role</h3>
              <p className="text-[11px] text-slate-400">
                Approve teacher access, manage SIH domains & analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="lg:col-span-5 flex justify-center">
          <AuthForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        SIH-Aligned Dynamic Student Hackathon Project Repository &bull; Next.js 14 + Firebase SDK
      </footer>
    </div>
  );
}
