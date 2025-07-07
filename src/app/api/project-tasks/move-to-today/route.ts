import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { taskIds, newDueDate } = await request.json();

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid taskIds provided' },
        { status: 400 }
      );
    }

    if (!newDueDate) {
      return NextResponse.json(
        { error: 'newDueDate is required' },
        { status: 400 }
      );
    }

    // Read the current project tasks
    const filePath = path.join(process.cwd(), 'data', 'project-tasks.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const projects = JSON.parse(fileContents);

    let updatedCount = 0;
    let newTodayCount = 0;
    let newUpcomingCount = 0;

    // Update the due dates for specified tasks
    projects.forEach((project: any) => {
      project.tasks.forEach((task: any) => {
        if (taskIds.includes(task.id)) {
          console.log(`Moving task ${task.id} (${task.title}) from ${task.dueDate} to ${newDueDate}`);
          task.dueDate = newDueDate;
          updatedCount++;
        }
      });
    });

    // Count tasks after update
    const today = new Date().toISOString().split('T')[0];
    projects.forEach((project: any) => {
      project.tasks.forEach((task: any) => {
        if (task.completed || task.status === 'In review') return;
        
        const taskDate = task.dueDate.split('T')[0];
        if (taskDate === today) {
          newTodayCount++;
        } else if (taskDate > today) {
          newUpcomingCount++;
        }
      });
    });

    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    console.log(`✅ Successfully moved ${updatedCount} tasks to today`);
    console.log(`📊 New counts - Today: ${newTodayCount}, Upcoming: ${newUpcomingCount}`);

    return NextResponse.json({
      success: true,
      message: `Successfully moved ${updatedCount} tasks to today`,
      updatedCount,
      newTodayCount,
      newUpcomingCount
    });

  } catch (error) {
    console.error('Error moving tasks to today:', error);
    return NextResponse.json(
      { error: 'Failed to move tasks to today' },
      { status: 500 }
    );
  }
}
