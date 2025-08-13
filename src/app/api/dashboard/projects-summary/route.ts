import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  console.log('📡 Dashboard Summary API | Received userId:', userId);

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    // Use hierarchical storage for projects and tasks
    const [projects, users, organizations] = await Promise.all([
      UnifiedStorageService.listProjects(), // Use hierarchical storage for projects
      UnifiedStorageService.getAllUsers(), // Use hierarchical storage for users
      UnifiedStorageService.getAllOrganizations() // Use hierarchical storage for organizations
    ]);

    const freelancerId = parseInt(userId);

    // Get projects for this freelancer
    const freelancerProjects = projects.filter((p: any) => p.freelancerId === freelancerId);

    // Calculate project summaries dynamically
    const projectSummaries = await Promise.all(freelancerProjects.map(async (project: any) => {
      // Get project tasks to calculate progress
      const projectTasks = await UnifiedStorageService.listTasks(project.projectId);

      let progress = 0;
      if (projectTasks.length > 0) {
        const completedTasks = projectTasks.filter((t: any) => t.completed).length;
        progress = Math.round((completedTasks / projectTasks.length) * 100);
      }

      // Get manager/commissioner info
      const organization = organizations.find((org: any) => org.id === project.organizationId);
      const manager = users.find((user: any) =>
        user.id === organization?.contactPersonId && user.type === 'commissioner'
      );

      // Format due date
      const formattedDueDate = project.dueDate
        ? new Date(project.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'No due date';

      return {
        projectId: project.projectId,
        name: project.title,
        manager: manager?.name || 'Unknown Manager',
        dueDate: formattedDueDate,
        status: project.status,
        progress
      };
    }));

    console.log('✅ Projects returned:', projectSummaries.length);

    return NextResponse.json(projectSummaries);
  } catch (err) {
    console.error('🔥 Failed to calculate dashboard projects summary:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}