import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateFreelancerProjectAccess } from '@/lib/freelancer-access-control';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const projectId = id; // Keep as string to support IDs like "Z-007"
    if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Validate session and access control
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load all projects to validate access
    const allProjects = await UnifiedStorageService.listProjects();

    // Validate that the user has access to this project
    const hasAccess = validateFreelancerProjectAccess(
      projectId,
      allProjects,
      session.user as any
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const project = await UnifiedStorageService.readProject(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error reading project data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ✅ DEPRECATED: This function has been replaced by hierarchical storage
// Use readAllProjects() from @/lib/projects-utils instead