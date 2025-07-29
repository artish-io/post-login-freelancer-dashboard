// src/app/api/gigs/create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gigData } = await req.json();
    
    if (!gigData) {
      return NextResponse.json({ error: 'Missing gig data' }, { status: 400 });
    }

    // Read existing gigs
    const gigsPath = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');
    const gigsFile = await fs.promises.readFile(gigsPath, 'utf-8');
    const gigs = JSON.parse(gigsFile);

    // Add commissioner ID from session
    const userId = parseInt(session.user.id);
    gigData.commissionerId = userId;

    // Find the user's organization
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const usersFile = await fs.promises.readFile(usersPath, 'utf-8');
    const users = JSON.parse(usersFile);
    const user = users.find((u: any) => u.id === userId);
    
    if (user && user.organizationId) {
      gigData.organizationId = user.organizationId;
    }

    // Generate unique ID
    const maxId = Math.max(...gigs.map((g: any) => g.id), 0);
    gigData.id = maxId + 1;

    // Add the new gig
    gigs.unshift(gigData); // Add to beginning of array

    // Write back to file
    await fs.promises.writeFile(gigsPath, JSON.stringify(gigs, null, 2));

    return NextResponse.json({ 
      success: true, 
      gigId: gigData.id,
      message: 'Gig created successfully' 
    });

  } catch (error) {
    console.error('[CREATE_GIG_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
