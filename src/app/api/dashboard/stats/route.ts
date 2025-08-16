import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 401 });
  }

  try {
    // Read data from hierarchical storage
    const [projects, hierarchicalTasks] = await Promise.all([
      UnifiedStorageService.listProjects(), // Use UnifiedStorageService for projects
      readAllTasks() // Use hierarchical storage for project tasks
    ]);

    // Convert hierarchical tasks to legacy format for compatibility
    const projectTasks = convertHierarchicalToLegacy(hierarchicalTasks);
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

  // Get ongoing projects (exclude paused, completed, cancelled, archived statuses)
  const ongoingProjects = freelancerProjects.filter(p => {
    const status = p.status.toLowerCase();
    const inactiveStatuses = ['paused', 'completed', 'cancelled', 'archived', 'on hold', 'suspended'];
    return !inactiveStatuses.some(inactive => status.includes(inactive));
  }).length;

  // Console warning for debugging inconsistencies
  const totalProjectsCount = freelancerProjects.length;
  const pausedProjects = freelancerProjects.filter(p =>
    p.status.toLowerCase().includes('paused')
  ).length;

  if (pausedProjects > 0) {
    console.warn(`[Dashboard Stats] User ${freelancerId}: ${pausedProjects} paused projects excluded from ongoing count. Total: ${totalProjectsCount}, Ongoing: ${ongoingProjects}`);
  }

  // Get all tasks for freelancer's projects
  const freelancerProjectIds = freelancerProjects.map(p => p.projectId);
  const freelancerTaskProjects = projectTasks.filter(pt =>
    freelancerProjectIds.some(id => id.toString() === pt.projectId.toString())
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

      // Tasks for today - match tasks-panel logic exactly
      // The tasks panel shows top 3 most urgent incomplete, ongoing tasks
      // So we count all incomplete, ongoing tasks that could appear in "Today's Tasks"
      if (!task.completed && task.status === 'Ongoing') {
        // All incomplete, ongoing tasks are potential "today's tasks"
        // The tasks panel will sort by urgency and take top 3
        tasksToday++;
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