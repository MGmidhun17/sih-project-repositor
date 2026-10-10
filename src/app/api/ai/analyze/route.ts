import { NextResponse } from 'next/server';
import { analyzeProjectWithAI } from '@/lib/ai/analyzer';
import { Project } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      abstract,
      description = '',
      githubLink = '',
      pptText = '',
      existingProjects = [],
    } = body as {
      title: string;
      abstract: string;
      description?: string;
      githubLink?: string;
      pptText?: string;
      existingProjects?: Project[];
    };

    if (!title || !abstract) {
      return NextResponse.json(
        { error: 'Project Title and Abstract are required for AI analysis.' },
        { status: 400 }
      );
    }

    const result = await analyzeProjectWithAI(
      title,
      abstract,
      description,
      githubLink,
      pptText,
      existingProjects
    );

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error('API AI analysis error:', err);
    return NextResponse.json(
      { error: errorObj.message || 'AI analysis failed' },
      { status: 500 }
    );
  }
}
