import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO: Implement gig request response logic
    return NextResponse.json({ message: 'Response recorded' });
  } catch (error) {
    console.error('Error responding to gig request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}