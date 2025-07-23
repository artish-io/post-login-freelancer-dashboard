import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { method } = body;

    if (!['bank_transfer', 'paypal'].includes(method)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }

    // In production: call external API like Paystack/Stripe here
    const redirectUrl = method === 'paypal'
      ? 'https://www.sandbox.paypal.com/connect/mock-verification'
      : 'https://paystack.com/mock-onboarding';

    return NextResponse.json({
      success: true,
      userId: session.user.id,
      method,
      redirectUrl,
      message: `Redirect user to ${method} verification page.`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate verification.' }, { status: 500 });
  }
}