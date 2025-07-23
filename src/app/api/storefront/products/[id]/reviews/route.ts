

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const REVIEWS_PATH = path.join(process.cwd(), 'data', 'storefront', 'reviews.json');

/**
 * GET /api/storefront/products/[id]/reviews
 * Returns all reviews for a specific product.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const raw = await readFile(REVIEWS_PATH, 'utf-8');
    const reviews = JSON.parse(raw);

    const productId = `#${id}`;
    const productReviews = reviews.filter((r: any) => r.productId === productId);

    return NextResponse.json(productReviews);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to load reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storefront/products/[id]/reviews
 * Body: { userId: number, rating: number, comment?: string }
 * If the user has already rated this product, overwrite the rating.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { userId, rating, comment = '' } = body;

    if (!userId || typeof rating !== 'number') {
      return NextResponse.json(
        { error: 'userId and rating are required' },
        { status: 400 }
      );
    }

    const raw = await readFile(REVIEWS_PATH, 'utf-8');
    const reviews = JSON.parse(raw);

    const productId = `#${id}`;

    // overwrite if same user already reviewed
    const existingIndex = reviews.findIndex(
      (r: any) => r.productId === productId && r.userId === userId
    );

    const newEntry = {
      productId,
      userId,
      rating,
      comment,
      date: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      reviews[existingIndex] = newEntry;
    } else {
      reviews.push(newEntry);
    }

    await writeFile(REVIEWS_PATH, JSON.stringify(reviews, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to save review' },
      { status: 500 }
    );
  }
}