import { NextResponse } from 'next/server';
import { getAllFreelancers } from '@/lib/storage/unified-storage-service';

export async function GET() {
  try {
    const freelancers = await getAllFreelancers();
    return NextResponse.json(freelancers || []);
  } catch (error) {
    console.error('Error fetching freelancers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch freelancers' },
      { status: 500 }
    );
  }
}
