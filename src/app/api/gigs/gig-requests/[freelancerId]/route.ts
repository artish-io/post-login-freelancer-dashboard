

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const REQUESTS_PATH = path.join(process.cwd(), 'data/gigs/gig-requests.json');

export async function GET(
  _req: Request,
  { params }: { params: { freelancerId: string } }
) {
  const freelancerId = Number(params.freelancerId);

  try {
    const raw = await readFile(REQUESTS_PATH, 'utf-8');
    const requests = JSON.parse(raw);

    const filtered = requests.filter((r: any) => r.freelancerId === freelancerId);

    const grouped = {
      available: [] as any[],
      pending: [] as any[],
      accepted: [] as any[],
      rejected: [] as any[],
      unknown: [] as any[],
    };

    for (const req of filtered) {
      const status = (req.status || 'unknown').toLowerCase();

      if (status === 'available') {
        grouped.available.push(req);
      } else if (status === 'pending' || status === 'applied' || status === 'accepted') {
        grouped.pending.push(req);
      } else if (status === 'rejected') {
        grouped.rejected.push(req);
      } else {
        grouped.unknown.push(req);
      }
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error reading gig requests:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}