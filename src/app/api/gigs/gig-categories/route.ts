

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const CATEGORIES_PATH = path.join(process.cwd(), 'data/gigs/gig-categories.json');

export async function GET() {
  try {
    const raw = await readFile(CATEGORIES_PATH, 'utf-8');
    const categories = JSON.parse(raw);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to read gig categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || !body.id || !body.label || !Array.isArray(body.subcategories)) {
      return NextResponse.json({ error: 'Invalid category format' }, { status: 400 });
    }

    const raw = await readFile(CATEGORIES_PATH, 'utf-8');
    const categories = JSON.parse(raw);

    const exists = categories.some((cat: any) => cat.id === body.id);
    if (exists) {
      return NextResponse.json({ error: 'Category ID already exists' }, { status: 409 });
    }

    categories.push(body);
    await writeFile(CATEGORIES_PATH, JSON.stringify(categories, null, 2));

    return NextResponse.json({ success: true, newCategory: body });
  } catch (error) {
    console.error('Failed to write gig category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}