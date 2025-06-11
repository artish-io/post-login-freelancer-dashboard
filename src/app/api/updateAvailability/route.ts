// src/app/api/updateAvailability/route.ts
import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

type AvailabilityStatus = 'Available' | 'Away' | 'Busy';

interface UpdateRequest {
  id: string;
  status: AvailabilityStatus;
}

export async function POST(request: Request) {
  try {
    const body: UpdateRequest = await request.json();

    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    if (!['Available', 'Away', 'Busy'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', 'freelancers.json');
    const data = await readFile(filePath, 'utf-8');
    const freelancers = JSON.parse(data);

    const index = freelancers.findIndex((f: any) => String(f.id) === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    freelancers[index].availability = body.status;

    await writeFile(filePath, JSON.stringify(freelancers, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Availability updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}