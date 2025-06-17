// src/app/api/dashboard/invoice-meta/clients/route.ts

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'users.json');
    const data = await readFile(filePath, 'utf-8');
    const users = JSON.parse(data);
    const commissioners = users.filter((u: any) => u.type === 'commissioner');

    return NextResponse.json(commissioners);
  } catch (error) {
    console.error('Failed to load commissioners:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}