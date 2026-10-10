'use client';

export const dynamic = 'force-dynamic';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import TeacherView from '@/components/dashboard/TeacherView';

export default function TeacherDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin']}>
      <TeacherView />
    </ProtectedRoute>
  );
}
