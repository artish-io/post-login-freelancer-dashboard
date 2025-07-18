import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const CATEGORIES_PATH = path.join(process.cwd(), 'data/gigs/gig-categories.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryLabel = searchParams.get('category');

    if (!categoryLabel) {
      return NextResponse.json({ error: 'Category parameter is required' }, { status: 400 });
    }

    const raw = await readFile(CATEGORIES_PATH, 'utf-8');
    const categories = JSON.parse(raw);

    // Find the category by label (case-insensitive)
    const category = categories.find((cat: any) => 
      cat.label.toLowerCase() === categoryLabel.toLowerCase()
    );

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({
      category: category.label,
      subcategories: category.subcategories
    });

  } catch (error) {
    console.error('Failed to read gig categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
