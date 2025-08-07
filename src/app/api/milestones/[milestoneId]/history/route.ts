

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
    // Use universal source files to get milestone data
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    // Use hierarchical storage for project tasks
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');
    const milestonesMinimalPath = path.join(process.cwd(), 'data', 'milestones-minimal.json');

    const [projectsFile, hierarchicalTasks, milestonesFile] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readAllTasks(),
      readFile(milestonesMinimalPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsFile);
    const projectTasks = convertHierarchicalToLegacy(hierarchicalTasks);
    const milestones = JSON.parse(milestonesFile);

    // Extract milestone ID number from string (e.g., "M301-1" → 1)
    const milestoneIdNum = parseInt(milestoneId.split('-')[1]) || parseInt(milestoneId);
    const milestone = milestones.find((m: any) => m.id === milestoneIdNum);

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Get project and tasks for this milestone
    const project = projects.find((p: any) => p.projectId === milestone.projectId);
    const projectTaskData = projectTasks.find((pt: any) => pt.projectId === milestone.projectId);

    if (!project || !projectTaskData) {
      return NextResponse.json({ error: 'Project data not found' }, { status: 404 });
    }

    // Map status codes to readable status
    const statusMap = { 0: 'in progress', 1: 'pending payment', 2: 'paid' };

    return NextResponse.json({
      milestoneId: `M${milestone.projectId}-${milestone.id}`,
      projectId: milestone.projectId,
      title: `Milestone for ${project.title}`,
      status: statusMap[milestone.status as keyof typeof statusMap],
      amount: milestone.amount,
      dueDate: milestone.dueDate,
      tasks: projectTaskData.tasks.map((task: any) => ({
        taskId: task.id,
        title: task.title,
        status: task.status,
        completed: task.completed,
        submittedAt: null, // Simplified - no submission tracking
        completedAt: task.completed ? new Date().toISOString() : null,
      }))
    });
  } catch (err) {
    console.error('❌ Error loading milestone history:', err);
    return NextResponse.json({ error: 'Failed to load milestone history' }, { status: 500 });
  }
}