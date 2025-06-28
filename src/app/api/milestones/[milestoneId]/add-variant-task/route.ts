// File: src/app/api/milestones/[milestoneId]/add-variant-task/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const milestonesFilePath = path.join(process.cwd(), 'data', 'milestones.json');

type Task = {
  taskId: string;
  title: string;
  status: 'pending' | 'submitted' | 'completed';
  submittedAt: string | null;
  completedAt: string | null;
};

function getNextVariantLabel(existingTasks: Task[], base: string): string {
  const pattern = new RegExp(`${base} variant ([A-Z])`, 'i');

  const variants = existingTasks
    .map(task => task.title.match(pattern))
    .filter(Boolean)
    .map(match => match![1]);

  const maxChar = variants.sort().pop();
  const nextChar = maxChar ? String.fromCharCode(maxChar.charCodeAt(0) + 1) : 'A';

  return `${base} variant ${nextChar}`;
}

export async function POST(request: NextRequest) {
  try {
    const { baseTitle } = await request.json();
    const milestoneId = request.nextUrl.pathname.split('/')[5]; // Extract milestoneId from URL

    if (!baseTitle || !milestoneId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const file = await readFile(milestonesFilePath, 'utf-8');
    const milestones = JSON.parse(file);

    const milestone = milestones.find((m: any) => m.milestoneId === milestoneId);
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    if (!Array.isArray(milestone.tasks)) {
      milestone.tasks = [];
    }

    const nextTitle = getNextVariantLabel(milestone.tasks, baseTitle);
    const nextVariantLetter = nextTitle.slice(-1);
    const taskId = `${milestoneId}-${nextVariantLetter}`;

    const newTask: Task = {
      taskId,
      title: nextTitle,
      status: 'pending',
      submittedAt: null,
      completedAt: null
    };

    milestone.tasks.push(newTask);

    const allCompleted = milestone.tasks.length > 0 &&
      milestone.tasks.every((t: Task) => t.status === 'completed');

    milestone.status = allCompleted ? 'completed' : 'in progress';

    await writeFile(milestonesFilePath, JSON.stringify(milestones, null, 2));

    return NextResponse.json({ message: 'Task added', task: newTask }, { status: 201 });
  } catch (error) {
    console.error('Error adding variant task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}