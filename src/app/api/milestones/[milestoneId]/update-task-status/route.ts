// File: src/app/api/milestones/[milestoneId]/update-task-status/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const milestonesFilePath = path.join(process.cwd(), 'data', 'milestones.json');

export async function PUT(
  request: Request,
  { params }: { params: { milestoneId: string } }
) {
  try {
    const milestoneId = params.milestoneId;
    const { taskId, newStatus } = await request.json();

    if (!milestoneId || !taskId || !['submitted', 'completed'].includes(newStatus)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const file = await readFile(milestonesFilePath, 'utf-8');
    const milestones = JSON.parse(file);

    const milestone = milestones.find((m: any) => m.milestoneId === milestoneId);
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const task = milestone.tasks.find((t: any) => t.taskId === taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (newStatus === 'submitted') {
      task.status = 'submitted';
      task.submittedAt = now;
    } else if (newStatus === 'completed') {
      task.status = 'completed';
      task.completedAt = now;
    }

    // Auto-update milestone status if all tasks are completed
    const allCompleted = milestone.tasks.length > 0 &&
      milestone.tasks.every((t: any) => t.status === 'completed');

    milestone.status = allCompleted ? 'completed' : 'in progress';

    await writeFile(milestonesFilePath, JSON.stringify(milestones, null, 2));

    return NextResponse.json({ message: `Task ${newStatus}`, updatedTask: task }, { status: 200 });
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}