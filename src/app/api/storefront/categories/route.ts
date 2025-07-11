

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'categories.json');

export async function GET() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}