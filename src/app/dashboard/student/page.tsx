'use client';

export const dynamic = 'force-dynamic';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import StudentView from '@/components/dashboard/StudentView';

export default function StudentDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['student', 'admin']}>
      <StudentView />
    </ProtectedRoute>
  );
}
