// src/app/api/dashboard/invoice-meta/clients/route.ts

import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/storage/unified-storage-service';

export async function GET() {
  try {
    const users = await getAllUsers(); // Use hierarchical storage
    const commissioners = users.filter((u: any) => u.type === 'commissioner');

    return NextResponse.json(commissioners);
  } catch (error) {
    console.error('Failed to load commissioners:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}