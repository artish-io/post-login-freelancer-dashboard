import { NextResponse } from 'next/server';
import { readAllGigRequests } from '../../../../../lib/gigs/gig-request-storage';

export async function GET() {
  try {
    const requests = await readAllGigRequests();

    const grouped = {
      available: [] as any[],
      pending: [] as any[],
      accepted: [] as any[],
      rejected: [] as any[],
      unknown: [] as any[],
    };

    for (const req of requests) {
      const status = (req.status || 'unknown').toLowerCase();

      if (status === 'available') {
        grouped.available.push(req);
      } else if (status === 'pending' || status === 'applied') {
        grouped.pending.push(req);
      } else if (status === 'accepted') {
        grouped.accepted.push(req);
      } else if (status === 'rejected') {
        grouped.rejected.push(req);
      } else {
        grouped.unknown.push(req);
      }
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error reading gig requests:', error);
    return NextResponse.json(
      { error: 'Failed to load gig requests' },
      { status: 500 }
    );
  }
}
