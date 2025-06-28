import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const filePath = path.join(process.cwd(), 'data', 'organizations.json');

export async function GET() {
  try {
    const data = await readFile(filePath, 'utf-8');
    const organizations = JSON.parse(data);

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error reading organizations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}