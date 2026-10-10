import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Project, Review } from '@/types/database';
import {
  FolderPlus,
  Github,
  Search,
  CheckCircle2,
  Clock,
  Star,
  ExternalLink,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  FileText,
  Loader2,
  ShieldAlert,
  Bot,
} from 'lucide-react';

// Mock sample projects for Phase 1 UI demonstration
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
    ownerId: 'demo-student-uid',
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
    ownerId: 'other-student-uid',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const MOCK_REVIEWS: Record<string, Review[]> = {
  'proj-1': [
    {
      id: 'rev-1',
      projectId: 'proj-1',
      teacherId: 'prof-smith',
      score: 92,
      comment: 'Excellent abstract and real-time computer vision implementation plan. Consider adding emergency vehicle override routing.',
      createdAt: new Date().toISOString(),
    },
  ],
};

interface DuplicationState {
  checked: boolean;
  isDuplicate: boolean;
  score: number;
  matchedTitle?: string;
  reason?: string;
}

export default function StudentView() {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>(MOCK_REVIEWS);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAbstract, setNewAbstract] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGithub, setNewGithub] = useState('');
  const [newPptText, setNewPptText] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newDomain, setNewDomain] = useState('Smart Automation & Transportation');

  // AI & Duplication State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [duplicationStatus, setDuplicationStatus] = useState<DuplicationState>({
    checked: false,
    isDuplicate: false,
    score: 0,
  });

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
          // Merge with initial demo projects if unique
          const combined = [...list];
          INITIAL_PROJECTS.forEach((initP) => {
            if (!combined.some((p) => p.id === initP.id)) combined.push(initP);
          });
          setProjects(combined);
        }
      },
      (err) => console.warn('Projects snapshot fallback:', err)
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        if (!snap.empty) {
          const map: Record<string, Review[]> = { ...MOCK_REVIEWS };
          snap.forEach((docSnap) => {
            const rev = { id: docSnap.id, ...docSnap.data() } as Review;
            if (!map[rev.projectId]) map[rev.projectId] = [];
            if (!map[rev.projectId].some((r) => r.id === rev.id)) {
              map[rev.projectId].push(rev);
            }
          });
          setReviewsMap(map);
        }
      },
      (err) => console.warn('Reviews snapshot fallback:', err)
    );

    return () => {
      unsubProjects();
      unsubReviews();
    };
  }, []);

  const myProjects = projects.filter(
    (p) => p.ownerId === userProfile?.uid || p.ownerId === 'demo-student-uid'
  );

  const filteredProjects = (activeTab === 'my' ? myProjects : projects).filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.techTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.sihDomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Call AI API to analyze GitHub, PPT, Title, and check duplication
  const handleRunAiAnalysis = async () => {
    if (!newTitle.trim() || !newAbstract.trim()) {
      setAiError('Please provide at least a Project Title and Abstract before running AI analysis.');
      return;
    }

    setAiError(null);
    setIsAiAnalyzing(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          abstract: newAbstract,
          description: newDescription,
          githubLink: newGithub,
          pptText: newPptText,
          existingProjects: projects,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI analysis failed.');
      }

      const { sihDomain, techTags, isDuplicate, similarityScore, matchedProjectTitle, duplicationReason } =
        data.result;

      if (sihDomain) setNewDomain(sihDomain);
      if (Array.isArray(techTags) && techTags.length > 0) {
        setNewTech(techTags.join(', '));
      }

      setDuplicationStatus({
        checked: true,
        isDuplicate: Boolean(isDuplicate),
        score: similarityScore || 0,
        matchedTitle: matchedProjectTitle,
        reason: duplicationReason,
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      console.error('AI Analysis error:', err);
      setAiError(errorObj.message || 'AI processing encountered an issue. Check your connection or inputs.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError(null);

    // Run duplication check if not yet checked
    if (!duplicationStatus.checked) {
      await handleRunAiAnalysis();
    }

    // BLOCK SUBMISSION IF DUPLICATE IS DETECTED
    if (duplicationStatus.isDuplicate) {
      setAiError(
        `DUPLICATE DETECTED: Submission blocked! Your project is ${duplicationStatus.score}% similar to "${duplicationStatus.matchedTitle}". Please alter your idea before posting.`
      );
      return;
    }

    const created: Project = {
      id: `proj-${Date.now()}`,
      title: newTitle,
      abstract: newAbstract,
      description: newDescription,
      githubLink: newGithub,
      fileUrls: newPptText ? [`PPT Summary: ${newPptText.slice(0, 100)}...`] : [],
      techTags: newTech.split(',').map((t) => t.trim()).filter(Boolean),
      sihDomain: newDomain,
      embedding: null,
      ownerId: userProfile?.uid || 'demo-student-uid',
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'projects', created.id), created);
    } catch (err) {
      console.warn('Firestore write warning (saving in-memory fallback):', err);
    }

    setProjects([created, ...projects]);
    setShowCreateModal(false);

    // Reset Form
    setNewTitle('');
    setNewAbstract('');
    setNewDescription('');
    setNewGithub('');
    setNewPptText('');
    setNewTech('');
    setDuplicationStatus({ checked: false, isDuplicate: false, score: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
              <GraduationCap className="w-4 h-4" /> Student Portal
            </div>
            <h2 className="text-2xl font-bold text-white">
              Welcome, {userProfile?.name || 'Student'} 👋
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Submit your hackathon and academic projects for evaluation, auto-tagging, SIH domain classification, and teacher review scores.
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setDuplicationStatus({ checked: false, isDuplicate: false, score: 0 });
              setAiError(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center gap-2 shrink-0 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Submit New Project</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'my'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>My Submissions</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/50">
              {myProjects.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Explore Repository (Read Only)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/50">
              {projects.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search tech, domain, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const reviews = reviewsMap[project.id] || MOCK_REVIEWS[project.id] || [];
          const hasReview = reviews.length > 0;
          const isMine = project.ownerId === userProfile?.uid || project.ownerId === 'demo-student-uid';

          return (
            <div
              key={project.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                      {project.sihDomain}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300">
                      {project.title}
                    </h3>
                  </div>
                  {isMine && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Your Project
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                  {project.abstract}
                </p>

                {/* Tech Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.techTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 font-medium border border-slate-700/50"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reviews & Link Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                {hasReview ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Evaluated ({reviews[0].score}/100)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending Teacher Review</span>
                  </div>
                )}

                {project.githubLink && (
                  <a
                    href={project.githubLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-[11px]"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>Repository</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Review Comment Box if present */}
              {hasReview && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      Teacher Review Score:
                    </span>
                    <span className="font-bold text-emerald-400">{reviews[0].score}/100</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    &quot;{reviews[0].comment}&quot;
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> Gemini AI Powered Submission
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Submit New Project
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {aiError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            {/* DUPLICATE DETECTED WARNING BANNER */}
            {duplicationStatus.checked && duplicationStatus.isDuplicate && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 space-y-2 shadow-lg">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-5 h-5 shrink-0 animate-bounce" />
                  <span>Duplicate Project Detected ({duplicationStatus.score}% Match)</span>
                </div>
                <p className="text-xs text-rose-300 leading-relaxed">
                  {duplicationStatus.reason ||
                    `This submission closely matches existing project "${duplicationStatus.matchedTitle}".`}
                </p>
                <div className="p-2 rounded bg-slate-950 text-[11px] font-semibold text-rose-400 border border-rose-500/20">
                  🚫 POSTING BLOCKED: Submissions matching existing projects are prohibited by SIH duplication rules.
                </div>
              </div>
            )}

            {/* ORIGINALITY VERIFIED BANNER */}
            {duplicationStatus.checked && !duplicationStatus.isDuplicate && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Originality Verified ({duplicationStatus.score}% Similarity)!</strong> AI auto-tagged tech stack and SIH domain.
                </span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Agriculture Soil Sensor Network"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setDuplicationStatus({ checked: false, isDuplicate: false, score: 0 });
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Abstract / Short Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief 1-2 sentence overview"
                  value={newAbstract}
                  onChange={(e) => {
                    setNewAbstract(e.target.value);
                    setDuplicationStatus({ checked: false, isDuplicate: false, score: 0 });
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Detailed Description / Methodology
                </label>
                <textarea
                  rows={3}
                  placeholder="Problem statement, system architecture, dataset, algorithms..."
                  value={newDescription}
                  onChange={(e) => {
                    setNewDescription(e.target.value);
                    setDuplicationStatus({ checked: false, isDuplicate: false, score: 0 });
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <Github className="w-3.5 h-3.5 text-slate-400" /> GitHub Repo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/user/repo"
                    value={newGithub}
                    onChange={(e) => setNewGithub(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-400" /> PPT / Presentation Details
                  </label>
                  <input
                    type="text"
                    placeholder="Paste slide summary or link"
                    value={newPptText}
                    onChange={(e) => setNewPptText(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* AI Auto-Analysis Button */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-xs text-indigo-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Auto-Classify & Check Duplication
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Extract tech tags, infer SIH domain, and check duplication against existing projects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={isAiAnalyzing || !newTitle || !newAbstract}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 flex items-center gap-1.5 shrink-0 disabled:opacity-50 transition-all"
                >
                  {isAiAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Analyze</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tech Stack (Auto-Tagged by AI)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Python, YOLOv8, React"
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    SIH Domain (Auto-Classified by AI)
                  </label>
                  <select
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option>Smart Automation & Transportation</option>
                    <option>Agriculture, Food Tech & Rural Development</option>
                    <option>Blockchain & Cybersecurity</option>
                    <option>MedTech & Healthcare</option>
                    <option>Clean & Green Technology</option>
                    <option>Smart Education & E-Learning</option>
                    <option>AI / ML & Data Science</option>
                    <option>IoT & Embedded Systems</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={duplicationStatus.isDuplicate || isAiAnalyzing}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                    duplicationStatus.isDuplicate
                      ? 'bg-rose-900/60 border border-rose-500/40 text-rose-300 cursor-not-allowed opacity-60'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                  }`}
                  title={
                    duplicationStatus.isDuplicate
                      ? 'Cannot submit: Duplicate project detected!'
                      : 'Submit Project'
                  }
                >
                  {duplicationStatus.isDuplicate ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Blocked (Duplicate Detected)</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
