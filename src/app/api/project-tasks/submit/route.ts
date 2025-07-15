

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const tasksFilePath = path.join(process.cwd(), 'data', 'project-tasks.json');

export async function POST(request: NextRequest) {
  try {
    const { projectId, taskId, action } = await request.json();

    if (!projectId || !taskId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const file = await readFile(tasksFilePath, 'utf-8');
    const projects = JSON.parse(file);

    const projectIndex = projects.findIndex((p: any) => p.projectId === projectId);
    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const taskIndex = projects[projectIndex].tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = projects[projectIndex].tasks[taskIndex];

    switch (action) {
      case 'submit':
        // First submission: mark as completed and in review, but don't increment version yet
        task.completed = true;
        task.status = 'In review';
        // Version stays the same (1) for first submission
        if (!task.version) task.version = 1;
        break;
      case 'resubmit':
        // Resubmission after rejection: increment version and mark as in review
        task.rejected = false;
        task.completed = true;
        task.status = 'In review';
        task.version = (task.version || 1) + 1;
        break;
      case 'complete':
        // Commissioner approves the task
        task.completed = true;
        task.status = 'Approved';
        task.rejected = false;
        break;
      case 'reject':
        // Commissioner rejects the task - freelancer needs to work on it again
        task.rejected = true;
        task.completed = false;
        task.status = 'Ongoing'; // Back to ongoing so freelancer can work on it
        task.feedbackCount = (task.feedbackCount || 0) + 1;
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await writeFile(tasksFilePath, JSON.stringify(projects, null, 2));

    return NextResponse.json({ success: true, updatedTask: task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}