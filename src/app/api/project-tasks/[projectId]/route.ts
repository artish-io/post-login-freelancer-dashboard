// File: src/app/api/project-tasks/[projectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readProjectTasks } from '@/lib/project-tasks/hierarchical-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId: projectIdParam } = await params;
    const projectId = Number(projectIdParam);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Read tasks for this specific project from hierarchical storage
    const hierarchicalTasks = await readProjectTasks(projectId);

    if (hierarchicalTasks.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get project info from the first task (all tasks in a project share this info)
    const firstTask = hierarchicalTasks[0];

    // Convert hierarchical tasks back to legacy task format
    const legacyTasks = hierarchicalTasks.map(task => ({
      id: task.taskId,
      title: task.title,
      status: task.status,
      completed: task.completed,
      order: task.order,
      link: task.link,
      dueDate: task.dueDate,
      rejected: task.rejected,
      feedbackCount: task.feedbackCount,
      pushedBack: task.pushedBack,
      version: task.version,
      description: task.description,
      submittedDate: task.submittedDate,
      approvedDate: task.approvedDate,
      rejectedDate: task.rejectedDate
    }));

    return NextResponse.json({
      projectId: firstTask.projectId,
      title: firstTask.projectTitle,
      organizationId: firstTask.organizationId,
      typeTags: firstTask.projectTypeTags,
      tasks: legacyTasks
    });
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}