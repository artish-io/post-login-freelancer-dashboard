import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { readJson } from '../../../../lib/fs-json';
import { ProjectRating, RatingExistsResponse, UserType } from '../../../../../types/ratings';
import * as path from 'path';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raterUserId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const subjectUserId = searchParams.get('subjectUserId');
    const subjectUserType = searchParams.get('subjectUserType') as UserType;

    if (!projectId || !subjectUserId || !subjectUserType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!['freelancer', 'commissioner'].includes(subjectUserType)) {
      return NextResponse.json({ error: 'Invalid subjectUserType' }, { status: 400 });
    }

    // Check if rating exists
    const ratingPath = path.join(
      process.cwd(),
      'data',
      'projects',
      projectId,
      'ratings',
      subjectUserType,
      `rating-${raterUserId}.json`
    );

    try {
      const rating = await readJson<ProjectRating>(ratingPath, null);
      
      const response: RatingExistsResponse = {
        exists: rating !== null,
        rating: rating || undefined
      };

      return NextResponse.json(response);
    } catch (error) {
      // File doesn't exist or can't be read
      const response: RatingExistsResponse = {
        exists: false
      };

      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('Error checking rating existence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
