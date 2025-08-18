/**
 * Rating Notification Service
 * 
 * Handles sending rating prompt notifications when projects are completed
 */

import { NotificationStorage } from './notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '../events/event-logger';
import { UnifiedStorageService } from '../storage/unified-storage-service';

// Use rating notification types from event logger
export const RATING_NOTIFICATION_TYPES = {
  RATING_PROMPT_FREELANCER: NOTIFICATION_TYPES.RATING_PROMPT_FREELANCER,
  RATING_PROMPT_COMMISSIONER: NOTIFICATION_TYPES.RATING_PROMPT_COMMISSIONER,
} as const;

export interface RatingNotificationParams {
  projectId: number;
  projectTitle: string;
  freelancerId: number;
  freelancerName: string;
  commissionerId: number;
  commissionerName: string;
  completedTaskTitle: string;
}

/**
 * Send rating prompt notifications to both freelancer and commissioner
 * when a project is completed
 */
export async function sendProjectCompletionRatingNotifications(
  params: RatingNotificationParams
): Promise<void> {
  const {
    projectId,
    projectTitle,
    freelancerId,
    freelancerName,
    commissionerId,
    commissionerName,
    completedTaskTitle
  } = params;

  try {
    // Verify this is actually a milestone-based project
    const { UnifiedStorageService } = await import('../storage/unified-storage-service');
    const project = await UnifiedStorageService.getProjectById(projectId);

    if (!project || project.invoicingMethod !== 'milestone') {
      console.log(`ℹ️ Skipping rating notifications for non-milestone project ${projectId}`);
      return;
    }

    const timestamp = new Date().toISOString();
    // Send notification to freelancer to rate commissioner
    const freelancerNotification = {
      id: `rating_prompt_freelancer_${projectId}_${Date.now()}`,
      timestamp,
      type: 'rating_prompt_freelancer' as const,
      notificationType: RATING_NOTIFICATION_TYPES.RATING_PROMPT_FREELANCER,
      actorId: commissionerId, // Commissioner approved all tasks
      targetId: freelancerId, // Freelancer should rate
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        commissionerName,
        completedTaskTitle,
        message: `All tasks for ${projectTitle} have been approved. Click here to rate your collaboration with ${commissionerName}.`,
        ratingSubjectId: commissionerId,
        ratingSubjectType: 'commissioner',
        priority: 'high'
      },
      context: {
        projectId,
        ratingSubjectUserId: commissionerId,
        ratingSubjectUserType: 'commissioner',
        action: 'rate_commissioner'
      }
    };

    // Send notification to commissioner to rate freelancer
    const commissionerNotification = {
      id: `rating_prompt_commissioner_${projectId}_${Date.now() + 1}`,
      timestamp,
      type: 'rating_prompt_commissioner' as const,
      notificationType: RATING_NOTIFICATION_TYPES.RATING_PROMPT_COMMISSIONER,
      actorId: freelancerId, // Freelancer completed the work
      targetId: commissionerId, // Commissioner should rate
      entityType: ENTITY_TYPES.PROJECT,
      entityId: projectId.toString(),
      metadata: {
        projectTitle,
        freelancerName,
        completedTaskTitle,
        message: `You have approved all task milestones for ${projectTitle}. Click here to rate ${freelancerName} for their work on this project. Your rating improves the experience of other project managers on ARTISH.`,
        ratingSubjectId: freelancerId,
        ratingSubjectType: 'freelancer',
        priority: 'high'
      },
      context: {
        projectId,
        ratingSubjectUserId: freelancerId,
        ratingSubjectUserType: 'freelancer',
        action: 'rate_freelancer'
      }
    };

    // Add both notifications to storage
    NotificationStorage.addEvent(freelancerNotification);
    NotificationStorage.addEvent(commissionerNotification);

    console.log(`✅ Sent milestone project completion rating notifications for project ${projectId}`);
    console.log(`   → Freelancer ${freelancerId} prompted to rate commissioner ${commissionerId}`);
    console.log(`   → Commissioner ${commissionerId} prompted to rate freelancer ${freelancerId}`);

  } catch (error) {
    console.error(`❌ Error sending rating notifications for project ${projectId}:`, error);
    // Don't throw - rating notifications are not critical to the main flow
  }
}

/**
 * Check if a project is completed and eligible for rating notifications
 */
export async function checkProjectCompletionForRating(projectId: number): Promise<{
  isCompleted: boolean;
  allTasksApproved: boolean;
  projectData?: any;
}> {
  try {
    // Get project data
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return { isCompleted: false, allTasksApproved: false };
    }

    // Get all tasks for the project
    const tasks = await UnifiedStorageService.listTasks(projectId);
    if (tasks.length === 0) {
      return { isCompleted: false, allTasksApproved: false, projectData: project };
    }

    // Check if all tasks are approved and completed
    const allTasksApproved = tasks.every(task => 
      task.completed === true && task.status === 'Approved'
    );

    // Project is completed if all tasks are approved
    const isCompleted = allTasksApproved;

    return {
      isCompleted,
      allTasksApproved,
      projectData: project
    };

  } catch (error) {
    console.error(`Error checking project completion for rating (project ${projectId}):`, error);
    return { isCompleted: false, allTasksApproved: false };
  }
}

/**
 * Get user names for rating notifications
 */
export async function getUserNamesForRating(freelancerId: number, commissionerId: number): Promise<{
  freelancerName: string;
  commissionerName: string;
}> {
  try {
    // Fetch users individually instead of loading all users for better performance
    const [freelancer, commissioner] = await Promise.all([
      UnifiedStorageService.getUserById(freelancerId),
      UnifiedStorageService.getUserById(commissionerId)
    ]);

    return {
      freelancerName: freelancer?.name || 'Unknown Freelancer',
      commissionerName: commissioner?.name || 'Unknown Commissioner'
    };
  } catch (error) {
    console.error('Error getting user names for rating:', error);
    return {
      freelancerName: 'Unknown Freelancer',
      commissionerName: 'Unknown Commissioner'
    };
  }
}
