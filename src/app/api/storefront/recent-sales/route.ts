

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');
const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');

export async function GET() {
  try {
    const [salesRaw, productsRaw, usersRaw] = await Promise.all([
      readFile(SALES_PATH, 'utf-8'),
      readFile(PRODUCTS_PATH, 'utf-8'),
      readFile(USERS_PATH, 'utf-8')
    ]);

    const sales = JSON.parse(salesRaw);
    const products = JSON.parse(productsRaw);
    const users = JSON.parse(usersRaw).filter((u: any) => u.type === 'freelancer');

    const result = sales.map((sale: any) => {
      const product = products.find((p: any) => p.id === sale.productId);
      const buyer = users[Math.floor(Math.random() * users.length)];

      return {
        productId: sale.productId,
        productName: product?.title || 'Unknown Product',
        buyerName: buyer?.name || 'Anonymous',
        date: sale.date,
        status: 'Delivered'
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load recent sales' }, { status: 500 });
  }
}