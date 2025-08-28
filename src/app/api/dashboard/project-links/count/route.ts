// src/app/api/dashboard/project-links/count/route.ts

import { NextResponse } from 'next/server';
import { readAllProjects } from '@/lib/projects-utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // Use hierarchical storage for project tasks
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');

    const [projects, hierarchicalTasks] = await Promise.all([
      readAllProjects(), // ✅ Use hierarchical storage
      readAllTasks()
    ]);

    // Use hierarchical storage directly
    const freelancerId = parseInt(userId);

    // Get projects for this freelancer
    const freelancerProjects = projects.filter((p: any) => p.freelancerId === freelancerId);
    const projectIds = freelancerProjects.map((p: any) => p.projectId);

    if (projectIds.length === 0) {
      return NextResponse.json({ count: 0, taskIds: [] });
    }

    const taskIdsWithLinks: number[] = [];

    // Use hierarchical tasks directly
    hierarchicalTasks.forEach((task: any) => {
      if (projectIds.includes(task.projectId) && task.link && task.link.length > 0) {
        taskIdsWithLinks.push(task.taskId);
      }
    });

    return NextResponse.json({
      count: taskIdsWithLinks.length,
      taskIds: taskIdsWithLinks,
    });
  } catch (error) {
    console.error('Error calculating project links count:', error);
    return NextResponse.json({ error: 'Failed to calculate project links count' }, { status: 500 });
  }
}