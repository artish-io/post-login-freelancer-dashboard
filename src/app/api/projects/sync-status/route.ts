import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    // Load data files
    const projectsPath = path.join(process.cwd(), 'data/projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data/project-tasks.json');

    const [projectsData, projectTasksData] = await Promise.all([
      fs.readFile(projectsPath, 'utf-8'),
      fs.readFile(projectTasksPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsData);
    const projectTasks = JSON.parse(projectTasksData);

    // Find the project and its tasks
    const projectIndex = projects.findIndex((p: any) => p.projectId === projectId);
    const projectTaskData = projectTasks.find((pt: any) => pt.projectId === projectId);

    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found in projects.json' }, { status: 404 });
    }

    if (!projectTaskData) {
      return NextResponse.json({ error: 'Project tasks not found' }, { status: 404 });
    }

    const project = projects[projectIndex];
    const tasks = projectTaskData.tasks || [];

    // Calculate task statistics
    const totalTasks = tasks.length;
    const approvedTasks = tasks.filter((task: any) => task.status === 'Approved').length;
    const completedTasks = tasks.filter((task: any) => task.completed).length;
    const inReviewTasks = tasks.filter((task: any) => task.status === 'In review').length;
    const ongoingTasks = tasks.filter((task: any) => task.status === 'Ongoing').length;

    // Determine new status based on task completion
    let newStatus = project.status;
    let shouldUpdate = false;

    if (approvedTasks === totalTasks && totalTasks > 0) {
      // All tasks are approved - project is completed
      newStatus = 'Completed';
      shouldUpdate = project.status !== 'Completed';
    } else if (approvedTasks > 0 || inReviewTasks > 0 || ongoingTasks > 0) {
      // Has active tasks - project is ongoing
      newStatus = 'Ongoing';
      shouldUpdate = project.status !== 'Ongoing';
    } else if (totalTasks === 0 || (completedTasks === 0 && approvedTasks === 0)) {
      // No tasks or no progress - project is paused
      newStatus = 'Paused';
      shouldUpdate = project.status !== 'Paused';
    }

    // Update totalTasks to match actual task count
    const actualTotalTasks = tasks.length;
    const taskCountNeedsUpdate = project.totalTasks !== actualTotalTasks;

    if (shouldUpdate || taskCountNeedsUpdate) {
      // Update the project
      projects[projectIndex].status = newStatus;
      projects[projectIndex].totalTasks = actualTotalTasks;

      // Save updated projects
      await fs.writeFile(projectsPath, JSON.stringify(projects, null, 2));

      return NextResponse.json({
        success: true,
        projectId,
        changes: {
          statusChanged: shouldUpdate,
          oldStatus: project.status,
          newStatus,
          taskCountChanged: taskCountNeedsUpdate,
          oldTotalTasks: project.totalTasks,
          newTotalTasks: actualTotalTasks
        },
        taskStats: {
          totalTasks,
          approvedTasks,
          completedTasks,
          inReviewTasks,
          ongoingTasks,
          progress: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        projectId,
        message: 'No changes needed',
        taskStats: {
          totalTasks,
          approvedTasks,
          completedTasks,
          inReviewTasks,
          ongoingTasks,
          progress: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
        }
      });
    }

  } catch (error) {
    console.error('Error syncing project status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to sync all projects
export async function GET() {
  try {
    // Load data files
    const projectsPath = path.join(process.cwd(), 'data/projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data/project-tasks.json');

    const [projectsData, projectTasksData] = await Promise.all([
      fs.readFile(projectsPath, 'utf-8'),
      fs.readFile(projectTasksPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsData);
    const projectTasks = JSON.parse(projectTasksData);

    const updates: any[] = [];

    // Process each project
    for (const project of projects) {
      const projectTaskData = projectTasks.find((pt: any) => pt.projectId === project.projectId);
      
      if (!projectTaskData) continue;

      const tasks = projectTaskData.tasks || [];
      const totalTasks = tasks.length;
      const approvedTasks = tasks.filter((task: any) => task.status === 'Approved').length;
      const completedTasks = tasks.filter((task: any) => task.completed).length;
      const inReviewTasks = tasks.filter((task: any) => task.status === 'In review').length;
      const ongoingTasks = tasks.filter((task: any) => task.status === 'Ongoing').length;

      let newStatus = project.status;
      let shouldUpdate = false;

      if (approvedTasks === totalTasks && totalTasks > 0) {
        newStatus = 'Completed';
        shouldUpdate = project.status !== 'Completed';
      } else if (approvedTasks > 0 || inReviewTasks > 0 || ongoingTasks > 0) {
        newStatus = 'Ongoing';
        shouldUpdate = project.status !== 'Ongoing';
      } else if (totalTasks === 0 || (completedTasks === 0 && approvedTasks === 0)) {
        newStatus = 'Paused';
        shouldUpdate = project.status !== 'Paused';
      }

      const taskCountNeedsUpdate = project.totalTasks !== totalTasks;

      if (shouldUpdate || taskCountNeedsUpdate) {
        project.status = newStatus;
        project.totalTasks = totalTasks;

        updates.push({
          projectId: project.projectId,
          title: project.title,
          statusChanged: shouldUpdate,
          oldStatus: shouldUpdate ? projects.find((p: any) => p.projectId === project.projectId)?.status : project.status,
          newStatus,
          taskCountChanged: taskCountNeedsUpdate,
          oldTotalTasks: taskCountNeedsUpdate ? projects.find((p: any) => p.projectId === project.projectId)?.totalTasks : project.totalTasks,
          newTotalTasks: totalTasks,
          progress: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
        });
      }
    }

    if (updates.length > 0) {
      // Save updated projects
      await fs.writeFile(projectsPath, JSON.stringify(projects, null, 2));
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${updates.length} projects`,
      updates
    });

  } catch (error) {
    console.error('Error syncing all projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
