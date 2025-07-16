

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const PRODUCT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET() {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = parseInt(session.user.id);

    const [unitSalesRaw, productSalesRaw] = await Promise.all([
      readFile(UNIT_SALES_PATH, 'utf-8'),
      readFile(PRODUCT_SALES_PATH, 'utf-8')
    ]);

    const unitSales = JSON.parse(unitSalesRaw);
    const productSales = JSON.parse(productSalesRaw);

    // Filter products by current user
    const userProducts = productSales.filter((p: any) => p.authorId === currentUserId);
    const userProductIds = userProducts.map((p: any) => p.id);

    // Filter sales to only include user's products
    const userSales = unitSales.filter((sale: any) => userProductIds.includes(sale.productId));

    const countMap: Record<string, number> = {};
    let totalSales = 0;

    for (const sale of userSales) {
      countMap[sale.productId] = (countMap[sale.productId] || 0) + 1;
      totalSales += 1;
    }

    const topProducts = Object.entries(countMap)
      .map(([productId, count]) => {
        const product = userProducts.find((p: any) => p.id === productId);
        return {
          name: product?.title || 'Unknown Product',
          percentage: parseFloat(((count / totalSales) * 100).toFixed(2))
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    return NextResponse.json(topProducts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load top products' }, { status: 500 });
  }
}