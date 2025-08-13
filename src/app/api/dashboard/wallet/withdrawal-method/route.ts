import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFreelancerByUserId, writeFreelancer } from '@/lib/storage/unified-storage-service';

// GET: Fetch user's withdrawal method from freelancer record
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await getFreelancerByUserId(userId);

    if (!user) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    return NextResponse.json({ method: user.withdrawalMethod || 'bank_transfer' });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch withdrawal method.' },
      { status: 500 }
    );
  }
}

// POST: Update user's withdrawal method
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { method } = body;

    if (!['bank_transfer', 'paypal'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid method. Must be bank_transfer or paypal.' },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id);
    const freelancer = await getFreelancerByUserId(userId);

    if (!freelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    freelancer.withdrawalMethod = method;
    await writeFreelancer(freelancer);
    return NextResponse.json({ success: true, method });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update withdrawal method.' },
      { status: 500 }
    );
  }
}