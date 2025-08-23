import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { writeJsonAtomic, readJson, fileExists } from '@/lib/fs-json';
import {
  ProjectRating,
  RatingSubmissionRequest,
  generateRatingId,
  getRatingStoragePath,
  getHierarchicalRatingStoragePath,
  isValidProjectRating
} from '../../../../../types/ratings';
import path from 'path';

type ApiError = {
  success: false;
  code: 'UNAUTHORIZED' | 'INVALID_INPUT' | 'PROJECT_NOT_FOUND' | 'PROJECT_NOT_COMPLETED' | 'NOT_PARTICIPANT' | 'RATING_EXISTS' | 'STORAGE_ERROR';
  message: string;
  details?: unknown;
};

type ApiSuccess = {
  success: true;
  rating: ProjectRating;
  message: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<ApiError | ApiSuccess>> {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }, { status: 401 });
    }

    const raterUserId = Number(session.user.id);
    const raterUserType = (session.user as any).userType as 'freelancer' | 'commissioner';

    // Validate rater user type
    if (!raterUserType || !['freelancer', 'commissioner'].includes(raterUserType)) {
      return NextResponse.json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Invalid user type in session'
      }, { status: 401 });
    }

    // Parse request body
    let body: RatingSubmissionRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { projectId: rawProjectId, subjectUserId: rawSubjectUserId, subjectUserType, rating: rawRating, comment } = body;

    // Validate input
    if (!rawProjectId || !rawSubjectUserId || !subjectUserType || rawRating === undefined || rawRating === null) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Missing required fields: projectId, subjectUserId, subjectUserType, rating'
      }, { status: 400 });
    }

    // Handle projectId as string or number (support both formats)
    const projectId = rawProjectId; // Keep as-is, UnifiedStorageService handles both
    const subjectUserId = Number(rawSubjectUserId);
    const rating = Number(rawRating);

    if (isNaN(subjectUserId)) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'subjectUserId must be a valid number'
      }, { status: 400 });
    }

    if (isNaN(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Rating must be an integer between 1 and 5'
      }, { status: 400 });
    }

    if (!['freelancer', 'commissioner'].includes(subjectUserType)) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'subjectUserType must be "freelancer" or "commissioner"'
      }, { status: 400 });
    }

    // Validate comment for low ratings
    if (rating <= 2 && (!comment || comment.trim().length === 0)) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Comment is required for ratings of 2 stars or below'
      }, { status: 400 });
    }

    // Check if project exists
    const project = await UnifiedStorageService.readProject(projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found'
      }, { status: 404 });
    }

    // Check if project is completed
    if (project.status?.toLowerCase() !== 'completed') {
      return NextResponse.json({
        success: false,
        code: 'PROJECT_NOT_COMPLETED',
        message: 'Project must be completed to rate'
      }, { status: 400 });
    }

    // Check if all milestones are complete
    const tasks = await UnifiedStorageService.listTasks(projectId);
    const allTasksComplete = tasks.length > 0 && tasks.every(task => 
      task.completed === true && task.status === 'Approved'
    );

    if (!allTasksComplete) {
      return NextResponse.json({
        success: false,
        code: 'PROJECT_NOT_COMPLETED',
        message: 'All project milestones must be completed and approved to rate'
      }, { status: 400 });
    }

    // Check if user is a participant
    const isParticipant = project.freelancerId === raterUserId || project.commissionerId === raterUserId;
    if (!isParticipant) {
      return NextResponse.json({
        success: false,
        code: 'NOT_PARTICIPANT',
        message: 'Only project participants can submit ratings'
      }, { status: 403 });
    }

    // Check if rating already exists - use hierarchical storage path
    const ratingPath = getHierarchicalRatingStoragePath(projectId, project.createdAt, subjectUserType, raterUserId);
    const fullRatingPath = path.join(process.cwd(), ratingPath);
    
    if (await fileExists(fullRatingPath)) {
      return NextResponse.json({
        success: false,
        code: 'RATING_EXISTS',
        message: 'You have already rated this user for this project'
      }, { status: 409 });
    }

    // Create rating object
    const newRating: ProjectRating = {
      ratingId: generateRatingId(projectId, raterUserId, subjectUserId),
      projectId,
      raterUserId,
      raterUserType,
      subjectUserId,
      subjectUserType,
      rating,
      comment: comment?.trim() || undefined,
      createdAt: new Date().toISOString(),
      projectTitle: project.title,
      organizationLogoUrl: undefined // Will be enriched later if needed
    };

    // Validate rating structure
    if (!isValidProjectRating(newRating)) {
      console.error('Rating validation failed for:', JSON.stringify(newRating, null, 2));
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid rating data structure',
        details: {
          receivedData: newRating,
          validationChecks: {
            hasRatingId: typeof newRating.ratingId === 'string',
            hasProjectId: typeof newRating.projectId === 'number' || typeof newRating.projectId === 'string',
            hasRaterUserId: typeof newRating.raterUserId === 'number',
            hasValidRaterUserType: ['freelancer', 'commissioner'].includes(newRating.raterUserType),
            hasSubjectUserId: typeof newRating.subjectUserId === 'number',
            hasValidSubjectUserType: ['freelancer', 'commissioner'].includes(newRating.subjectUserType),
            hasValidRating: typeof newRating.rating === 'number' && newRating.rating >= 1 && newRating.rating <= 5,
            hasCreatedAt: typeof newRating.createdAt === 'string',
            hasValidComment: newRating.comment === undefined || typeof newRating.comment === 'string',
            hasValidProjectTitle: newRating.projectTitle === undefined || typeof newRating.projectTitle === 'string',
            hasValidOrgLogoUrl: newRating.organizationLogoUrl === undefined || typeof newRating.organizationLogoUrl === 'string'
          }
        }
      }, { status: 400 });
    }

    // Save rating atomically
    await writeJsonAtomic(fullRatingPath, newRating);

    return NextResponse.json({
      success: true,
      rating: newRating,
      message: 'Rating submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json({
      success: false,
      code: 'STORAGE_ERROR',
      message: 'Failed to submit rating',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
