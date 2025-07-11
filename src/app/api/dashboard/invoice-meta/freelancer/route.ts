// src/app/api/dashboard/invoice-meta/freelancer/route.ts

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    const freelancersPath = path.join(process.cwd(), 'data', 'freelancers.json');
    const usersPath = path.join(process.cwd(), 'data', 'users.json');

    const [freelancersData, usersData] = await Promise.all([
      readFile(freelancersPath, 'utf-8'),
      readFile(usersPath, 'utf-8')
    ]);

    const freelancers = JSON.parse(freelancersData);
    const users = JSON.parse(usersData);

    const freelancer = freelancers.find((f: any) => String(f.id) === id);
    if (!freelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    const user = users.find((u: any) => u.id === freelancer.userId);
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