import { NextResponse } from 'next/server';
import { adminDb, verifyAdminRequest } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(
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

  try {
    const db = adminDb();
    const userRef = db.collection('users').doc(targetUid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await userRef.update({ approved: true });

    return NextResponse.json({
      success: true,
      message: `User ${targetUid} approved successfully.`,
      approved: true,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Error approving user:', err);
    return NextResponse.json({ error: error?.message || 'Failed to approve user' }, { status: 500 });
  }
}
