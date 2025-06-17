// src/app/api/dashboard/invoice-meta/freelancer/route.ts

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    const filePath = path.join(process.cwd(), 'data', 'freelancers.json');
    const data = await readFile(filePath, 'utf-8');
    const freelancers = JSON.parse(data);
    const freelancer = freelancers.find((f: any) => String(f.id) === id);

    if (!freelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: freelancer.id,
      name: freelancer.name,
      title: freelancer.title,
      avatar: freelancer.avatar,
      rate: freelancer.rate,
    });
  } catch (error) {
    console.error('Failed to fetch freelancer meta:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}