import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  console.log('📡 Dashboard Summary API | Received userId:', userId);

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    // Use universal source files instead of deprecated projects-summary.json
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');

    const [projectsFile, projectTasksFile, usersFile, organizationsFile] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readFile(projectTasksPath, 'utf-8'),
      readFile(usersPath, 'utf-8'),
      readFile(organizationsPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsFile);
    const projectTasks = JSON.parse(projectTasksFile);
    const users = JSON.parse(usersFile);
    const organizations = JSON.parse(organizationsFile);

    const freelancerId = parseInt(userId);

    // Get projects for this freelancer
    const freelancerProjects = projects.filter((p: any) => p.freelancerId === freelancerId);

    // Calculate project summaries dynamically
    const projectSummaries = freelancerProjects.map((project: any) => {
      // Get project tasks to calculate progress
      const projectTaskData = projectTasks.find((pt: any) => pt.projectId === project.projectId);

      let progress = 0;
      if (projectTaskData && projectTaskData.tasks.length > 0) {
        const completedTasks = projectTaskData.tasks.filter((t: any) => t.completed).length;
        progress = Math.round((completedTasks / projectTaskData.tasks.length) * 100);
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
    });

    console.log('✅ Projects returned:', projectSummaries.length);

    return NextResponse.json(projectSummaries);
  } catch (err) {
    console.error('🔥 Failed to calculate dashboard projects summary:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}