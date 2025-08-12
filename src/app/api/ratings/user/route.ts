import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { readAllProjects } from '../../../../lib/projects-utils';
import { readJson } from '../../../../lib/fs-json';
import { ProjectRating, UserRatingsSummary, UserType } from '../../../../../types/ratings';
import * as path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType') as UserType;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId || !userType) {
      return NextResponse.json({ error: 'Missing userId or userType' }, { status: 400 });
    }

    if (!['freelancer', 'commissioner'].includes(userType)) {
      return NextResponse.json({ error: 'Invalid userType' }, { status: 400 });
    }

    const targetUserId = Number(userId);

    // Get all projects involving the user
    const allProjects = await readAllProjects();
    const userProjects = allProjects.filter(project => 
      project.commissionerId === targetUserId || project.freelancerId === targetUserId
    );

    const ratings: ProjectRating[] = [];

    // Scan each project for ratings where the user is the subject
    for (const project of userProjects) {
      const ratingsDir = path.join(
        process.cwd(),
        'data',
        'projects',
        String(project.projectId),
        'ratings',
        userType
      );

      try {
        // Check if ratings directory exists
        await fs.access(ratingsDir);
        const ratingFiles = await fs.readdir(ratingsDir);

        for (const file of ratingFiles) {
          if (file.endsWith('.json') && file.startsWith('rating-')) {
            const ratingPath = path.join(ratingsDir, file);
            try {
              const rating = await readJson<ProjectRating>(ratingPath, null);
              if (rating && rating.subjectUserId === targetUserId) {
                ratings.push(rating);
              }
            } catch (error) {
              console.warn(`Failed to read rating file ${ratingPath}:`, error);
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
        continue;
      }
    }

    // Sort by creation date (newest first)
    ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const paginatedRatings = ratings.slice(offset, offset + limit);

    // Calculate average
    const average = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length 
      : 0;

    const summary: UserRatingsSummary = {
      ratings: paginatedRatings,
      average: Math.round(average * 10) / 10, // Round to 1 decimal place
      count: ratings.length
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error fetching user ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
