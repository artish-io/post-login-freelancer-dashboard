import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { updateSummary } from '@/lib/storefront/updateSummary';
import type { StoreSummary } from '@/types/storefront';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET(req: Request) {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = parseInt(session.user.id);

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    // Read products data to get user's products
    const productsRaw = await readFile(PRODUCTS_PATH, 'utf-8');
    const products = JSON.parse(productsRaw);

    // Get product IDs for current user
    const userProductIds = products
      .filter((product: any) => product.authorId === currentUserId)
      .map((product: any) => product.id);

    // Read unit sales data
    const unitSalesRaw = await readFile(UNIT_SALES_PATH, 'utf-8');
    const unitSales = JSON.parse(unitSalesRaw);

    // Filter sales by user's products and date range
    const filteredSales = unitSales.filter((sale: any) => {
      // Only include sales for current user's products
      if (!userProductIds.includes(sale.productId)) return false;

      const saleDate = new Date(sale.date);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });

    // Calculate total revenue (amount is already the revenue per sale)
    const totalRevenue = filteredSales.reduce((sum: number, sale: any) => {
      return sum + sale.amount;
    }, 0);

    // Calculate total orders (number of sales)
    const totalOrders = filteredSales.length;

    const summary: StoreSummary = {
      revenue: totalRevenue,
      revenueChange: 0.0, // Replace with real comparison logic later
      growthRate: 0.0,    // Placeholder for actual growth tracking
      growthChange: 0.0,
      orders: totalOrders,
      ordersChange: 0.0
    };

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: StoreSummary = await req.json();
    await updateSummary(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update summary' }, { status: 500 });
  }
}