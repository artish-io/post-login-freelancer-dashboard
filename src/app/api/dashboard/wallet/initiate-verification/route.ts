import { NextResponse } from 'next/server';

// TEMP: Replace with session-based auth or secure token later
const MOCK_USER_ID = 31;

export async function POST(req: Request) {
  try {
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
      userId: MOCK_USER_ID,
      method,
      redirectUrl,
      message: `Redirect user to ${method} verification page.`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate verification.' }, { status: 500 });
  }
}