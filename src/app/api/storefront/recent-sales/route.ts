

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllUsers } from '@/lib/storage/unified-storage-service';

const SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET() {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = parseInt(session.user.id);

    const [salesRaw, productsRaw, users] = await Promise.all([
      readFile(SALES_PATH, 'utf-8'),
      readFile(PRODUCTS_PATH, 'utf-8'),
      getAllUsers()
    ]);

    const sales = JSON.parse(salesRaw);
    const products = JSON.parse(productsRaw);
    const freelancerUsers = users.filter((u: any) => u.userType === 'freelancer' || u.type === 'freelancer');

    // Get user's products
    const userProducts = products.filter((p: any) => p.authorId === currentUserId);
    const userProductIds = userProducts.map((p: any) => p.id);

    // Filter sales to only include user's products
    const userSales = sales.filter((sale: any) => userProductIds.includes(sale.productId));

    const result = userSales.map((sale: any) => {
      const product = userProducts.find((p: any) => p.id === sale.productId);
      const buyer = freelancerUsers[Math.floor(Math.random() * freelancerUsers.length)];

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