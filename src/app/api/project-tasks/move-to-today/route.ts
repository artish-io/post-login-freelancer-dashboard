import { NextRequest, NextResponse } from 'next/server';
import { readAllTasks, moveTaskToNewDate } from '../../../../lib/project-tasks/hierarchical-storage';

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

    // Read all tasks to find the ones we need to move
    const allTasks = await readAllTasks();
    const tasksToMove = allTasks.filter(task => taskIds.includes(task.taskId));

    if (tasksToMove.length === 0) {
      return NextResponse.json(
        { error: 'No matching tasks found' },
        { status: 404 }
      );
    }

    let updatedCount = 0;
    const movePromises = [];

    // Move each task to the new due date
    for (const task of tasksToMove) {
      console.log(`Moving task ${task.taskId} (${task.title}) from ${task.dueDate} to ${newDueDate}`);

      const movePromise = moveTaskToNewDate(task.dueDate, newDueDate, task.projectId, task.taskId);
      movePromises.push(movePromise);
    }

    // Wait for all moves to complete
    const moveResults = await Promise.all(movePromises);
    updatedCount = moveResults.filter(result => result).length;

    // Count tasks after update by reading all tasks again
    const updatedAllTasks = await readAllTasks();
    const today = new Date().toISOString().split('T')[0];

    let newTodayCount = 0;
    let newUpcomingCount = 0;

    updatedAllTasks.forEach((task) => {
      if (task.completed || task.status === 'In review') return;

      const taskDate = task.dueDate.split('T')[0];
      if (taskDate === today) {
        newTodayCount++;
      } else if (taskDate > today) {
        newUpcomingCount++;
      }
    });

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
