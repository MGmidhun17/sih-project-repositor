'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { UserProfile, SihDomain, Project, Review } from '@/types/database';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  Plus,
  BarChart3,
  Layers,
  GraduationCap,
  Briefcase,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Users,
  FolderGit2,
  Star,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const DEFAULT_DOMAINS: SihDomain[] = [
  {
    id: 'sih-1',
    name: 'Smart Automation & Transportation',
    description: 'Robotics, IoT traffic systems, autonomous vehicles, and supply chain automation.',
  },
  {
    id: 'sih-2',
    name: 'Blockchain & Cybersecurity',
    description: 'Decentralized identity, zero-knowledge proofs, smart contracts, and network defense.',
  },
  {
    id: 'sih-3',
    name: 'MedTech & Healthcare',
    description: 'Telemedicine, AI diagnostics, biometric sensors, and electronic health records.',
  },
  {
    id: 'sih-4',
    name: 'Agriculture, Food Tech & Rural Development',
    description: 'Smart irrigation, soil health sensors, crop disease detection, and yield prediction.',
  },
];

export default function AdminView() {
  const { user } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [domains, setDomains] = useState<SihDomain[]>(DEFAULT_DOMAINS);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'domains' | 'analytics'>('students');
  const [searchQuery, setSearchQuery] = useState('');

  // New domain form
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDesc, setNewDomainDesc] = useState('');

  // Action states
  const [actionLoadingUid, setActionLoadingUid] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [purging, setPurging] = useState(false);

  // Subscribe to Firestore collections in real-time
  useEffect(() => {
    setLoading(true);

    // 1. Users collection
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        });
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error fetching Firestore users:', err);
        setLoading(false);
      }
    );

    // 2. Projects collection
    const unsubProjects = onSnapshot(
      collection(db, 'projects'),
      (snap) => {
        const list: Project[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Project);
        });
        setProjects(list);
      },
      (err) => console.warn('Error fetching Firestore projects:', err)
    );

    // 3. Reviews collection
    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        const list: Review[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Review);
        });
        setReviews(list);
      },
      (err) => console.warn('Error fetching Firestore reviews:', err)
    );

    // 4. Domains collection
    const unsubDomains = onSnapshot(
      collection(db, 'sihDomains'),
      (snap) => {
        if (!snap.empty) {
          const list: SihDomain[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as SihDomain);
          });
          setDomains(list);
        }
      },
      (err) => console.warn('Error fetching Firestore domains:', err)
    );

    return () => {
      unsubUsers();
      unsubProjects();
      unsubReviews();
      unsubDomains();
    };
  }, []);

  // Compute stat card metrics
  const studentsList = users.filter((u) => u.role === 'student');
  const teachersList = users.filter((u) => u.role === 'teacher');

  const totalStudents = studentsList.length;
  const approvedTeachers = teachersList.filter((t) => t.approved).length;
  const pendingTeachers = teachersList.filter((t) => !t.approved).length;
  const totalProjects = projects.length;
  const totalReviews = reviews.length;

  // Counts helpers
  const getProjectCount = (studentUid: string) => {
    return projects.filter((p) => p.ownerId === studentUid).length;
  };

  const getReviewCount = (teacherUid: string) => {
    return reviews.filter((r) => r.teacherId === teacherUid).length;
  };

  // User search filtering
  const filterBySearch = (list: UserProfile[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  };

  const filteredStudents = filterBySearch(studentsList);
  const filteredTeachers = filterBySearch(teachersList);

  // Approve / Reject handler
  const handleToggleApproval = async (targetUser: UserProfile) => {
    if (!user) return;
    setActionLoadingUid(targetUser.uid);
    try {
      const idToken = await user.getIdToken();
      const endpoint = targetUser.approved
        ? `/api/admin/users/${targetUser.uid}/reject`
        : `/api/admin/users/${targetUser.uid}/approve`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update approval status.');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Failed to change approval status.');
    } finally {
      setActionLoadingUid(null);
    }
  };

  // Delete User Handler
  const handleDeleteConfirm = async () => {
    if (!user || !userToDelete) return;
    setDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${userToDelete.uid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user.');

      setUserToDelete(null);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Error deleting user.');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk Purge All Non-Admin Users
  const handlePurgeAllUsers = async () => {
    if (!user) return;
    setPurging(true);
    try {
      const idToken = await user.getIdToken();
      const targetUsers = users.filter((u) => u.role !== 'admin' && u.uid !== user.uid);

      for (const target of targetUsers) {
        await fetch(`/api/admin/users/${target.uid}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      }

      setShowPurgeModal(false);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'Error purging user accounts.');
    } finally {
      setPurging(false);
    }
  };

  // Add domain handler
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    const newId = `sih-${Date.now()}`;
    const created: SihDomain = {
      id: newId,
      name: newDomainName,
      description: newDomainDesc || 'Custom Smart India Hackathon domain',
    };

    try {
      await setDoc(doc(db, 'sihDomains', newId), created);
      setNewDomainName('');
      setNewDomainDesc('');
    } catch {
      // Fallback local update if Firestore security rules don't permit client write directly
      setDomains([...domains, created]);
      setNewDomainName('');
      setNewDomainDesc('');
    }
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sihDomains', id));
    } catch {
      setDomains(domains.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-950 border border-rose-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-1">
              <ShieldAlert className="w-4 h-4" /> System Administrator Control Center
            </div>
            <h2 className="text-2xl font-bold text-white">Platform Governance & Management</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Monitor student submissions, approve evaluator credentials, examine platform analytics, and manage user accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPurgeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
              title="Delete all registered test user accounts and submissions"
            >
              <Trash2 className="w-3.5 h-3.5" /> Purge All Test Accounts
            </button>
            <span className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> Admin Authorized
            </span>
          </div>
        </div>
      </div>

      {/* 5 Key Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Stat 1: Total Students */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Students</span>
            <GraduationCap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalStudents}</div>
          <p className="text-[10px] text-slate-500">Registered candidates</p>
        </div>

        {/* Stat 2: Approved Teachers */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Approved Teachers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{approvedTeachers}</div>
          <p className="text-[10px] text-slate-500">Active evaluators</p>
        </div>

        {/* Stat 3: Pending Teachers */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending Teachers</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingTeachers}</div>
          <p className="text-[10px] text-slate-500">Awaiting approval</p>
        </div>

        {/* Stat 4: Total Projects */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Projects</span>
            <FolderGit2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalProjects}</div>
          <p className="text-[10px] text-slate-500">Submitted entries</p>
        </div>

        {/* Stat 5: Total Reviews */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5 shadow-lg col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Reviews</span>
            <Star className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{totalReviews}</div>
          <p className="text-[10px] text-slate-500">Evaluations given</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Students ({studentsList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'teachers'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Teachers / Evaluators ({teachersList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'domains'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SIH Domains ({domains.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        {(activeTab === 'students' || activeTab === 'teachers') && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab} by name or email...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}
      </div>

      {/* Tab Content 1: Students Table */}
      {activeTab === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" /> Registered Students ({filteredStudents.length})
            </h3>
            <span className="text-[11px] text-slate-400">Click any student row to view full profile & projects</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <p className="text-xs">Fetching student directory...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {searchQuery ? 'No student found matching search filter.' : 'No student accounts registered yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Projects</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.uid}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/dashboard/admin/students/${s.uid}`)}
                    >
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name?.charAt(0) || 'S'}
                        </div>
                        <div className="group-hover:text-indigo-300 transition-colors">
                          <span className="font-bold underline-offset-2 group-hover:underline">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{s.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active Student
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                          {getProjectCount(s.uid)} projects
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/admin/students/${s.uid}`}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px]"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setUserToDelete(s)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Student Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Teachers Table */}
      {activeTab === 'teachers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" /> Registered Teachers ({filteredTeachers.length})
            </h3>
            <span className="text-[11px] text-slate-400">Click any teacher row to view full details & review log</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <p className="text-xs">Fetching teacher directory...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {searchQuery ? 'No teacher found matching search filter.' : 'No teacher accounts registered yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Teacher Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4">Reviews Given</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTeachers.map((t) => (
                    <tr
                      key={t.uid}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/dashboard/admin/teachers/${t.uid}`)}
                    >
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {t.name?.charAt(0) || 'T'}
                        </div>
                        <div className="group-hover:text-amber-300 transition-colors">
                          <span className="font-bold underline-offset-2 group-hover:underline">{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{t.email}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            t.approved
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {t.approved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {t.approved ? 'Approved' : 'Pending Approval'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                          {getReviewCount(t.uid)} reviews
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={actionLoadingUid === t.uid}
                            onClick={() => handleToggleApproval(t)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                              t.approved
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {actionLoadingUid === t.uid ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : t.approved ? (
                              <>
                                <UserX className="w-3 h-3" /> Reject
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" /> Approve
                              </>
                            )}
                          </button>

                          <Link
                            href={`/dashboard/admin/teachers/${t.uid}`}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px]"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => setUserToDelete(t)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Teacher Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: SIH Domains */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          {/* Add Domain Form */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-400" /> Add New SIH Problem Domain
            </h3>
            <form onSubmit={handleAddDomain} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Domain Title (e.g. Clean Energy)"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <input
                type="text"
                placeholder="Description / problem statements category"
                value={newDomainDesc}
                onChange={(e) => setNewDomainDesc(e.target.value)}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all"
              >
                Add Domain
              </button>
            </form>
          </div>

          {/* List Domains */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {domains.map((d) => (
              <div
                key={d.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start justify-between gap-3 shadow-lg"
              >
                <div>
                  <h4 className="font-bold text-sm text-white">{d.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{d.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteDomain(d.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-950 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 4: Analytics */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Domain Distribution</span>
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">{domains.length} Active Domains</div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div className="w-2/5 bg-indigo-500"></div>
              <div className="w-1/5 bg-emerald-500"></div>
              <div className="w-1/5 bg-amber-500"></div>
              <div className="w-1/5 bg-rose-500"></div>
            </div>
            <p className="text-[10px] text-slate-500">Configured SIH Problem Categories</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>User Base Split</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {totalStudents} Students / {teachersList.length} Teachers
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${
                    users.length > 0 ? (totalStudents / users.length) * 100 : 50
                  }%`,
                }}
                className="bg-indigo-500 h-full"
              ></div>
              <div
                style={{
                  width: `${
                    users.length > 0 ? (teachersList.length / users.length) * 100 : 50
                  }%`,
                }}
                className="bg-amber-500 h-full"
              ></div>
            </div>
            <p className="text-[10px] text-slate-500">Students (Indigo) vs Teachers (Amber)</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Teacher Approval Rate</span>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {teachersList.length > 0
                ? Math.round((approvedTeachers / teachersList.length) * 100)
                : 100}
              % Approved
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${
                    teachersList.length > 0
                      ? (approvedTeachers / teachersList.length) * 100
                      : 100
                  }%`,
                }}
                className="h-full bg-emerald-500"
              ></div>
            </div>
            <p className="text-[10px] text-slate-500">
              {approvedTeachers} approved out of {teachersList.length} teachers
            </p>
          </div>
        </div>
      )}

      {/* Global User Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Delete User Account?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email})?
                This action will delete their Firebase Authentication account and Firestore profile.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={deleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Purge Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Purge All Test Accounts?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete all student and teacher test accounts ({users.filter((u) => u.role !== 'admin').length} accounts)?
                This will delete their Firebase Authentication accounts, user profiles, submitted projects, and reviews. Your Admin account will be preserved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={purging}
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={purging}
                onClick={handlePurgeAllUsers}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20"
              >
                {purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{purging ? 'Purging All Accounts...' : 'Confirm Purge All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
