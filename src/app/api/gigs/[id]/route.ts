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

    // Enrich with default invoicing method for older gigs that don't have it
    const enrichedGig = {
      ...gig,
      invoicingMethod: gig.invoicingMethod || 'completion'
    };

    return NextResponse.json(enrichedGig);
  } catch (error) {
    console.error('Error fetching gig:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gig' },
      { status: 500 }
    );
  }
}
