// src/app/api/gigs/create/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { saveGig, getNextGigId, type Gig } from '../../../../lib/gigs/hierarchical-storage';

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

    // Get next available gig ID
    const nextGigId = await getNextGigId();

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

    // Set the gig ID and posted date
    gigData.id = nextGigId;
    gigData.postedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Save the gig using hierarchical storage
    await saveGig(gigData as Gig);

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
