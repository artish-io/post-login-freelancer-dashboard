import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commissionerId = searchParams.get('commissionerId');

    if (!commissionerId) {
      return NextResponse.json(
        { error: 'Commissioner ID is required' },
        { status: 400 }
      );
    }

    // Read data files
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectTasksPath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const organizationsPath = path.join(process.cwd(), 'data', 'organizations.json');

    const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    const projectTasksData = JSON.parse(fs.readFileSync(projectTasksPath, 'utf8'));
    const organizationsData = JSON.parse(fs.readFileSync(organizationsPath, 'utf8'));

    // Find the organization for this commissioner
    const organization = organizationsData.find((org: any) => 
      org.contactPersonId === parseInt(commissionerId)
    );

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found for this commissioner' },
        { status: 404 }
      );
    }

    // Filter projects for this organization
    const organizationProjects = projectsData.filter((project: any) => 
      project.organizationId === organization.id
    );

    // Calculate active projects (status: "Active", "Ongoing", "At risk", "Delayed")
    const activeStatuses = ["Active", "Ongoing", "At risk", "Delayed"];
    const activeProjects = organizationProjects.filter((project: any) => 
      activeStatuses.includes(project.status)
    );

    // Calculate total projects
    const totalProjects = organizationProjects.length;

    // Calculate tasks awaiting review for this commissioner's projects
    // Only count tasks from ongoing projects (exclude Completed/Paused)
    const ongoingProjects = organizationProjects.filter((project: any) =>
      !['Completed', 'Paused'].includes(project.status)
    );
    const ongoingProjectIds = ongoingProjects.map((p: any) => p.projectId);
    const ongoingProjectTasks = projectTasksData.filter((projectTask: any) =>
      ongoingProjectIds.includes(projectTask.projectId)
    );

    // Count tasks with status "In review" that haven't been reviewed yet (feedbackCount = 0)
    let tasksAwaitingReview = 0;
    ongoingProjectTasks.forEach((projectTask: any) => {
      if (projectTask.tasks) {
        const reviewTasks = projectTask.tasks.filter((task: any) =>
          task.status === "In review" && task.feedbackCount === 0
        );
        tasksAwaitingReview += reviewTasks.length;
      }
    });

    // Calculate monthly change in commissioned projects based on actual data
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get previous month
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Count active projects from current month
    const currentMonthProjects = activeProjects.filter(project => {
      const createdDate = new Date(project.createdAt);
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    }).length;

    // Count active projects from previous month
    const previousMonthProjects = activeProjects.filter(project => {
      const createdDate = new Date(project.createdAt);
      return createdDate.getMonth() === previousMonth && createdDate.getFullYear() === previousYear;
    }).length;

    // Calculate percentage change
    let monthlyChangePercentage = 0;
    let changeDirection: 'up' | 'down' = 'up';

    if (previousMonthProjects > 0) {
      monthlyChangePercentage = ((currentMonthProjects - previousMonthProjects) / previousMonthProjects) * 100;
      changeDirection = monthlyChangePercentage >= 0 ? 'up' : 'down';
    } else if (currentMonthProjects > 0) {
      // If no previous month data but current month has projects, show 100% increase
      monthlyChangePercentage = 100;
      changeDirection = 'up';
    }

    const changeValue = monthlyChangePercentage === 0 ? '0%' :
      `${changeDirection === 'up' ? '+' : ''}${Math.abs(monthlyChangePercentage).toFixed(1)}%`;

    return NextResponse.json({
      activeProjects: activeProjects.length,
      totalProjects: totalProjects,
      tasksAwaitingReview: tasksAwaitingReview,
      monthlyChange: {
        value: changeValue,
        direction: changeDirection,
        percentage: monthlyChangePercentage
      },
      organizationId: organization.id,
      organizationName: organization.name
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error calculating commissioner stats:', error);
    return NextResponse.json(
      { error: 'Failed to calculate commissioner stats' },
      { status: 500 }
    );
  }
}
