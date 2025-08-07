import { NextResponse } from 'next/server';
import { checkCommissionerMessagePermission } from '@/lib/message-permissions';

export async function POST(request: Request) {
  try {
    const { commissionerId, freelancerId } = await request.json();

    if (!commissionerId || !freelancerId) {
      return NextResponse.json(
        { error: 'Missing commissionerId or freelancerId' },
        { status: 400 }
      );
    }

    const permission = await checkCommissionerMessagePermission(
      parseInt(commissionerId),
      parseInt(freelancerId)
    );

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error checking message permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
