import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Types
interface Project {
  projectId: number;
  title: string;
  freelancerId: number;
  status: string;
  dueDate: string;
  totalTasks: number;
  progress: number;
}

interface Task {
  id: number;
  title: string;
  status: string;
  completed: boolean;
  dueDate: string;
  rejected: boolean;
}

interface ProjectTasks {
  projectId: number;
  title: string;
  tasks: Task[];
}

interface DashboardStats {
  userId: string;
  tasksToday: number;
  ongoingProjects: number;
  upcomingDeadlines: number;
  overdueDeadlines: number;
  completedTasksThisWeek: number;
  totalActiveTasks: number;
}

// Helper functions
function isWithinThreeDays(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 3;
}

function isThisWeek(dateString: string): boolean {
  const today = new Date();
  const date = new Date(dateString);
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
  return date >= startOfWeek && date <= endOfWeek;
}

function isUpcomingOrOverdue(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= 7; // Overdue (negative) or upcoming within 7 days
}

function isOverdue(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays < 0; // Only overdue (past due)
}

function isActiveProject(status: string): boolean {
  const activeStatuses = ['ongoing', 'in progress', 'active', 'started', 'delayed'];
  const inactiveStatuses = ['completed', 'cancelled', 'paused', 'on hold', 'suspended'];

  const normalizedStatus = status.toLowerCase();

  if (inactiveStatuses.some(inactive => normalizedStatus.includes(inactive))) {
    return false;
  }

  return activeStatuses.some(active => normalizedStatus.includes(active)) ||
         !inactiveStatuses.some(inactive => normalizedStatus.includes(inactive));
}

function calculateUserStats(userId: string, projects: Project[], projectTasks: ProjectTasks[]): DashboardStats {
  // Get user's projects
  const userProjects = projects.filter(project =>
    String(project.freelancerId) === String(userId)
  );

  // Count ongoing projects (only active projects)
  const ongoingProjects = userProjects.filter(project =>
    isActiveProject(project.status)
  ).length;

  // Initialize counters
  let tasksToday = 0;
  let upcomingDeadlines = 0;
  let overdueDeadlines = 0;
  let completedTasksThisWeek = 0;
  let totalActiveTasks = 0;

  // Check project-level deadlines first
  userProjects.forEach(project => {
    if (project.dueDate && isActiveProject(project.status)) {
      if (isOverdue(project.dueDate)) {
        overdueDeadlines++;
      }
      if (isUpcomingOrOverdue(project.dueDate)) {
        upcomingDeadlines++;
      }
    }
  });

  // Analyze tasks for each project
  userProjects.forEach(project => {
    const projectTaskData = projectTasks.find(pt => pt.projectId === project.projectId);

    if (projectTaskData && projectTaskData.tasks) {
      projectTaskData.tasks.forEach(task => {
        // Count active (non-completed) tasks
        if (!task.completed && !task.rejected) {
          totalActiveTasks++;
        }

        // Count tasks due within 3 days that are not completed
        if (task.dueDate && isWithinThreeDays(task.dueDate) && !task.completed) {
          tasksToday++;
        }

        // Count upcoming/overdue deadlines (not completed)
        if (task.dueDate && !task.completed) {
          if (isOverdue(task.dueDate)) {
            overdueDeadlines++;
          }
          if (isUpcomingOrOverdue(task.dueDate)) {
            upcomingDeadlines++;
          }
        }

        // Count completed tasks this week
        if (task.completed && task.dueDate && isThisWeek(task.dueDate)) {
          completedTasksThisWeek++;
        }
      });
    }
  });

  return {
    userId: String(userId),
    tasksToday,
    ongoingProjects,
    upcomingDeadlines,
    overdueDeadlines,
    completedTasksThisWeek,
    totalActiveTasks
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Load data files
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    
    const projectsData = fs.readFileSync(projectsPath, 'utf8');
    const projectTasksData = fs.readFileSync(projectTasksPath, 'utf8');
    
    const projects: Project[] = JSON.parse(projectsData);
    const projectTasks: ProjectTasks[] = JSON.parse(projectTasksData);
    
    if (userId) {
      // Return stats for specific user
      const stats = calculateUserStats(userId, projects, projectTasks);
      return NextResponse.json(stats);
    } else {
      // Return stats for all users
      const userIds = [...new Set(projects.map(p => p.freelancerId))].filter(Boolean);
      const allStats = userIds.map(id => calculateUserStats(String(id), projects, projectTasks));
      return NextResponse.json(allStats);
    }
    
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to calculate dashboard stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Stats are now calculated dynamically from universal source files
    // No need to update static files - return current stats instead
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');

    const projectsData = fs.readFileSync(projectsPath, 'utf8');
    const projectTasksData = fs.readFileSync(projectTasksPath, 'utf8');

    const projects: Project[] = JSON.parse(projectsData);
    const projectTasks: ProjectTasks[] = JSON.parse(projectTasksData);

    // Calculate stats for all users dynamically
    const userIds = [...new Set(projects.map(p => p.freelancerId))].filter(Boolean);
    const allStats = userIds.map(id => calculateUserStats(String(id), projects, projectTasks));

    return NextResponse.json({
      message: 'Dashboard stats calculated successfully from universal source files',
      stats: allStats,
      note: 'Stats are now calculated dynamically - no static file updates needed'
    });

  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to calculate dashboard stats' },
      { status: 500 }
    );
  }
}
