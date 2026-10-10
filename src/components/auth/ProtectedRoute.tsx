'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
        return;
      }

      if (userProfile && !allowedRoles.includes(userProfile.role)) {
        // Redirect to user's assigned dashboard based on actual role
        switch (userProfile.role) {
          case 'admin':
            router.push('/dashboard/admin');
            break;
          case 'teacher':
            router.push('/dashboard/teacher');
            break;
          case 'student':
          default:
            router.push('/dashboard/student');
            break;
        }
      }
    }
  }, [user, userProfile, loading, allowedRoles, router]);

  if (loading || !user || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm text-slate-400 font-medium animate-pulse">
          Authenticating & verifiying permissions...
        </p>
      </div>
    );
  }

  if (!allowedRoles.includes(userProfile.role)) {
    return null;
  }

  return <>{children}</>;
}
