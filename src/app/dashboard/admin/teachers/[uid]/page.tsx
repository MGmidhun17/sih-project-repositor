'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, Review } from '@/types/database';
import {
  ArrowLeft,
  Briefcase,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  Star,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
  Loader2,
  MessageSquareQuote,
} from 'lucide-react';

interface TeacherDetailPageProps {
  params: Promise<{ uid: string }>;
}

interface ReviewWithProject extends Review {
  projectTitle?: string;
}

export default function TeacherDetailPage({ params }: TeacherDetailPageProps) {
  const resolvedParams = use(params);
  const teacherUid = resolvedParams.uid;
  const { user } = useAuth();
  const router = useRouter();

  const [teacher, setTeacher] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTeacherData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch User Profile
      const userDocRef = doc(db, 'users', teacherUid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        setError('Teacher account not found.');
        setLoading(false);
        return;
      }

      const data = userSnap.data() as UserProfile;
      setTeacher(data);

      // Fetch Reviews written by this teacher
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('teacherId', '==', teacherUid));
      const reviewSnap = await getDocs(q);
      const reviewList: ReviewWithProject[] = [];

      for (const docSnap of reviewSnap.docs) {
        const revData = { id: docSnap.id, ...docSnap.data() } as Review;
        let pTitle = 'Project ' + revData.projectId;
        try {
          if (revData.projectId) {
            const pSnap = await getDoc(doc(db, 'projects', revData.projectId));
            if (pSnap.exists()) {
              pTitle = pSnap.data().title || pTitle;
            }
          }
        } catch (e) {
          console.warn('Could not fetch project name for review:', e);
        }
        reviewList.push({ ...revData, projectTitle: pTitle });
      }

      setReviews(reviewList);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      console.error('Error loading teacher profile:', err);
      setError(errorObj.message || 'Failed to load teacher details.');
    } finally {
      setLoading(false);
    }
  }, [teacherUid]);

  useEffect(() => {
    if (teacherUid) {
      fetchTeacherData();
    }
  }, [teacherUid, fetchTeacherData]);

  const handleToggleApproval = async () => {
    if (!user || !teacher) return;
    setActionLoading(true);
    try {
      const idToken = await user.getIdToken();
      const endpoint = teacher.approved
        ? `/api/admin/users/${teacher.uid}/reject`
        : `/api/admin/users/${teacher.uid}/approve`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update approval status');

      setTeacher({ ...teacher, approved: !teacher.approved });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Error updating approval status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user || !teacher) return;
    setDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${teacher.uid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete teacher.');
      }

      router.push('/dashboard/admin');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'An error occurred while deleting teacher.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>

          {teacher && (
            <div className="flex items-center gap-3">
              <button
                disabled={actionLoading}
                onClick={handleToggleApproval}
                className={`inline-flex items-center gap-2 text-xs font-semibold border px-3.5 py-2 rounded-xl transition-all ${
                  teacher.approved
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : teacher.approved ? (
                  <UserX className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                <span>{teacher.approved ? 'Revoke Approval' : 'Grant Approval'}</span>
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3.5 py-2 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" /> Delete Teacher
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <p className="text-xs">Loading teacher record...</p>
          </div>
        ) : error || !teacher ? (
          <div className="p-8 bg-rose-950/40 border border-rose-500/20 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Teacher Not Found</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">{error || 'Requested user record does not exist.'}</p>
          </div>
        ) : (
          <>
            {/* Teacher Header Card */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start md:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-2xl">
                  <Briefcase className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-bold text-white">{teacher.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Evaluator ({teacher.role})
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 ${
                        teacher.approved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {teacher.approved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {teacher.approved ? 'Approved Evaluator' : 'Approval Pending'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{teacher.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Registered {new Date(teacher.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-4 min-w-[200px]">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium font-sans">Reviews Submitted</p>
                  <p className="text-2xl font-bold text-white mt-0.5">{reviews.length}</p>
                </div>
                <Star className="w-8 h-8 text-amber-400/60 ml-auto" />
              </div>
            </div>

            {/* Review History Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-amber-400" /> Evaluation History ({reviews.length})
                </h3>
              </div>

              {reviews.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/60">
                  This teacher has not conducted any evaluations or submitted reviews yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs text-white">{rev.projectTitle}</h4>
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <Star className="w-3 h-3 fill-amber-400" /> {rev.score}/100
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 italic bg-slate-900/60 p-3 rounded-lg border border-slate-800/40">
                        &quot;{rev.comment}&quot;
                      </p>
                      <p className="text-[10px] text-slate-500 text-right">
                        Evaluated on {new Date(rev.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && teacher && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Delete Teacher Account?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete <strong className="text-white">{teacher.name}</strong> ({teacher.email})?
                  This will remove their authentication account, profile, and evaluation permissions.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  disabled={deleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
