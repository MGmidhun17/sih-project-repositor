'use client';

export const dynamic = 'force-dynamic';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminView from '@/components/dashboard/AdminView';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminView />
    </ProtectedRoute>
  );
}
