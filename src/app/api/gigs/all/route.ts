import { NextResponse } from 'next/server';
import { readAllGigs } from '@/lib/gigs/hierarchical-storage';

export async function GET() {
  try {
    // Get all gigs regardless of status (for internal use)
    const gigs = await readAllGigs();
    return NextResponse.json(gigs);
  } catch (error) {
    console.error('Error reading all gigs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
