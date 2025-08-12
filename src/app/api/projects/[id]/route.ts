import { NextRequest, NextResponse } from 'next/server';
import { readProject, ProjectStorageError } from '@/lib/storage/normalize-project';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateFreelancerProjectAccess } from '@/lib/freelancer-access-control';
import { readAllProjects } from '@/lib/projects-utils';

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

    let project;
    try {
      project = await readProject(projectId);
    } catch (error) {
      if (error instanceof ProjectStorageError) {
        if (error.code === 'PROJECT_NOT_FOUND') {
          return NextResponse.json({
            error: 'Project not found',
            code: 'PROJECT_NOT_FOUND'
          }, { status: 404 });
        }
        if (error.code === 'MIGRATION_REQUIRED') {
          return NextResponse.json({
            error: 'Project requires migration to hierarchical storage',
            code: 'MIGRATION_REQUIRED',
            details: 'Please run the storage normalization migration'
          }, { status: 409 });
        }
      }

      console.error('Error reading project data:', error);
      return NextResponse.json({
        error: 'Failed to read project',
        code: 'STORAGE_IO_ERROR'
      }, { status: 500 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error in project API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ✅ DEPRECATED: This function has been replaced by hierarchical storage
// Use readAllProjects() from @/lib/projects-utils instead