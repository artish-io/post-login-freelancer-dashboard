import { NextResponse } from 'next/server';
import { readAllProjects } from '@/lib/projects-utils';

export async function GET() {
  try {
    const projects = await readAllProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}
