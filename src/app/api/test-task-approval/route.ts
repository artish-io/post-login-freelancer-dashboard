import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  console.log('🧪 Test task approval endpoint called');
  
  try {
    // Test session
    const session = await getServerSession(authOptions);
    console.log('🔐 Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      userType: (session?.user as any)?.userType
    });
    
    if (!session?.user?.id) {
      console.error('❌ No session or user ID found');
      return NextResponse.json({ 
        success: false, 
        error: 'UNAUTHORIZED',
        message: 'No session found'
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { taskId, projectId, action } = body;
    
    if (!taskId || !action) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Missing taskId or action'
      }, { status: 400 });
    }
    
    // Actually update the task data to test the refresh mechanism
    console.log('⏳ Actually updating task data...');

    try {
      // Import the storage service
      const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');

      // Get the task
      const task = await UnifiedStorageService.getTaskById(Number(taskId));
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      console.log('📋 Found task:', { id: task.taskId, status: task.status, title: task.title });

      // Update task status to approved
      const updatedTask = {
        ...task,
        status: 'Approved' as const,
        completed: true,
        rejected: false,
        approvedDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // Save the updated task
      await UnifiedStorageService.saveTask(updatedTask);

      console.log('✅ Task updated successfully:', {
        id: updatedTask.taskId,
        status: updatedTask.status,
        completed: updatedTask.completed
      });

      return NextResponse.json({
        success: true,
        message: `Task ${taskId} ${action} successful`,
        userId: session.user.id,
        userType: (session.user as any)?.userType,
        data: {
          taskId,
          projectId,
          action,
          timestamp: new Date().toISOString(),
          taskUpdated: true,
          newStatus: updatedTask.status
        }
      });

    } catch (updateError) {
      console.error('❌ Error updating task:', updateError);
      return NextResponse.json({
        success: false,
        error: 'TASK_UPDATE_FAILED',
        message: updateError instanceof Error ? updateError.message : 'Failed to update task'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Test task approval error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
