import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT_KEY === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // Fallback to default credentials if running in a supported server environment
  return initializeApp();
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());

export interface AdminAuthResult {
  authorized: boolean;
  status: number;
  message: string;
  callerUid?: string;
}

/**
 * Helper to verify server-side Next.js request carries a valid Firebase ID token
 * belonging to a user with role === 'admin'.
 */
export async function verifyAdminRequest(req: Request): Promise<AdminAuthResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, status: 401, message: 'Missing or malformed Authorization header' };
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return { authorized: false, status: 401, message: 'Missing ID token' };
  }

  try {
    const auth = adminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Check Firestore doc to verify user has role === 'admin'
    const db = adminDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { authorized: false, status: 403, message: 'Forbidden: Caller is not an administrator' };
    }

    return {
      authorized: true,
      status: 200,
      message: 'Authorized',
      callerUid: decodedToken.uid,
    };
  } catch (error: unknown) {
    const errObj = error as { message?: string };
    console.error('Error verifying admin token:', error);
    return { authorized: false, status: 401, message: `Token verification failed: ${errObj?.message || 'Invalid token'}` };
  }
}

