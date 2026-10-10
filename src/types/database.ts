export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  approved: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  abstract: string;
  description: string;
  githubLink: string;
  fileUrls: string[];
  techTags: string[];
  sihDomain: string;
  embedding: number[] | null;
  ownerId: string;
  createdAt: string;
}

export interface Review {
  id: string;
  projectId: string;
  teacherId: string;
  comment: string;
  score: number; // e.g., 1 to 100 or 1 to 10
  createdAt: string;
}

export interface SihDomain {
  id: string;
  name: string;
  description: string;
}
