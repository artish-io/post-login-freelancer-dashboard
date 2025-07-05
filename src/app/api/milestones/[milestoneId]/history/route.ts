

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  const { milestoneId } = await params;

  if (!milestoneId) {
    return NextResponse.json({ error: 'Missing milestone ID' }, { status: 400 });
  }

  try {
    const milestonesPath = path.join(process.cwd(), 'data', 'milestones.json');
    const data = await readFile(milestonesPath, 'utf-8');
    const milestones = JSON.parse(data);

    const milestone = milestones.find((m: any) => m.milestoneId === milestoneId);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    return NextResponse.json({
      milestoneId: milestone.milestoneId,
      projectId: milestone.projectId,
      title: milestone.title,
      tasks: milestone.tasks.map((task: any) => ({
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        submittedAt: task.submittedAt,
        completedAt: task.completedAt || null,
      }))
    });
  } catch (err) {
    console.error('❌ Error loading milestone history:', err);
    return NextResponse.json({ error: 'Failed to load milestone history' }, { status: 500 });
  }
}