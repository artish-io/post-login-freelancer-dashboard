

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'sales-sources.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET() {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = parseInt(session.user.id);

    // Check if user has any products
    const productsRaw = await readFile(PRODUCTS_PATH, 'utf-8');
    const products = JSON.parse(productsRaw);
    const userHasProducts = products.some((product: any) => product.authorId === currentUserId);

    // If user has no products, return empty sales sources
    if (!userHasProducts) {
      return NextResponse.json([{ direct: 0, affiliate: 0, email: 0, others: 0 }]);
    }

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