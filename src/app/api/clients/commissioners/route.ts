import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/storage/unified-storage-service';

export async function GET() {
  try {
    const users = await getAllUsers(); // Use hierarchical storage
    const commissioners = users.filter((user: any) => user.type === 'commissioner');

    return NextResponse.json(commissioners);
  } catch (error) {
    console.error('Failed to fetch commissioners:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}