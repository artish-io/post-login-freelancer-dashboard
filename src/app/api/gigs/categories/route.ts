import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const categoriesPath = path.join(process.cwd(), 'data', 'gigs', 'gig-categories.json');
    const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
    
    return NextResponse.json(categoriesData);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
