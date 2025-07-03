// src/app/api/dashboard/tasks-summary/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    const tasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const file = await readFile(tasksPath, 'utf-8');
    const projects = JSON.parse(file);

    const milestonesPath = path.join(process.cwd(), 'data', 'milestones.json');
    const milestoneFile = await readFile(milestonesPath, 'utf-8');
    const milestoneData = JSON.parse(milestoneFile);

    const flattenedTasks = projects.flatMap((project: any) =>
      project.tasks.map((task: any) => {
        const matchingMilestones = milestoneData.filter(
          (m: any) => m.projectId === project.projectId
        );

        const allVariants = matchingMilestones.flatMap((m: any) =>
          m.tasks.filter((t: any) => t.title.includes(task.title))
        );

        const latest = allVariants.sort((a: { submittedAt: string }, b: { submittedAt: string }) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        )[0];

        return {
          id: task.id,
          projectId: project.projectId,
          title: task.title,
          status: latest?.status || task.status,
          important: task.feedbackCount > 0 || task.rejected,
          completed: task.completed,
          version: task.version,
          latestSubmittedVersion: allVariants.length,
          historyExists: allVariants.length > 1
        };
      })
    );

    return NextResponse.json(flattenedTasks);
  } catch (err) {
    console.error('❌ Error loading project-tasks.json:', err);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}