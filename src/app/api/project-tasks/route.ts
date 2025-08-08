import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readAllProjects } from '@/app/api/payments/repos/projects-repo';
import { filterFreelancerProjects, isValidFreelancerTask } from '@/lib/freelancer-access-control';
import { readAllTasks as readAllTasksHier, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';

export async function GET() {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.warn('No session found in project-tasks API - this should be fixed in production');
      // For now, return empty array instead of 401 to allow frontend to work
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Read all tasks from hierarchical storage and convert to legacy grouped format
    const hierarchicalTasks = await readAllTasksHier();
    const allProjects = convertHierarchicalToLegacy(hierarchicalTasks);

    // For freelancers, filter to only show their assigned projects and tasks
    const userType = (session.user as any)?.userType || (session.user as any)?.type;

    if (userType === 'freelancer') {
      // Get project information for filtering
      const projectsInfo = await readAllProjects();

      // Filter projects to only include those assigned to this freelancer
      const freelancerProjects = filterFreelancerProjects(projectsInfo, session.user as any);
      const freelancerProjectIds = new Set(freelancerProjects.map(p => p.projectId));

      // Filter the task projects to only include assigned projects
      const filteredProjects = allProjects.filter(project =>
        freelancerProjectIds.has(project.projectId)
      );

      // Additional task-level validation for extra security
      const secureProjects = filteredProjects.map(project => ({
        projectId: project.projectId,
        title: project.title,
        organizationId: project.organizationId,
        typeTags: project.typeTags,
        tasks: project.tasks.filter(task =>
          isValidFreelancerTask({
            project: {
              freelancerId: freelancerProjects.find(p => p.projectId === project.projectId)?.freelancerId,
              assignedFreelancerId: freelancerProjects.find(p => p.projectId === project.projectId)?.assignedFreelancerId
            }
          }, session.user as any)
        )
      }));

      return NextResponse.json(secureProjects, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // For commissioners, return all projects (they have broader access)
    return NextResponse.json(allProjects, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error reading project tasks from hierarchical storage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
