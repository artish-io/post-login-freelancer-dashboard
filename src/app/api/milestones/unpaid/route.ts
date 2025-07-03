

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET() {
  try {
    const milestonesPath = path.join(process.cwd(), 'data', 'milestones.json');
    const file = await readFile(milestonesPath, 'utf-8');
    const milestones = JSON.parse(file);

    // Filter for unpaid milestones — assume not 'completed' means unpaid
    const unpaid = milestones.filter(
      (m: any) =>
        m.status !== 'completed' &&
        m.tasks?.some((t: any) => t.status === 'submitted' || t.status === 'completed')
    );

    const response = unpaid.map((m: any) => ({
      milestoneId: m.milestoneId,
      projectId: m.projectId,
      title: m.title,
      amount: m.amount,
      dueDate: m.dueDate,
      status: m.status,
      taskCount: m.tasks?.length ?? 0,
      submittedTasks: m.tasks?.filter((t: any) => t.status === 'submitted').length ?? 0,
      completedTasks: m.tasks?.filter((t: any) => t.status === 'completed').length ?? 0,
    }));

    return NextResponse.json(response);
  } catch (err) {
    console.error('❌ Error loading unpaid milestones:', err);
    return NextResponse.json({ error: 'Failed to load unpaid milestones' }, { status: 500 });
  }
}