// src/app/api/updateAvailability/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

type AvailabilityStatus = 'Available' | 'Away' | 'Busy';

interface UpdateRequest {
  id: string;
  status: AvailabilityStatus;
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateRequest = await request.json();

    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    // Users can only update their own availability
    if (session.user.id !== body.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['Available', 'Away', 'Busy'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', 'freelancers.json');
    const data = await readFile(filePath, 'utf-8');
    const freelancers = JSON.parse(data);

    const index = freelancers.findIndex((f: any) => String(f.userId) === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    freelancers[index].availability = body.status;

    await writeFile(filePath, JSON.stringify(freelancers, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Availability updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}