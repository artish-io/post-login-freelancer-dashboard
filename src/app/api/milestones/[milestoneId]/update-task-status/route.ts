// File: src/app/api/milestones/[milestoneId]/update-task-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

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

    // Use unified storage for project tasks
    const milestonesMinimalPath = path.join(process.cwd(), 'data', 'milestones-minimal.json');

    const [milestonesFile] = await Promise.all([
      readFile(milestonesMinimalPath, 'utf-8')
    ]);

    const milestones = JSON.parse(milestonesFile);

    // Extract milestone ID number and find milestone
    const milestoneIdNum = parseInt(milestoneId.split('-')[1]) || parseInt(milestoneId);
    const milestone = milestones.find((m: any) => m.id === milestoneIdNum);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Get project tasks using unified storage
    const projectTasks = await UnifiedStorageService.listTasks(milestone.projectId);

    // Find the specific task
    const task = projectTasks.find((t: any) => t.taskId === parseInt(taskId));
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task based on new status using unified storage
    const updatedTask = { ...task };
    if (newStatus === 'submitted') {
      updatedTask.status = 'In review';
      updatedTask.completed = true;
    } else if (newStatus === 'completed' || newStatus === 'approved') {
      updatedTask.status = 'Approved';
      updatedTask.completed = true;
    }

    // Write updated task using unified storage
    await UnifiedStorageService.writeTask(updatedTask);

    // Check if all tasks are completed and approved to update milestone status
    const allProjectTasks = await UnifiedStorageService.listTasks(milestone.projectId);
    const allTasksApproved = allProjectTasks.every((t: any) =>
      t.completed && t.status === 'Approved'
    );

    // Update milestone status in minimal file
    const milestoneToUpdate = milestones.find((m: any) => m.id === milestoneIdNum);
    if (milestoneToUpdate) {
      milestoneToUpdate.status = allTasksApproved ? 1 : 0; // 1 = pending payment, 0 = in progress
    }

    // Write back milestone file only (tasks are handled by UnifiedStorageService)
    await writeFile(milestonesMinimalPath, JSON.stringify(milestones, null, 2));

    return NextResponse.json(
      {
        message: `Task ${newStatus}`,
        updatedTask: {
          id: updatedTask.taskId,
          title: updatedTask.title,
          status: updatedTask.status,
          completed: updatedTask.completed
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}