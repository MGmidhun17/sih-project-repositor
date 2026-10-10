import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Project, Review } from '@/types/database';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Github,
  Star,
  MessageSquare,
  AlertTriangle,
  Search,
} from 'lucide-react';

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    title: 'AI Smart Traffic Management for Smart Cities',
    abstract: 'An automated computer-vision based dynamic traffic light control system.',
    description: 'Uses YOLOv8 object detection algorithms to process CCTV feeds from intersections and adjust traffic signal timings dynamically to eliminate gridlocks.',
    githubLink: 'https://github.com/example/smart-traffic-sih',
    fileUrls: ['https://example.com/project-presentation.pdf'],
    techTags: ['Python', 'YOLOv8', 'OpenCV', 'Next.js', 'FastAPI'],
    sihDomain: 'Smart Automation & Transportation',
    embedding: null,
    ownerId: 'student-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    title: 'Blockchain Based Academic Verification System',
    abstract: 'Decentralized verification platform for university degree certificates.',
    description: 'Prevents credential forgery by issuing cryptographic proof of academic certificates on Polygon testnet with instant QR code scanning.',
    githubLink: 'https://github.com/example/degree-chain',
    fileUrls: [],
    techTags: ['Solidity', 'Ethereum', 'React', 'Ethers.js'],
    sihDomain: 'Blockchain & Cybersecurity',
    embedding: null,
    ownerId: 'student-2',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'proj-3',
    title: 'IoT Tele-ICU Patient Monitoring Dashboard',
    abstract: 'Real-time physiological telemetry stream for rural clinic intensive care units.',
    description: 'Connects vital sensors via MQTT protocol to an alert dashboard with automated anomaly detection for arrhythmia and hypoxia.',
    githubLink: 'https://github.com/example/tele-icu',
    fileUrls: [],
    techTags: ['Node.js', 'MQTT', 'InfluxDB', 'Grafana', 'ESP32'],
    sihDomain: 'MedTech & Healthcare',
    embedding: null,
    ownerId: 'student-3',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    projectId: 'proj-1',
    teacherId: 'teacher-demo-uid',
    score: 92,
    comment: 'Great presentation. Computer vision architecture is well documented.',
    createdAt: new Date().toISOString(),
  },
];

export default function TeacherView() {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [score, setScore] = useState<number>(85);
  const [comment, setComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'pending' | 'reviewed' | 'all'>('pending');

  const isApproved = userProfile?.approved ?? false;

  // Real-time Firestore sync
  useEffect(() => {
    const unsubProjects = onSnapshot(
      collection(db, 'projects'),
      (snap) => {
        if (!snap.empty) {
          const list: Project[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Project);
          });
          const combined = [...list];
          INITIAL_PROJECTS.forEach((initP) => {
            if (!combined.some((p) => p.id === initP.id)) combined.push(initP);
          });
          setProjects(combined);
        }
      },
      (err) => console.warn('Projects snapshot error:', err)
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        if (!snap.empty) {
          const list: Review[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Review);
          });
          const combined = [...list];
          INITIAL_REVIEWS.forEach((initR) => {
            if (!combined.some((r) => r.id === initR.id)) combined.push(initR);
          });
          setReviews(combined);
        }
      },
      (err) => console.warn('Reviews snapshot error:', err)
    );

    return () => {
      unsubProjects();
      unsubReviews();
    };
  }, []);

  const getReviewForProject = (projectId: string) => {
    return reviews.find((r) => r.projectId === projectId);
  };

  const filteredProjects = projects.filter((p) => {
    const r = getReviewForProject(p.id);
    if (filterTab === 'pending' && r) return false;
    if (filterTab === 'reviewed' && !r) return false;
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sihDomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.techTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !isApproved) return;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      projectId: selectedProject.id,
      teacherId: userProfile?.uid || 'teacher-demo-uid',
      score: Number(score),
      comment: comment,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'reviews', newReview.id), newReview);
    } catch (err) {
      console.warn('Firestore review write warning (saving in-memory fallback):', err);
    }

    setReviews([...reviews.filter((r) => r.projectId !== selectedProject.id), newReview]);
    setSelectedProject(null);
    setComment('');
    setScore(85);
  };

  return (
    <div className="space-y-6">
      {/* Pending Approval Alert Banner */}
      {!isApproved && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
              Account Approval Pending
            </h4>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Your teacher profile is currently awaiting Administrator approval. You can browse all submitted projects in read-only mode, but review submission functionality will remain restricted until approved by an Admin.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
              <Briefcase className="w-4 h-4" /> Evaluator Portal
            </div>
            <h2 className="text-2xl font-bold text-white">
              Welcome, {userProfile?.name || 'Professor'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluate hackathon submissions, assign marks, and provide qualitative feedback for student projects.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
            <div className="text-center px-3 border-r border-slate-800">
              <div className="font-bold text-indigo-400 text-base">{projects.length}</div>
              <div className="text-[10px] text-slate-500">Total Projects</div>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <div className="font-bold text-amber-400 text-base">
                {projects.filter((p) => !getReviewForProject(p.id)).length}
              </div>
              <div className="text-[10px] text-slate-500">Pending Review</div>
            </div>
            <div className="text-center px-3">
              <div className="font-bold text-emerald-400 text-base">{reviews.length}</div>
              <div className="text-[10px] text-slate-500">Evaluated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              filterTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Evaluation</span>
          </button>
          <button
            onClick={() => setFilterTab('reviewed')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              filterTab === 'reviewed'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reviewed History</span>
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Submissions
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const review = getReviewForProject(project.id);
          return (
            <div
              key={project.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {project.sihDomain}
                  </span>
                  {review ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Reviewed ({review.score}/100)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Awaiting Review
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mt-2">{project.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{project.abstract}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.techTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-medium border border-slate-700/50"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action area */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {project.githubLink && (
                  <a
                    href={project.githubLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-xs"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>View Repository</span>
                  </a>
                )}

                <button
                  onClick={() => setSelectedProject(project)}
                  disabled={!isApproved}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isApproved
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                  title={!isApproved ? 'Requires Admin Approval' : 'Add or Edit Review'}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{review ? 'Edit Review' : 'Add Review'}</span>
                </button>
              </div>

              {review && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Your Evaluation
                    </span>
                    <span className="font-bold text-emerald-400">{review.score}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">&quot;{review.comment}&quot;</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Evaluation Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400">
                  Project Review
                </span>
                <h3 className="text-base font-bold text-white line-clamp-1">
                  {selectedProject.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Evaluation Score (0 - 100): <strong className="text-indigo-400">{score}</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Feedback & Review Comments *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide constructive feedback on innovation, architecture, code quality, and SIH domain relevance..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/25"
                >
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
