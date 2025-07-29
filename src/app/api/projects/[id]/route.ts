import { NextRequest, NextResponse } from 'next/server';
import { readProject } from '@/lib/projects-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await readProject(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error reading project data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function GET_ALL_PROJECTS() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'projects.json');
    const file = await readFile(filePath, 'utf-8');
    const projects = JSON.parse(file);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error reading project data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}