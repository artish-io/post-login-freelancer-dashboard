

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const PRODUCT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET() {
  try {
    const [unitSalesRaw, productSalesRaw] = await Promise.all([
      readFile(UNIT_SALES_PATH, 'utf-8'),
      readFile(PRODUCT_SALES_PATH, 'utf-8')
    ]);

    const unitSales = JSON.parse(unitSalesRaw);
    const productSales = JSON.parse(productSalesRaw);

    const countMap: Record<string, number> = {};
    let totalSales = 0;

    for (const sale of unitSales) {
      countMap[sale.productId] = (countMap[sale.productId] || 0) + 1;
      totalSales += 1;
    }

    const topProducts = Object.entries(countMap)
      .map(([productId, count]) => {
        const product = productSales.find((p: any) => p.id === productId);
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