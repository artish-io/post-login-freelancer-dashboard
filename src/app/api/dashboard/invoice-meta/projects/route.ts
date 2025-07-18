// src/app/api/dashboard/invoice-meta/projects/route.ts

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const freelancerId = Number(searchParams.get('freelancerId'));
  const commissionerId = searchParams.get('commissionerId') ? Number(searchParams.get('commissionerId')) : null;

  if (!freelancerId) {
    return NextResponse.json({ error: 'Missing freelancerId' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'projects.json');
    const fileData = await readFile(filePath, 'utf-8');
    const allProjects = JSON.parse(fileData);

    let filtered = allProjects.filter((p: any) => p.freelancerId === freelancerId);

    // If commissionerId is provided, further filter by commissioner
    if (commissionerId) {
      filtered = filtered.filter((p: any) => p.commissionerId === commissionerId);
    }

    const result = filtered.map((p: any) => ({
      projectId: p.projectId,
      title: p.title
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[invoice-meta/projects] Failed:', error);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}