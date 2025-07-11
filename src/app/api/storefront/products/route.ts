

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');
const CATEGORY_PATH = path.join(process.cwd(), 'data', 'storefront', 'categories.json');
const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');

export async function GET() {
  try {
    const [productsRaw, categoriesRaw, salesRaw] = await Promise.all([
      readFile(FILE_PATH, 'utf-8'),
      readFile(CATEGORY_PATH, 'utf-8'),
      readFile(UNIT_SALES_PATH, 'utf-8'),
    ]);

    const products = JSON.parse(productsRaw);
    const categories = JSON.parse(categoriesRaw);
    const sales = JSON.parse(salesRaw);

    // Transform products to match the expected interface
    const transformed = products.map((p: any) => {
      const category = categories.find((c: any) => c.id === p.category || c.name === p.category);

      // Calculate real units sold from sales data
      const productSales = sales.filter((sale: any) => sale.productId === p.id);
      const unitsSold = productSales.length;

      return {
        id: p.id,
        subtitle: p.title,
        categoryName: category?.name || p.category,
        status: p.status.toLowerCase(), // Convert "Approved" to "approved"
        amount: p.price,
        unitsSold: unitsSold, // Real data from sales
        releaseDate: new Date().toISOString() // Mock release date
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}