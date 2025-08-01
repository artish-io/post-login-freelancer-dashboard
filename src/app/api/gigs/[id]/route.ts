import { NextResponse } from 'next/server';
import { readGig } from '../../../../lib/gigs/hierarchical-storage';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const gig = await readGig(parseInt(id));

    if (!gig) {
      return NextResponse.json(
        { error: 'Gig not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(gig);
  } catch (error) {
    console.error('Error fetching gig:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gig' },
      { status: 500 }
    );
  }
}
