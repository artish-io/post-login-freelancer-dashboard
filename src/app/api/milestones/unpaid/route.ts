

import { NextResponse } from 'next/server';
import { readAllProjects } from '@/lib/projects-utils';

export async function GET() {
  try {
    // Calculate milestones from hierarchical storage
    const { readAllTasks, convertHierarchicalToLegacy } = await import('@/lib/project-tasks/hierarchical-storage');

    const [projects, hierarchicalTasks] = await Promise.all([
      readAllProjects(), // ✅ Use hierarchical storage
      readAllTasks()
    ]);

    const projectTasks = convertHierarchicalToLegacy(hierarchicalTasks);

    // Generate milestones dynamically from project data
    const unpaidMilestones: any[] = [];

    projects.forEach((project: any) => {
      const projectTaskData = projectTasks.find((pt: any) => pt.projectId === project.projectId);

      if (projectTaskData && project.status !== 'Completed') {
        const completedTasks = projectTaskData.tasks.filter((t: any) => t.completed);
        const approvedTasks = projectTaskData.tasks.filter((t: any) => t.completed && t.status === 'Approved');
        const submittedTasks = projectTaskData.tasks.filter((t: any) => t.status === 'In review');

        // Only include if there are completed or submitted tasks (work done but not paid)
        if (completedTasks.length > 0 || submittedTasks.length > 0) {
          // Calculate milestone status based on your business logic
          let milestoneStatus = 'in progress';
          if (approvedTasks.length === projectTaskData.tasks.length) {
            milestoneStatus = 'completed';
          } else if (submittedTasks.length > 0) {
            milestoneStatus = 'pending approval';
          }

          // Estimate amount based on project value (you can adjust this logic)
          const estimatedAmount = Math.round((completedTasks.length / projectTaskData.tasks.length) * 1000);

          unpaidMilestones.push({
            milestoneId: `M${project.projectId}-1`,
            projectId: project.projectId,
            title: `Milestone for ${project.title}`,
            amount: estimatedAmount,
            dueDate: project.dueDate,
            status: milestoneStatus,
            taskCount: projectTaskData.tasks.length,
            submittedTasks: submittedTasks.length,
            completedTasks: completedTasks.length,
          });
        }
      }
    });

    return NextResponse.json(unpaidMilestones);
  } catch (err) {
    console.error('❌ Error calculating unpaid milestones:', err);
    return NextResponse.json({ error: 'Failed to calculate unpaid milestones' }, { status: 500 });
  }
}