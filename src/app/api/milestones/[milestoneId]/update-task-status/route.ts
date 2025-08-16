// File: src/app/api/milestones/[milestoneId]/update-task-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { requireSession, assertProjectAccess } from '@/lib/auth/session-guard';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { milestoneId } = await params;
    const { taskId, newStatus } = await request.json();

    // 🔒 STEP 1: Validate input
    if (!milestoneId || !taskId || !['submitted', 'completed', 'approved'].includes(newStatus)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // 🔒 STEP 2: Authenticate user FIRST
    const { userId: actorId } = await requireSession(request);

    // 🔒 STEP 3: Load milestone and project data
    const milestonesMinimalPath = path.join(process.cwd(), 'data', 'milestones-minimal.json');
    const milestonesFile = await readFile(milestonesMinimalPath, 'utf-8');
    const milestones = JSON.parse(milestonesFile);

    const milestoneIdNum = parseInt(milestoneId.split('-')[1]) || parseInt(milestoneId);
    const milestone = milestones.find((m: any) => m.id === milestoneIdNum);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const project = await UnifiedStorageService.readProject(milestone.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 🔒 STEP 4: Block self-approval BEFORE any changes
    if (actorId === project.freelancerId) {
      return NextResponse.json({ error: 'Self-approval not allowed' }, { status: 403 });
    }

    // 🔒 STEP 5: Only commissioners can approve
    assertProjectAccess(actorId, project, 'commissioner');

    // 🔒 STEP 6: NOW safe to load and update task
    const task = await UnifiedStorageService.readTask(milestone.projectId, taskId);
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

    // Handle authorization errors specifically
    if (error instanceof Error && 'status' in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as any).status }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}