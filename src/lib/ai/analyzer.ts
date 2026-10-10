import { GoogleGenAI } from '@google/genai';
import { Project } from '@/types/database';

export interface AIAnalysisResult {
  sihDomain: string;
  techTags: string[];
  suggestedAbstract?: string;
  isDuplicate: boolean;
  similarityScore: number; // 0 to 100
  matchedProjectTitle?: string;
  duplicationReason?: string;
}

const SIH_DOMAINS = [
  'Smart Automation & Transportation',
  'Agriculture, Food Tech & Rural Development',
  'Blockchain & Cybersecurity',
  'MedTech & Healthcare',
  'Clean & Green Technology',
  'Smart Education & E-Learning',
  'AI / ML & Data Science',
  'IoT & Embedded Systems',
];

/**
 * Text similarity calculator using Jaccard index + N-gram keyword overlap
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const jaccard = (intersection.size / union.size) * 100;

  // Title exact / substring match boost
  const t1 = text1.toLowerCase().trim();
  const t2 = text2.toLowerCase().trim();
  let boost = 0;
  if (t1 === t2) boost = 50;
  else if (t1.includes(t2) || t2.includes(t1)) boost = 30;

  return Math.min(100, Math.round(jaccard * 1.5 + boost));
}

/**
 * Perform Duplication Check against an array of existing projects
 */
export function checkProjectDuplication(
  candidate: { title: string; abstract: string; description?: string; githubLink?: string },
  existingProjects: Project[]
): { isDuplicate: boolean; similarityScore: number; matchedProjectTitle?: string; reason?: string } {
  let maxScore = 0;
  let matchedTitle = '';
  let reason = '';

  const candidateCombined = `${candidate.title} ${candidate.abstract} ${candidate.description || ''}`;

  for (const existing of existingProjects) {
    // Check GitHub link match (exact duplicate repository submission)
    if (
      candidate.githubLink &&
      existing.githubLink &&
      candidate.githubLink.trim().toLowerCase() === existing.githubLink.trim().toLowerCase()
    ) {
      return {
        isDuplicate: true,
        similarityScore: 100,
        matchedProjectTitle: existing.title,
        reason: `Exact GitHub repository link match detected with project "${existing.title}".`,
      };
    }

    const existingCombined = `${existing.title} ${existing.abstract} ${existing.description || ''}`;
    const score = calculateTextSimilarity(candidateCombined, existingCombined);

    if (score > maxScore) {
      maxScore = score;
      matchedTitle = existing.title;
    }
  }

  // Threshold for duplicate detection (>= 60% similarity is considered a duplicate)
  const isDuplicate = maxScore >= 60;
  if (isDuplicate) {
    reason = `${maxScore}% content similarity match detected with existing project "${matchedTitle}". Submissions with duplicate content are not allowed.`;
  }

  return {
    isDuplicate,
    similarityScore: maxScore,
    matchedProjectTitle: matchedTitle ? matchedTitle : undefined,
    reason: isDuplicate ? reason : undefined,
  };
}

/**
 * Main Gemini AI Domain Classification & Auto-Tagging Function
 */
export async function analyzeProjectWithAI(
  title: string,
  abstract: string,
  description: string = '',
  githubLink: string = '',
  pptText: string = '',
  existingProjects: Project[] = []
): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // Run duplication check first
  const dupCheck = checkProjectDuplication(
    { title, abstract, description, githubLink },
    existingProjects
  );

  let sihDomain = 'Smart Automation & Transportation';
  let techTags: string[] = [];
  const suggestedAbstract = abstract;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an AI classifier for the Smart India Hackathon (SIH) project repository.
Analyze the following project submission details:

Title: "${title}"
Abstract: "${abstract}"
Description: "${description}"
GitHub Repo: "${githubLink}"
PPT / Presentation Content: "${pptText}"

Allowed SIH Domains:
${SIH_DOMAINS.map((d) => `- "${d}"`).join('\n')}

Perform 2 tasks:
1. Select the single best matching SIH Domain from the allowed list above.
2. Extract 4 to 6 relevant technical stack tags (e.g. Python, React, PyTorch, YOLOv8, Solidity, OpenCV, MQTT, etc.).

