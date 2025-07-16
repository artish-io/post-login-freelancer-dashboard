

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const CHART_DATA_PATH = path.join(process.cwd(), 'data', 'storefront', 'revenue-chart.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET(req: Request) {
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

    // If user has no products, return empty chart data
    if (!userHasProducts) {
      return NextResponse.json({ current: [], previous: [] });
    }

    const url = new URL(req.url || '');
    const range = url.searchParams.get('range') || 'week';

    const fileContent = await readFile(CHART_DATA_PATH, 'utf-8');
    const chartData = JSON.parse(fileContent);

    if (!Array.isArray(chartData)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 500 });
    }

    const filtered = chartData.filter(item => item.range === range);
    return NextResponse.json(filtered[0] || { current: [], previous: [] });
  } catch (error) {
    console.error('[GET /api/storefront/revenue-chart] Error:', error);
    return NextResponse.json({ error: 'Failed to load chart data' }, { status: 500 });
  }
}