import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'users.json');
    const data = await readFile(filePath, 'utf-8');
    const users = JSON.parse(data);

    const commissioners = users.filter((user: any) => user.type === 'commissioner');

    return NextResponse.json(commissioners);
  } catch (error) {
    console.error('Failed to fetch commissioners:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}