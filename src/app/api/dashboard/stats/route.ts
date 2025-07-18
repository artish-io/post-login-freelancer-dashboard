import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 401 });
  }

  try {
    // Read data directly from universal source files
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');

    const [projectsRaw, projectTasksRaw] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readFile(projectTasksPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsRaw);
    const projectTasks = JSON.parse(projectTasksRaw);
    const freelancerId = parseInt(userId);

    // Calculate stats dynamically from actual data
    const stats = calculateFreelancerStats(projects, projectTasks, freelancerId);

    return NextResponse.json(stats);
  } catch (err) {
    console.error('Dashboard stats calculation error:', err);
    return NextResponse.json({ error: 'Failed to calculate stats' }, { status: 500 });
  }
}

function calculateFreelancerStats(projects: any[], projectTasks: any[], freelancerId: number) {
  // Get projects for this freelancer
  const freelancerProjects = projects.filter(p => p.freelancerId === freelancerId);

  // Get ongoing projects (Active, Ongoing, Delayed statuses)
  const ongoingProjects = freelancerProjects.filter(p =>
    ['Active', 'Ongoing', 'Delayed'].includes(p.status)
  ).length;

  // Get all tasks for freelancer's projects
  const freelancerProjectIds = freelancerProjects.map(p => p.projectId);
  const freelancerTaskProjects = projectTasks.filter(pt =>
    freelancerProjectIds.includes(pt.projectId)
  );

  let tasksToday = 0;
  let upcomingDeadlines = 0;
  let overdueDeadlines = 0;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Create a date object for start of today for accurate overdue comparison
  const startOfToday = new Date(todayStr + 'T00:00:00.000Z');

  freelancerTaskProjects.forEach(project => {
    project.tasks.forEach((task: any) => {
      const taskDueDate = new Date(task.dueDate);
      const taskDueDateStr = taskDueDate.toISOString().split('T')[0];

      // Tasks for today - match tasks-panel logic (incomplete, ongoing tasks)
      // Note: tasks-panel shows top 3 urgent tasks, not necessarily due today
      // This counts tasks that could appear in "Today's Tasks" panel
      if (!task.completed && task.status === 'Ongoing') {
        // Count as "today's task" if it's urgent (has feedback, rejected, pushed back, or due soon)
        const isUrgent = task.rejected ||
                        (task.feedbackCount && task.feedbackCount > 0) ||
                        task.pushedBack ||
                        taskDueDateStr === todayStr;

        if (isUrgent) {
          tasksToday++;
        }
      }

      // Upcoming deadlines (due within 3 days and not completed)
      if (taskDueDate <= threeDaysFromNow && !task.completed && task.status === 'Ongoing') {
        upcomingDeadlines++;
      }

      // Overdue deadlines (past due date, not completed, and not due today)
      // A task is overdue if its due date is before today (not including today)
      if (taskDueDate < startOfToday && !task.completed && task.status === 'Ongoing') {
        overdueDeadlines++;
      }
    });
  });

  return {
    tasksToday,
    ongoingProjects,
    upcomingDeadlines,
    overdueDeadlines
  };
}