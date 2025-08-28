import { NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { ok, err, ErrorCodes } from '@/lib/http/envelope';

/**
 * API endpoint to back-fill existing tasks with date separation fields
 * This migrates tasks that don't have the new task-level duration structure
 */
export async function POST(req: Request) {
  try {
    console.log('🔄 Starting task date migration...');
    
    // Get all existing projects to get their task lists
    const allProjects = await UnifiedStorageService.listProjects();
    console.log(`📊 Found ${allProjects.length} projects to check for tasks`);
    
    let totalTasks = 0;
    let tasksToMigrate = 0;
    let successCount = 0;
    let errorCount = 0;
    const migrationResults = [];
    
    for (const project of allProjects) {
      try {
        const tasks = await UnifiedStorageService.listTasks(project.projectId);
        totalTasks += tasks.length;
        
        for (const task of tasks) {
          // Check if task needs migration (missing new duration fields)
          if (!task.taskActivatedAt || !task.originalTaskDuration) {
            tasksToMigrate++;
            
            try {
              console.log(`🔄 Migrating task ${task.taskId} in project ${project.projectId}...`);
              
              // 🛡️ DURATION GUARD: Calculate task-level duration fields
              const taskActivatedAt = task.createdDate || project.createdAt || new Date().toISOString();
              
              // Calculate original task duration from project data
              let originalTaskDuration = {
                estimatedHours: 40, // Default fallback
                originalDueDate: task.dueDate
              };
              
              // Try to get duration info from project
              if (project.originalDuration?.estimatedHours) {
                // If project has multiple tasks, divide estimated hours
                const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
                const taskCount = projectTasks.length || 1;
                originalTaskDuration.estimatedHours = Math.round(project.originalDuration.estimatedHours / taskCount);
              } else if (project.estimatedHours) {
                // Use legacy field if available
                const projectTasks = await UnifiedStorageService.listTasks(project.projectId);
                const taskCount = projectTasks.length || 1;
                originalTaskDuration.estimatedHours = Math.round(project.estimatedHours / taskCount);
              }
              
              // Use project's original end date if available
              if (project.originalDuration?.originalEndDate) {
                originalTaskDuration.originalDueDate = project.originalDuration.originalEndDate;
              }
              
              // Calculate proper due date from task activation if we have project duration
              let newDueDate = task.dueDate;
              if (project.originalDuration?.deliveryTimeWeeks && project.originalDuration.deliveryTimeWeeks > 0) {
                const taskActivationDate = new Date(taskActivatedAt);
                const calculatedDueDate = new Date(taskActivationDate.getTime() + project.originalDuration.deliveryTimeWeeks * 7 * 24 * 60 * 60 * 1000);
                newDueDate = calculatedDueDate.toISOString();
                console.log(`  📅 Recalculated task due date from ${task.dueDate} to ${newDueDate}`);
              }
              
              // Create updated task with duration fields
              const updatedTask = {
                ...task,
                dueDate: newDueDate,
                
                // 🛡️ DURATION GUARD: Add task-level duration fields
                taskActivatedAt,
                originalTaskDuration,
                
                // Update modification timestamp
                lastModified: new Date().toISOString()
              };
              
              // Save the updated task
              await UnifiedStorageService.saveTask(updatedTask);
              
              migrationResults.push({
                taskId: task.taskId,
                projectId: project.projectId,
                status: 'success',
                changes: {
                  taskActivatedAt,
                  originalTaskDuration,
                  dueDateChanged: newDueDate !== task.dueDate,
                  oldDueDate: task.dueDate,
                  newDueDate
                }
              });
              
              successCount++;
              console.log(`  ✅ Successfully migrated task ${task.taskId}`);
              
            } catch (taskError: any) {
              console.error(`  ❌ Failed to migrate task ${task.taskId}:`, taskError);
              migrationResults.push({
                taskId: task.taskId,
                projectId: project.projectId,
                status: 'error',
                error: taskError.message
              });
              errorCount++;
            }
          }
        }
        
      } catch (projectError: any) {
        console.error(`❌ Failed to process tasks for project ${project.projectId}:`, projectError);
      }
    }
    
    console.log(`✅ Task migration completed: ${successCount} successful, ${errorCount} failed`);
    console.log(`📊 Total tasks: ${totalTasks}, Tasks migrated: ${tasksToMigrate}`);
    
    return NextResponse.json(ok({
      entities: {
        totalTasks,
        tasksToMigrate,
        migratedCount: successCount,
        errorCount,
        results: migrationResults
      },
      message: `Task migration completed: ${successCount} tasks migrated successfully, ${errorCount} failed`
    }));
    
  } catch (error: any) {
    console.error('❌ Task migration failed:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, `Task migration failed: ${error.message}`, 500),
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check task migration status
 */
export async function GET() {
  try {
    const allProjects = await UnifiedStorageService.listProjects();
    
    let totalTasks = 0;
    let tasksWithNewFields = 0;
    let tasksNeedingMigration = 0;
    const tasksNeedingMigrationList = [];
    
    for (const project of allProjects) {
      try {
        const tasks = await UnifiedStorageService.listTasks(project.projectId);
        totalTasks += tasks.length;
        
        for (const task of tasks) {
          if (task.taskActivatedAt && task.originalTaskDuration) {
            tasksWithNewFields++;
          } else {
            tasksNeedingMigration++;
            tasksNeedingMigrationList.push({
              taskId: task.taskId,
              projectId: project.projectId,
              createdDate: task.createdDate,
              dueDate: task.dueDate
            });
          }
        }
      } catch (error) {
        console.error(`Error checking tasks for project ${project.projectId}:`, error);
      }
    }
    
    return NextResponse.json(ok({
      entities: {
        totalTasks,
        tasksWithNewFields,
        tasksNeedingMigration,
        migrationNeeded: tasksNeedingMigration > 0,
        tasksNeedingMigrationList: tasksNeedingMigrationList.slice(0, 10) // Limit to first 10 for readability
      },
      message: 'Task migration status check completed'
    }));
    
  } catch (error: any) {
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, `Failed to check task migration status: ${error.message}`, 500),
      { status: 500 }
    );
  }
}
