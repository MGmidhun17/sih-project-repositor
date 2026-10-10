'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, Project } from '@/types/database';
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  FolderGit2,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Loader2,
  FileCode2,
} from 'lucide-react';

interface StudentDetailPageProps {
  params: Promise<{ uid: string }>;
}

export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const resolvedParams = use(params);
  const studentUid = resolvedParams.uid;
  const { user } = useAuth();
  const router = useRouter();

  const [student, setStudent] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchStudentData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch User Profile
        const userDocRef = doc(db, 'users', studentUid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          setError('Student account not found.');
          setLoading(false);
          return;
        }

        const data = userSnap.data() as UserProfile;
        if (data.role !== 'student' && data.role !== 'admin') {
          // Allow viewing admin or student, but notify if role isn't student
        }
        setStudent(data);

        // Fetch Student Projects
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where('ownerId', '==', studentUid));
        const projSnap = await getDocs(q);
        const projList: Project[] = [];
        projSnap.forEach((docSnap) => {
          projList.push({ id: docSnap.id, ...docSnap.data() } as Project);
        });
        setProjects(projList);
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        console.error('Error loading student profile:', err);
        setError(errorObj.message || 'Failed to load student details.');
      } finally {
        setLoading(false);
      }
    }

    if (studentUid) {
      fetchStudentData();
    }
  }, [studentUid]);

  const handleDeleteUser = async () => {
    if (!user || !student) return;
    setDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${student.uid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete student.');
      }

      router.push('/dashboard/admin');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'An error occurred while deleting student.');
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

          {student && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3.5 py-2 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" /> Delete Student Account
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <p className="text-xs">Loading student record...</p>
          </div>
        ) : error || !student ? (
          <div className="p-8 bg-rose-950/40 border border-rose-500/20 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Student Not Found</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">{error || 'Requested user record does not exist.'}</p>
          </div>
        ) : (
          <>
            {/* Student Header Card */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start md:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-2xl">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-bold text-white">{student.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {student.role}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 ${
                        student.approved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {student.approved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {student.approved ? 'Active Account' : 'Pending Verification'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{student.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Joined {new Date(student.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-4 min-w-[200px]">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Submitted Projects</p>
                  <p className="text-2xl font-bold text-white mt-0.5">{projects.length}</p>
                </div>
                <FolderGit2 className="w-8 h-8 text-indigo-400/60 ml-auto" />
              </div>
            </div>

            {/* Projects List Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-indigo-400" /> Project Submissions ({projects.length})
                </h3>
              </div>

              {projects.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/60">
                  This student has not submitted any projects yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-white line-clamp-1">{proj.title}</h4>
                          {proj.sihDomain && (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium shrink-0">
                              {proj.sihDomain}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{proj.abstract || proj.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                        <span>Submitted {new Date(proj.createdAt).toLocaleDateString()}</span>
                        {proj.githubLink && (
                          <a
                            href={proj.githubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 text-[11px]"
                          >
                            Repository <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && student && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Delete Student Account?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete <strong className="text-white">{student.name}</strong> ({student.email})?
                  This action will delete their authentication account, profile, and submitted projects.
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
