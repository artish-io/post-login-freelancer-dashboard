import { NextResponse } from 'next/server';
import { readAllProjects } from '@/lib/projects-utils';

export async function GET() {
  try {
    const projects = await readAllProjects();

    return NextResponse.json(projects, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error reading projects from hierarchical structure:', error);
    return NextResponse.json(
      { error: 'Failed to load projects' },
      { status: 500 }
    );
  }
}
