import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to manually trigger project completion notifications
 * This helps debug why completion notifications aren't being triggered automatically
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, action } = await request.json();

    if (!projectId || action !== 'test_completion') {
      return NextResponse.json(
        { error: 'Invalid request. Requires projectId and action=test_completion' },
        { status: 400 }
      );
    }

    console.log(`[test-completion] Testing completion notifications for project ${projectId}`);

    // Import the completion detection logic
    const { detectProjectCompletion } = await import('../../../lib/notifications/project-completion-detector');
    const { UnifiedStorageService } = await import('../../../lib/storage/unified-storage-service');
    const { sendProjectCompletionRatingNotifications } = await import('../../../lib/notifications/rating-notifications');

    // Check project completion status
    const completionStatus = await detectProjectCompletion(projectId);
    console.log(`[test-completion] Completion status:`, completionStatus);

    if (!completionStatus.isComplete) {
      return NextResponse.json({
        success: false,
        message: 'Project is not complete',
        completionStatus
      });
    }

    // Get project data
    const project = await UnifiedStorageService.getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.invoicingMethod !== 'milestone') {
      return NextResponse.json({
        success: false,
        message: 'Project is not milestone-based',
        invoicingMethod: project.invoicingMethod
      });
    }

    // Get user names
    let freelancerName = 'Freelancer';
    let commissionerName = 'Commissioner';

    try {
      if (project.freelancerId) {
        const freelancer = await UnifiedStorageService.getUserById(project.freelancerId);
        if (freelancer?.name) {
          freelancerName = freelancer.name;
        }
      }

      if (project.commissionerId) {
        const commissioner = await UnifiedStorageService.getUserById(project.commissionerId);
        if (commissioner?.name) {
          commissionerName = commissioner.name;
        }
      }
    } catch (userError) {
      console.warn('[test-completion] Could not fetch user names:', userError);
    }

    // Get the last completed task title
    const tasks = await UnifiedStorageService.listTasks(projectId);
    const lastApprovedTask = tasks
      .filter((task: any) => task.status === 'Approved' && task.completed)
      .sort((a: any, b: any) => new Date(b.approvedDate || 0).getTime() - new Date(a.approvedDate || 0).getTime())[0];

    const completedTaskTitle = lastApprovedTask?.title || 'Final Task';

    console.log(`[test-completion] Triggering completion notifications with:`, {
      projectId: project.projectId,
      projectTitle: project.title,
      freelancerId: project.freelancerId,
      freelancerName,
      commissionerId: project.commissionerId,
      commissionerName,
      completedTaskTitle
    });

    // Trigger the completion notifications
    // Note: sendProjectCompletionRatingNotifications expects numeric projectId
    // but our projects use string IDs like 'C-009'. We need to pass the string ID
    // and fix the function to handle string IDs properly.
    await sendProjectCompletionRatingNotifications({
      projectId: project.projectId, // Keep as string
      projectTitle: project.title || 'Untitled Project',
      freelancerId: project.freelancerId,
      freelancerName,
      commissionerId: project.commissionerId,
      commissionerName,
      completedTaskTitle
    });

    return NextResponse.json({
      success: true,
      message: 'Project completion notifications triggered successfully',
      projectId,
      completionStatus,
      userNames: { freelancerName, commissionerName },
      completedTaskTitle
    });

  } catch (error) {
    console.error('[test-completion] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
