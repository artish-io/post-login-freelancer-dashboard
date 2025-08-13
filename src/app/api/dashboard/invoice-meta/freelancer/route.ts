// src/app/api/dashboard/invoice-meta/freelancer/route.ts

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    const [freelancer, user] = await Promise.all([
      import('@/lib/storage/unified-storage-service').then(m => m.getFreelancerById(id)),
      import('@/lib/storage/unified-storage-service').then(async m => {
        const freelancerData = await m.getFreelancerById(id);
        return freelancerData ? await m.getUserById(freelancerData.userId) : null;
      })
    ]);

    if (!freelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: freelancer.id,
      name: user.name,
      title: user.title,
      avatar: user.avatar,
      rate: freelancer.rate,
    });
  } catch (error) {
    console.error('Failed to fetch freelancer meta:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}