import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const FREELANCERS_PATH = path.join(process.cwd(), 'data/freelancers.json');

// TEMP: Replace this with actual session-based userId once auth is wired
const MOCK_USER_ID = 31;

// GET: Fetch user's withdrawal method from freelancer record
export async function GET() {
  try {
    const raw = await readFile(FREELANCERS_PATH, 'utf-8');
    const freelancers = JSON.parse(raw);
    const user = freelancers.find((f: any) => f.id === MOCK_USER_ID);

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
    const body = await req.json();
    const { method } = body;

    if (!['bank_transfer', 'paypal'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid method. Must be bank_transfer or paypal.' },
        { status: 400 }
      );
    }

    const raw = await readFile(FREELANCERS_PATH, 'utf-8');
    const freelancers = JSON.parse(raw);

    const index = freelancers.findIndex((f: any) => f.id === MOCK_USER_ID);
    if (index === -1) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    freelancers[index].withdrawalMethod = method;

    await writeFile(FREELANCERS_PATH, JSON.stringify(freelancers, null, 2), 'utf-8');
    return NextResponse.json({ success: true, method });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update withdrawal method.' },
      { status: 500 }
    );
  }
}