import { NextRequest, NextResponse } from 'next/server';
import { readProject, readAllProjects } from '@/lib/projects-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateFreelancerProjectAccess } from '@/lib/freelancer-access-control';

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

    // Validate session and access control
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load all projects to validate access
    const allProjects = await readAllProjects();

    // Validate that the user has access to this project
    const hasAccess = validateFreelancerProjectAccess(
      projectId,
      allProjects,
      session.user as any
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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