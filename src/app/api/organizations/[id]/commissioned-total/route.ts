import { NextResponse } from 'next/server';
import { getCommissionedTotalSync } from '../../../../../lib/utils/getCommissionedTotal';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
    }

    const total = getCommissionedTotalSync(organizationId);

    return NextResponse.json({ 
      organizationId,
      totalCommissioned: total 
    });
  } catch (error) {
    console.error('Failed to calculate commissioned total:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
