import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { readJson, fileExists } from '@/lib/fs-json';
import { 
  ProjectRating, 
  UserRatingsSummary,
  isValidProjectRating 
} from '../../../../../types/ratings';
import path from 'path';
import { promises as fs } from 'fs';

type ApiError = {
  success: false;
  code: 'UNAUTHORIZED' | 'INVALID_INPUT' | 'USER_NOT_FOUND' | 'STORAGE_ERROR';
  message: string;
  details?: unknown;
};

type ApiSuccess = {
  success: true;
  summary: UserRatingsSummary;
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const userTypeParam = searchParams.get('userType');

    if (!userIdParam || !userTypeParam) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Missing required query parameters: userId, userType'
      }, { status: 400 });
    }

    const userId = Number(userIdParam);
    const userType = userTypeParam as 'freelancer' | 'commissioner';

    if (isNaN(userId) || !['freelancer', 'commissioner'].includes(userType)) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid userId or userType'
      }, { status: 400 });
    }

    // Verify user exists
    const userExists = await verifyUserExists(userId, userType);
    if (!userExists) {
      return NextResponse.json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }, { status: 404 });
    }

    // Collect all ratings for this user
    const ratings = await collectUserRatings(userId, userType);

    // Enrich ratings with project context
    const enrichedRatings = await enrichRatingsWithProjectContext(ratings);

    // Calculate summary
    const summary: UserRatingsSummary = {
      userId,
      userType,
      averageRating: calculateAverageRating(enrichedRatings),
      totalRatings: enrichedRatings.length,
      ratings: enrichedRatings,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      summary,
      message: 'User ratings retrieved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error retrieving user ratings:', error);
    return NextResponse.json({
      success: false,
      code: 'STORAGE_ERROR',
      message: 'Failed to retrieve user ratings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Verify that a user exists in the system
 */
async function verifyUserExists(userId: number, userType: 'freelancer' | 'commissioner'): Promise<boolean> {
  try {
    // Use UnifiedStorageService to get all users from hierarchical structure
    const users = await UnifiedStorageService.getAllUsers();

    return users.some((user: any) =>
      user.id === userId && user.type === userType
    );
  } catch (error) {
    console.error('Error verifying user:', error);
    return false;
  }
}

/**
 * Collect all ratings for a specific user across all projects
 */
async function collectUserRatings(userId: number, userType: 'freelancer' | 'commissioner'): Promise<ProjectRating[]> {
  const ratings: ProjectRating[] = [];
  
  try {
    // Get all projects from the hierarchical storage
    const projectsBasePath = path.join(process.cwd(), 'data', 'projects');

    // Check if projects directory exists
    if (!(await fileExists(projectsBasePath))) {
      return ratings;
    }

    // First, check for flat structure (legacy ratings)
    await checkFlatStructureRatings(projectsBasePath, userId, userType, ratings);

    // Then walk through the hierarchical structure
    const years = await fs.readdir(projectsBasePath, { withFileTypes: true });
    
    for (const year of years) {
      if (!year.isDirectory() || year.name === 'metadata') continue;
      
      const yearPath = path.join(projectsBasePath, year.name);
      const months = await fs.readdir(yearPath, { withFileTypes: true });
      
      for (const month of months) {
        if (!month.isDirectory()) continue;
        
        const monthPath = path.join(yearPath, month.name);
        const days = await fs.readdir(monthPath, { withFileTypes: true });
        
        for (const day of days) {
          if (!day.isDirectory()) continue;
          
          const dayPath = path.join(monthPath, day.name);
          const projects = await fs.readdir(dayPath, { withFileTypes: true });
          
          for (const project of projects) {
            if (!project.isDirectory()) continue;
            
            const projectId = project.name;
            // Skip if project name is empty or invalid
            if (!projectId || projectId.startsWith('.')) continue;
            
            // Check for ratings directory
            const ratingsPath = path.join(dayPath, project.name, 'ratings', userType);
            
            if (await fileExists(ratingsPath)) {
              try {
                const ratingFiles = await fs.readdir(ratingsPath);
                
                for (const ratingFile of ratingFiles) {
                  if (!ratingFile.endsWith('.json')) continue;
                  
                  const ratingFilePath = path.join(ratingsPath, ratingFile);
                  const rating = await readJson(ratingFilePath, null);
                  
                  if (rating && isValidProjectRating(rating) && rating.subjectUserId === userId) {
                    ratings.push(rating);
                  }
                }
              } catch (error) {
                console.warn(`Error reading ratings for project ${projectId}:`, error);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error collecting user ratings:', error);
  }
  
  return ratings;
}

/**
 * Check for ratings in the flat structure (legacy format)
 */
async function checkFlatStructureRatings(
  projectsBasePath: string,
  userId: number,
  userType: 'freelancer' | 'commissioner',
  ratings: ProjectRating[]
): Promise<void> {
  try {
    const entries = await fs.readdir(projectsBasePath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hierarchical directories (year folders) and metadata
      if (!entry.isDirectory() || /^\d{4}$/.test(entry.name) || entry.name === 'metadata') {
        continue;
      }

      const projectId = entry.name;
      // Skip if project name is empty or invalid
      if (!projectId || projectId.startsWith('.')) continue;

      // Check for ratings in flat structure
      const ratingsPath = path.join(projectsBasePath, entry.name, 'ratings', userType);

      if (await fileExists(ratingsPath)) {
        try {
          const ratingFiles = await fs.readdir(ratingsPath);

          for (const ratingFile of ratingFiles) {
            if (!ratingFile.endsWith('.json')) continue;

            const ratingFilePath = path.join(ratingsPath, ratingFile);
            const rating = await readJson(ratingFilePath, null);

            if (rating && isValidProjectRating(rating) && rating.subjectUserId === userId) {
              ratings.push(rating);
            }
          }
        } catch (error) {
          console.warn(`Error reading flat structure ratings from ${ratingsPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Error checking flat structure ratings:', error);
  }
}

/**
 * Enrich ratings with project context (title, organization logo)
 */
async function enrichRatingsWithProjectContext(ratings: ProjectRating[]): Promise<ProjectRating[]> {
  const enrichedRatings: ProjectRating[] = [];
  
  for (const rating of ratings) {
    try {
      const project = await UnifiedStorageService.readProject(rating.projectId);
      
      const enrichedRating: ProjectRating = {
        ...rating,
        projectTitle: project?.title || rating.projectTitle || 'Unknown Project',
        organizationLogoUrl: rating.organizationLogoUrl // Keep existing or undefined
      };
      
      enrichedRatings.push(enrichedRating);
    } catch (error) {
      console.warn(`Error enriching rating for project ${rating.projectId}:`, error);
      enrichedRatings.push(rating); // Include original rating if enrichment fails
    }
  }
  
  return enrichedRatings;
}

/**
 * Calculate average rating with proper rounding
 */
function calculateAverageRating(ratings: ProjectRating[]): number {
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((total, rating) => total + rating.rating, 0);
  const average = sum / ratings.length;
  
  return Math.round(average * 10) / 10; // Round to 1 decimal place
}
