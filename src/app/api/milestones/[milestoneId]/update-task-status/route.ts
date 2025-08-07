// File: src/app/api/milestones/[milestoneId]/update-task-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { milestoneId } = await params;
    const { taskId, newStatus } = await request.json();

    if (!milestoneId || !taskId || !['submitted', 'completed', 'approved'].includes(newStatus)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // Use hierarchical storage for project tasks
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');
    const milestonesMinimalPath = path.join(process.cwd(), 'data', 'milestones-minimal.json');

    const [hierarchicalTasks, milestonesFile] = await Promise.all([
      readAllTasks(),
      readFile(milestonesMinimalPath, 'utf-8')
    ]);

    // Convert to legacy format for compatibility
    const projectTasksData = convertHierarchicalToLegacy(hierarchicalTasks);

    const projectTasks = projectTasksData;
    const milestones = JSON.parse(milestonesFile);

    // Extract milestone ID number and find milestone
    const milestoneIdNum = parseInt(milestoneId.split('-')[1]) || parseInt(milestoneId);
    const milestone = milestones.find((m: any) => m.id === milestoneIdNum);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Find the project tasks for this milestone
    const projectTaskData = projectTasks.find((pt: any) => pt.projectId === milestone.projectId);
    if (!projectTaskData) {
      return NextResponse.json({ error: 'Project tasks not found' }, { status: 404 });
    }

    // Find the specific task
    const task = projectTaskData.tasks.find((t: any) => t.id === parseInt(taskId));
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task based on new status using your business logic
    if (newStatus === 'submitted') {
      task.status = 'In review';
      task.completed = true;
    } else if (newStatus === 'completed' || newStatus === 'approved') {
      task.status = 'Approved';
      task.completed = true;
    }

    // Check if all tasks are completed and approved to update milestone status
    const allTasksApproved = projectTaskData.tasks.every((t: any) =>
      t.completed && t.status === 'Approved'
    );

    // Update milestone status in minimal file
    const milestoneToUpdate = milestones.find((m: any) => m.id === milestoneIdNum);
    if (milestoneToUpdate) {
      milestoneToUpdate.status = allTasksApproved ? 1 : 0; // 1 = pending payment, 0 = in progress
    }

    // Write back to files
    await Promise.all([
      writeFile(projectTasksPath, JSON.stringify(projectTasks, null, 2)),
      writeFile(milestonesMinimalPath, JSON.stringify(milestones, null, 2))
    ]);

    return NextResponse.json(
      {
        message: `Task ${newStatus}`,
        updatedTask: {
          id: task.id,
          title: task.title,
          status: task.status,
          completed: task.completed
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}