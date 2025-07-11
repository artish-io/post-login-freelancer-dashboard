

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'sales-sources.json');

export async function GET() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load sales sources' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const newData = await req.json();
    await writeFile(FILE_PATH, JSON.stringify(newData, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save sales sources' }, { status: 500 });
  }
}