Return ONLY a raw valid JSON object in this format without markdown wrappers:
{
  "sihDomain": "exact matching domain string",
  "techTags": ["Tag1", "Tag2", "Tag3", "Tag4"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const rawText = response.text || '';
      const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      if (parsed.sihDomain && SIH_DOMAINS.includes(parsed.sihDomain)) {
        sihDomain = parsed.sihDomain;
      }
      if (Array.isArray(parsed.techTags) && parsed.techTags.length > 0) {
        techTags = parsed.techTags.map((t: string) => t.trim());
      }
    } catch (e) {
      console.warn('Gemini API call fallback to heuristic classification:', e);
      sihDomain = inferDomainHeuristically(title, abstract, description);
      techTags = inferTechTagsHeuristically(title, abstract, description, githubLink, pptText);
    }
  } else {
    // Intelligent heuristic fallback if GEMINI_API_KEY is not configured
    sihDomain = inferDomainHeuristically(title, abstract, description);
    techTags = inferTechTagsHeuristically(title, abstract, description, githubLink, pptText);
  }

  return {
    sihDomain,
    techTags: techTags.length > 0 ? techTags : ['Next.js', 'React', 'Node.js'],
    suggestedAbstract,
    isDuplicate: dupCheck.isDuplicate,
    similarityScore: dupCheck.similarityScore,
    matchedProjectTitle: dupCheck.matchedProjectTitle,
    duplicationReason: dupCheck.reason,
  };
}

function inferDomainHeuristically(title: string, abstract: string, description: string): string {
  const combined = `${title} ${abstract} ${description}`.toLowerCase();

  if (combined.includes('traffic') || combined.includes('vehicle') || combined.includes('transport') || combined.includes('drive') || combined.includes('auto')) {
    return 'Smart Automation & Transportation';
  }
  if (combined.includes('block') || combined.includes('chain') || combined.includes('crypto') || combined.includes('security') || combined.includes('auth')) {
    return 'Blockchain & Cybersecurity';
  }
  if (combined.includes('crop') || combined.includes('farm') || combined.includes('agri') || combined.includes('soil') || combined.includes('rural')) {
    return 'Agriculture, Food Tech & Rural Development';
  }
  if (combined.includes('health') || combined.includes('patient') || combined.includes('hospital') || combined.includes('icu') || combined.includes('doctor') || combined.includes('medical')) {
    return 'MedTech & Healthcare';
  }
  if (combined.includes('solar') || combined.includes('energy') || combined.includes('waste') || combined.includes('green') || combined.includes('eco')) {
    return 'Clean & Green Technology';
  }
  if (combined.includes('learn') || combined.includes('school') || combined.includes('student') || combined.includes('course') || combined.includes('education')) {
    return 'Smart Education & E-Learning';
  }
  return 'AI / ML & Data Science';
}

function inferTechTagsHeuristically(title: string, abstract: string, description: string, github: string, ppt: string): string[] {
  const combined = `${title} ${abstract} ${description} ${github} ${ppt}`.toLowerCase();
  const tags = new Set<string>();

  if (combined.includes('python')) tags.add('Python');
  if (combined.includes('react')) tags.add('React');
  if (combined.includes('next') || combined.includes('nextjs')) tags.add('Next.js');
  if (combined.includes('yolo') || combined.includes('vision') || combined.includes('opencv')) tags.add('YOLOv8');
  if (combined.includes('node') || combined.includes('express')) tags.add('Node.js');
  if (combined.includes('solidity') || combined.includes('ethereum') || combined.includes('polygon')) tags.add('Solidity');
  if (combined.includes('fastapi')) tags.add('FastAPI');
  if (combined.includes('firebase')) tags.add('Firebase');
  if (combined.includes('mqtt') || combined.includes('iot') || combined.includes('esp32')) tags.add('IoT / MQTT');

  if (tags.size === 0) {
    tags.add('FullStack');
    tags.add('Web Dev');
    tags.add('AI Integration');
  }

  return Array.from(tags);
}
