import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

/**
 * API endpoint to automatically update project status when all tasks are approved
 * This ensures data consistency between project-tasks.json and projects.json
 */
export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Read data files
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');

    const [projectsFile, projectTasksFile] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readFile(projectTasksPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsFile);
    const projectTasks = JSON.parse(projectTasksFile);

    // Find the project and its tasks
    const project = projects.find((p: any) => p.projectId === projectId);
    const taskProject = projectTasks.find((pt: any) => pt.projectId === projectId);

    if (!project || !taskProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if all tasks are approved
    const allTasksApproved = taskProject.tasks.every((task: any) => task.status === 'Approved');
    const hasApprovedTasks = taskProject.tasks.some((task: any) => task.status === 'Approved');

    let newStatus = project.status;
    let statusChanged = false;

    if (allTasksApproved && project.status !== 'Completed') {
      newStatus = 'Completed';
      statusChanged = true;
    } else if (hasApprovedTasks && project.status === 'Ongoing') {
      newStatus = 'Active';
      statusChanged = true;
    }

    if (statusChanged) {
      // Update project status
      const updatedProjects = projects.map((p: any) => 
        p.projectId === projectId ? { ...p, status: newStatus } : p
      );

      // Write updated projects back to file
      await writeFile(projectsPath, JSON.stringify(updatedProjects, null, 2));

      console.log(`✅ Auto-completed: Project ${projectId} status updated from "${project.status}" to "${newStatus}"`);

      return NextResponse.json({
        success: true,
        projectId,
        oldStatus: project.status,
        newStatus,
        allTasksApproved,
        totalTasks: taskProject.tasks.length,
        approvedTasks: taskProject.tasks.filter((t: any) => t.status === 'Approved').length
      });
    }

    return NextResponse.json({
      success: true,
      projectId,
      status: project.status,
      message: 'No status change needed',
      allTasksApproved,
      totalTasks: taskProject.tasks.length,
      approvedTasks: taskProject.tasks.filter((t: any) => t.status === 'Approved').length
    });

  } catch (error) {
    console.error('Auto-completion error:', error);
    return NextResponse.json({ error: 'Failed to auto-complete project' }, { status: 500 });
  }
}

/**
 * GET endpoint to check which projects need auto-completion
 */
export async function GET() {
  try {
    // Read data files
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');

    const [projectsFile, projectTasksFile] = await Promise.all([
      readFile(projectsPath, 'utf-8'),
      readFile(projectTasksPath, 'utf-8')
    ]);

    const projects = JSON.parse(projectsFile);
    const projectTasks = JSON.parse(projectTasksFile);

    const inconsistencies = [];

    projectTasks.forEach((taskProject: any) => {
      const project = projects.find((p: any) => p.projectId === taskProject.projectId);
      
      if (project) {
        const approvedTasks = taskProject.tasks.filter((t: any) => t.status === 'Approved').length;
        const totalTasks = taskProject.tasks.length;
        const allTasksApproved = approvedTasks === totalTasks;

        if (allTasksApproved && project.status !== 'Completed') {
          inconsistencies.push({
            projectId: project.projectId,
            title: project.title,
            currentStatus: project.status,
            recommendedStatus: 'Completed',
            approvedTasks,
            totalTasks,
            issue: 'All tasks approved but project not completed'
          });
        } else if (approvedTasks > 0 && project.status === 'Ongoing') {
          inconsistencies.push({
            projectId: project.projectId,
            title: project.title,
            currentStatus: project.status,
            recommendedStatus: 'Active',
            approvedTasks,
            totalTasks,
            issue: 'Has approved tasks but project still ongoing'
          });
        }
      }
    });

    return NextResponse.json({
      inconsistencies,
      totalProjects: projects.length,
      projectsNeedingUpdate: inconsistencies.length
    });

  } catch (error) {
    console.error('Auto-completion check error:', error);
    return NextResponse.json({ error: 'Failed to check auto-completion' }, { status: 500 });
  }
}
