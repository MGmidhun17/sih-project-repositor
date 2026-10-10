import { NextResponse } from 'next/server';
import { adminAuth, adminDb, verifyAdminRequest } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ uid: string }> }
) {
  const authRes = await verifyAdminRequest(req);
  if (!authRes.authorized) {
    return NextResponse.json({ error: authRes.message }, { status: authRes.status });
  }

  const { uid: targetUid } = await context.params;

  if (!targetUid) {
    return NextResponse.json({ error: 'Missing target user ID' }, { status: 400 });
  }

  if (targetUid === authRes.callerUid) {
    return NextResponse.json({ error: 'Administrator cannot delete their own account' }, { status: 400 });
  }

  try {
    // 1. Delete from Firebase Auth
    try {
      await adminAuth().deleteUser(targetUid);
    } catch (authErr: unknown) {
      const errObj = authErr as { code?: string };
      if (errObj?.code !== 'auth/user-not-found') {
        console.warn('Firebase Auth deletion warning:', authErr);
      }
    }

    // 2. Delete Firestore User Document
    const db = adminDb();
    await db.collection('users').doc(targetUid).delete();

    // 3. Optional cleanup: Delete projects created by this user
    const projectsQuery = await db.collection('projects').where('ownerId', '==', targetUid).get();
    const batch = db.batch();
    projectsQuery.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // 4. Optional cleanup: Delete reviews written by this teacher
    const reviewsQuery = await db.collection('reviews').where('teacherId', '==', targetUid).get();
    reviewsQuery.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `User ${targetUid} and associated data removed successfully.`,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Error deleting user:', err);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
