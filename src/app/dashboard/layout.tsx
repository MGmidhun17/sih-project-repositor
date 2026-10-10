'use client';

import React from 'react';
import Navbar from '@/components/common/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        SIH-Aligned Dynamic Student Hackathon Project Repository &bull; Phase 1 Foundation
      </footer>
    </div>
  );
}
