// src/app/api/dashboard/freelancer-rating/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const freelancerIdParam = searchParams.get('freelancerId');

  if (!freelancerIdParam) {
    return NextResponse.json({ error: 'Missing freelancerId' }, { status: 400 });
  }

  const freelancerId = Number(freelancerIdParam);
  if (isNaN(freelancerId)) {
    return NextResponse.json({ error: 'Invalid freelancerId' }, { status: 400 });
  }

  try {
    const { getFreelancerById } = await import('@/lib/storage/unified-storage-service');
    const freelancer = await getFreelancerById(freelancerId);

    if (!freelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    const rating = freelancer.rating ?? 0;
    const trend = 1.78; // You can make this dynamic later if needed

    return NextResponse.json({ rating, trend });
  } catch (error) {
    console.error('[freelancer-rating] Failed to load freelancer data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}