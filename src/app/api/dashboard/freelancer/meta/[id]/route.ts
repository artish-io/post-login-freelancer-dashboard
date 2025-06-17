import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const filePath = path.join(process.cwd(), 'data', 'freelancers.json');
    const data = await readFile(filePath, 'utf-8');
    const freelancers = JSON.parse(data);

    const freelancer = freelancers.find((f: any) => String(f.id) === id);

    if (!freelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    // Return a stripped-down meta object
    const meta = {
      id: freelancer.id,
      name: freelancer.name,
      title: freelancer.title,
      avatar: freelancer.avatar,
      availability: freelancer.availability,
      rating: freelancer.rating,
    };

    return NextResponse.json(meta);
  } catch (error) {
    console.error('Failed to fetch freelancer meta:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}