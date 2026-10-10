'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase/client';
import { UserProfile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  signUpWithEmail: (email: string, pass: string, name: string, role: UserRole) => Promise<UserProfile>;
  loginWithGoogle: (requestedRole?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  devSetRole: (role: UserRole, approved?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure user profile document exists in Firestore
  const ensureUserProfile = async (
    firebaseUser: User,
    requestedRole: UserRole = 'student',
    nameOverride?: string,
    forceCreate: boolean = false
  ): Promise<UserProfile> => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists() || forceCreate) {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: nameOverride || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: requestedRole,
          // Teacher accounts require admin approval (approved: false), while student/admin default to true
          approved: requestedRole === 'teacher' ? false : true,
          createdAt: userSnap.exists() ? ((userSnap.data() as UserProfile).createdAt || new Date().toISOString()) : new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
        return newProfile;
      } else {
        const existingProfile = userSnap.data() as UserProfile;
        setUserProfile(existingProfile);
        return existingProfile;
      }
    } catch (err) {
      console.warn('Firestore profile sync note (likely missing Firebase credentials or offline):', err);
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        name: nameOverride || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        role: requestedRole,
        approved: requestedRole === 'teacher' ? false : true,
        createdAt: new Date().toISOString(),
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Subscribe to real-time updates for user profile
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          unsubscribeFirestore = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                setUserProfile(snap.data() as UserProfile);
              }
            },
            (err) => {
              console.warn('Snapshot error:', err);
            }
          );
        } catch {
          // Ignore
        }
      } else {
        setUserProfile(null);
        if (unsubscribeFirestore) unsubscribeFirestore();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const profile = await ensureUserProfile(res.user);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, role: UserRole): Promise<UserProfile> => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await firebaseUpdateProfile(res.user, { displayName: name });
        const profile = await ensureUserProfile(res.user, role, name, true);
        return profile;
      }
      throw new Error('User creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (requestedRole: UserRole = 'student'): Promise<UserProfile> => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        const profile = await ensureUserProfile(res.user, requestedRole, undefined, false);
        return profile;
      }
      throw new Error('Google Sign In failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Developer utility to manually change role & approval status (e.g. for testing Admin functionality)
  const devSetRole = async (role: UserRole, approved?: boolean) => {
    const isApproved = approved !== undefined ? approved : (role === 'teacher' ? false : true);
    const activeUid = user?.uid || `demo-${role}-${Date.now()}`;
    const activeEmail = user?.email || `demo.${role}@sih.edu`;
    const activeName = userProfile?.name || user?.displayName || `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`;

    const updated: UserProfile = {
      uid: activeUid,
      name: activeName,
      email: activeEmail,
      role,
      approved: isApproved,
      createdAt: userProfile?.createdAt || new Date().toISOString(),
    };

    if (!user) {
      const dummyUser = {
        uid: activeUid,
        email: activeEmail,
        displayName: activeName,
      } as User;
      setUser(dummyUser);
    }

    setUserProfile(updated);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updated, { merge: true });
      } catch (e) {
        console.warn('Dev role set in-memory (Firestore not configured or permission denied):', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout,
        devSetRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
