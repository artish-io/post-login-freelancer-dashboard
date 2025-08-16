import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { filterFreelancerProjects, isValidFreelancerTask } from '@/lib/freelancer-access-control';

export async function GET() {
  try {
    console.log('🔍 /api/project-tasks called');

    // Validate session
    const session = await getServerSession(authOptions);
    console.log('🔐 Session check:', { hasSession: !!session, hasUser: !!session?.user, userId: session?.user?.id });

    if (!session?.user?.id) {
      console.warn('❌ No session found in project-tasks API');
      console.warn('Session details:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userType: (session?.user as any)?.userType || (session?.user as any)?.type
      });
      // For now, return empty array instead of 401 to allow frontend to work
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Get all projects and their tasks
    console.log('📋 Fetching all projects for user:', session.user.id, 'type:', (session.user as any)?.userType || (session.user as any)?.type);
    const allProjectsInfo = await UnifiedStorageService.listProjects();
    console.log('📋 Found projects:', allProjectsInfo.length);

    const allProjects = [];

    // Get tasks for each project and format them
    for (const project of allProjectsInfo) {
      const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
      if (projectTasks.length > 0) {
        // Transform tasks to match frontend expectations (taskId -> id)
        const transformedTasks = projectTasks.map(task => ({
          ...task,
          id: task.taskId // Map taskId to id for frontend compatibility
        }));

        allProjects.push({
          projectId: project.projectId,
          title: project.title || 'Untitled Project',
          organizationId: project.organizationId || 0,
          typeTags: project.typeTags || [],
          tasks: transformedTasks
        });
      }
    }

    // For freelancers, filter to only show their assigned projects and tasks
    const userType = (session.user as any)?.userType || (session.user as any)?.type;
    const userId = parseInt(session.user.id);

    // Guard: Validate user ID is a valid number
    if (isNaN(userId)) {
      console.error('❌ Invalid user ID in session:', session.user.id);
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    if (userType === 'freelancer') {
      console.log('🔍 Filtering projects for freelancer:', userId);

      // Get project information for filtering
      const projectsInfo = allProjectsInfo;

      // Guard: Validate projects info is an array
      if (!Array.isArray(projectsInfo)) {
        console.error('❌ Invalid projects info format:', typeof projectsInfo);
        return NextResponse.json({ error: 'Data format error' }, { status: 500 });
      }

      // Filter projects to only include those assigned to this freelancer
      const freelancerProjects = filterFreelancerProjects(projectsInfo, session.user as any);
      const freelancerProjectIds = new Set(freelancerProjects.map(p => p.projectId));

      console.log(`👤 Freelancer ${userId} has access to ${freelancerProjects.length} projects:`, Array.from(freelancerProjectIds));
      console.log(`🔍 All available projects:`, projectsInfo.map(p => ({ id: p.projectId, title: p.title, freelancerId: p.freelancerId, status: p.status })));
      console.log(`🔍 Freelancer projects:`, freelancerProjects.map(p => ({ id: p.projectId, title: p.title, freelancerId: p.freelancerId, status: p.status })));

      // Filter the task projects to only include assigned projects
      const filteredProjects = allProjects.filter(project =>
        freelancerProjectIds.has(project.projectId)
      );

      // Additional task-level validation for extra security
      const secureProjects = filteredProjects.map(project => {
        // Guard: Validate project structure
        if (!project.projectId || !project.tasks || !Array.isArray(project.tasks)) {
          console.warn(`⚠️ Invalid project structure for project ${project.projectId}`);
          return {
            projectId: project.projectId || 0,
            title: project.title || 'Untitled Project',
            organizationId: project.organizationId || 0,
            typeTags: project.typeTags || [],
            tasks: []
          };
        }

        const projectInfo = freelancerProjects.find(p => p.projectId === project.projectId);

        return {
          projectId: project.projectId,
          title: project.title,
          organizationId: project.organizationId,
          typeTags: project.typeTags,
          tasks: project.tasks.filter(task => {
            // Guard: Validate task structure
            if (!task || typeof task !== 'object') {
              console.warn(`⚠️ Invalid task structure in project ${project.projectId}`);
              return false;
            }

            return isValidFreelancerTask({
              project: {
                freelancerId: projectInfo?.freelancerId,
                assignedFreelancerId: projectInfo?.assignedFreelancerId
              }
            }, session.user as any);
          })
        };
      });

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
