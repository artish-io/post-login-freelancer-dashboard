// src/app/api/dashboard/tasks/active/route.ts

import { NextResponse } from 'next/server';
import { readAllTasks, convertHierarchicalToLegacy } from '@/lib/project-tasks/hierarchical-storage';
import { calculateTaskPriority } from '@/lib/task-priority.util';

function isSameDay(date1: Date, date2: Date) {
  return date1.toDateString() === date2.toDateString();
}

export async function GET() {
  try {
    // Read all tasks from hierarchical storage
    const hierarchicalTasks = await readAllTasks();

    // Convert back to legacy format for backward compatibility
    const projects = convertHierarchicalToLegacy(hierarchicalTasks);

    const today = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(today.getDate() + 7);

    const result = {
      today: [] as any[],
      thisWeek: [] as any[],
      awaitingReview: [] as any[],
    };

    for (const project of projects) {
      const { projectId, title: projectTitle, logoUrl, tasks } = project;

      for (const task of tasks) {
        if (task.completed) continue;

        const dueDate = new Date(task.dueDate);
        const enrichedTask = {
          ...task,
          projectId,
          projectTitle,
          logoUrl,
        };

        if (task.status === 'In review') {
          result.awaitingReview.push(enrichedTask);
        } else if (isSameDay(dueDate, today)) {
          enrichedTask.priorityScore = calculateTaskPriority(task);
          result.today.push(enrichedTask);
        } else if (dueDate > today && dueDate <= endOfWeek) {
          result.thisWeek.push(enrichedTask);
        }
      }
    }

    // Sort today's tasks by priority
    result.today.sort((a, b) => b.priorityScore - a.priorityScore);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return NextResponse.json({ error: 'Failed to load active tasks' }, { status: 500 });
  }
}