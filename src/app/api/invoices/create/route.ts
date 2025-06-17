import { NextResponse } from 'next/server';

type InvoicePayload = {
  freelancerId: number;
  commissionerId: number;
  projectTitle: string;
  tasks: {
    description: string;
    rate: number;
  }[];
  summary: string;
  total: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as InvoicePayload;

    if (
      !body.freelancerId ||
      !body.commissionerId ||
      !body.projectTitle ||
      !body.tasks?.length ||
      typeof body.total !== 'number'
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Simulate saving to database
    console.log('[invoice:create]', body);

    return NextResponse.json({ message: 'Invoice created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}