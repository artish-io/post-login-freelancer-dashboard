import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

    // Return a stripped-down meta object
    const meta = {
      id: freelancer.id,
      name: user.name,
      title: user.title,
      avatar: user.avatar,
      availability: freelancer.availability,
      rating: freelancer.rating,
    };

    return NextResponse.json(meta);
  } catch (error) {
    console.error('Failed to fetch freelancer meta:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}