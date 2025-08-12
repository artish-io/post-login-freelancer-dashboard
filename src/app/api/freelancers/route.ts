import { NextResponse } from 'next/server';
import { readAllFreelancers } from '@/lib/freelancers-utils';

export async function GET() {
  try {
    const freelancers = await readAllFreelancers();
    return NextResponse.json(freelancers);
  } catch (error) {
    console.error('Error reading freelancers data:', error);
    return NextResponse.json(
      { error: 'Failed to load freelancers' },
      { status: 500 }
    );
  }
}
