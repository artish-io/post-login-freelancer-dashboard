import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readJson, fileExists } from '@/lib/fs-json';
import { 
  ProjectRating, 
  RatingExistsResponse,
  getRatingStoragePath,
  isValidProjectRating 
} from '../../../../../types/ratings';
import path from 'path';

type ApiError = {
  success: false;
  code: 'UNAUTHORIZED' | 'INVALID_INPUT' | 'STORAGE_ERROR';
  message: string;
  details?: unknown;
};

type ApiSuccess = {
  success: true;
  data: RatingExistsResponse;
  message: string;
};

export async function GET(request: NextRequest): Promise<NextResponse<ApiError | ApiSuccess>> {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('projectId');
    const subjectUserIdParam = searchParams.get('subjectUserId');
    const subjectUserTypeParam = searchParams.get('subjectUserType');

    if (!projectIdParam || !subjectUserIdParam || !subjectUserTypeParam) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Missing required query parameters: projectId, subjectUserId, subjectUserType'
      }, { status: 400 });
    }

    const projectId = Number(projectIdParam);
    const subjectUserId = Number(subjectUserIdParam);
    const subjectUserType = subjectUserTypeParam as 'freelancer' | 'commissioner';

    if (isNaN(projectId) || isNaN(subjectUserId)) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid projectId or subjectUserId'
      }, { status: 400 });
    }

    if (!['freelancer', 'commissioner'].includes(subjectUserType)) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'subjectUserType must be "freelancer" or "commissioner"'
      }, { status: 400 });
    }

    // Check if rating exists
    const ratingPath = getRatingStoragePath(projectId, subjectUserType, raterUserId);
    const fullRatingPath = path.join(process.cwd(), ratingPath);
    
    const exists = await fileExists(fullRatingPath);
    
    let existingRating: ProjectRating | undefined;
    
    if (exists) {
      try {
        const ratingData = await readJson(fullRatingPath, null);
        
        if (ratingData && isValidProjectRating(ratingData)) {
          existingRating = ratingData;
        }
      } catch (error) {
        console.warn(`Error reading existing rating from ${fullRatingPath}:`, error);
        // File exists but is corrupted, treat as non-existent
      }
    }

    const response: RatingExistsResponse = {
      exists: exists && !!existingRating,
      existingRating
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: exists ? 'Rating exists' : 'Rating does not exist'
    }, { status: 200 });

  } catch (error) {
    console.error('Error checking rating existence:', error);
    return NextResponse.json({
      success: false,
      code: 'STORAGE_ERROR',
      message: 'Failed to check rating existence',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
