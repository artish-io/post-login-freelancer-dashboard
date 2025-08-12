import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { readProject } from '../../../../lib/projects-utils';
import { readProjectTasks } from '../../../../lib/project-tasks/hierarchical-storage';
import { writeJsonAtomic, fileExists } from '../../../../lib/fs-json';
import { ProjectRating, RatingSubmissionRequest, UserType } from '../../../../../types/ratings';
import { NotificationStorage } from '../../../../lib/notifications/notification-storage';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '../../../../lib/events/event-logger';
import { readJson } from '../../../../lib/fs-json';
import * as path from 'path';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raterUserId = Number(session.user.id);
    const raterUserType = (session.user as any).userType as UserType;

    if (!raterUserType || !['freelancer', 'commissioner'].includes(raterUserType)) {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
    }

    const body: RatingSubmissionRequest = await request.json();
    const { projectId, subjectUserId, subjectUserType, stars, comment } = body;

    // Validate input
    if (!projectId || !subjectUserId || !subjectUserType || !stars) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (![1, 2, 3, 4, 5].includes(stars)) {
      return NextResponse.json({ error: 'Stars must be between 1 and 5' }, { status: 400 });
    }

    if (!['freelancer', 'commissioner'].includes(subjectUserType)) {
      return NextResponse.json({ error: 'Invalid subject user type' }, { status: 400 });
    }

    // Prevent self-rating
    if (raterUserId === subjectUserId) {
      return NextResponse.json({ error: 'Cannot rate yourself' }, { status: 400 });
    }

    // Read project to validate existence and participants
    const project = await readProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate that both users are participants in the project
    const isRaterParticipant = project.commissionerId === raterUserId || project.freelancerId === raterUserId;
    const isSubjectParticipant = project.commissionerId === subjectUserId || project.freelancerId === subjectUserId;

    if (!isRaterParticipant || !isSubjectParticipant) {
      return NextResponse.json({ error: 'Users must be participants in the project' }, { status: 403 });
    }

    // Validate all milestones are completed (this determines if project is rateable)
    const tasks = await readProjectTasks(projectId);
    const allTasksCompleted = tasks.length > 0 && tasks.every(task => task.status === 'Approved' && task.completed);

    if (!allTasksCompleted) {
      return NextResponse.json({ error: 'All project milestones must be completed to rate' }, { status: 400 });
    }

    // Check if rating already exists
    const ratingPath = path.join(
      process.cwd(),
      'data',
      'projects',
      String(projectId),
      'ratings',
      subjectUserType,
      `rating-${raterUserId}.json`
    );

    if (await fileExists(ratingPath)) {
      return NextResponse.json({ error: 'ALREADY_RATED' }, { status: 409 });
    }

    // Create rating object
    const now = new Date().toISOString();
    const rating: ProjectRating = {
      projectId,
      subjectUserId,
      subjectUserType,
      raterUserId,
      raterUserType,
      stars,
      comment: comment || undefined,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    // Save rating atomically
    await writeJsonAtomic(ratingPath, rating);

    // Note: project details already available from earlier validation

    // Get rater name for notification
    let raterName = 'Someone';
    try {
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      const users = await readJson<any[]>(usersPath, []);
      const rater = users.find(u => u.id === raterUserId);
      if (rater) {
        raterName = rater.name;
      }
    } catch (error) {
      console.error('Error getting rater name:', error);
    }

    // Create notification event for the rated user
    const notificationEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'project_rating_submitted' as const,
      notificationType: NOTIFICATION_TYPES.PROJECT_RATING_RECEIVED,
      actorId: raterUserId,
      targetId: subjectUserId,
      entityType: ENTITY_TYPES.RATING,
      entityId: `${projectId}-${subjectUserId}-${raterUserId}`,
      context: {
        projectId: projectId,
      },
      metadata: {
        stars: stars,
        projectTitle: project.title,
        raterName: raterName,
        raterUserType: raterUserType,
        subjectUserType: subjectUserType,
        comment: comment
      }
    };

    // Add notification to storage
    try {
      NotificationStorage.addEvent(notificationEvent);
      console.log(`📝 Rating notification sent to user ${subjectUserId} for project ${projectId}`);
    } catch (error) {
      console.error('Error sending rating notification:', error);
      // Don't fail the rating submission if notification fails
    }

    return NextResponse.json({ ok: true, saved: rating });

  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
