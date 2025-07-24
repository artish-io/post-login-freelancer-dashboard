import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const root = process.cwd();
    const gigsPath = path.join(root, 'data', 'gigs', 'gigs.json');
    
    const gigsData = await readFile(gigsPath, 'utf8');
    const gigs = JSON.parse(gigsData);
    
    const gig = gigs.find((g: any) => g.id === parseInt(id));
    
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
