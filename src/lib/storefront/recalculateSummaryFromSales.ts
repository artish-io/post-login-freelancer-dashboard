// src/lib/storefront/recalculateSummaryFromSales.ts
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const SUMMARY_PATH = path.join(process.cwd(), 'data', 'storefront', 'summary.json');

export async function recalculateSummaryFromSales() {
  const raw = await readFile(UNIT_SALES_PATH, 'utf-8');
  const sales = JSON.parse(raw);

  const totalRevenue = sales.reduce((sum: number, sale: any) => sum + sale.amount, 0);
  const totalOrders = sales.length;

  const summary = {
    revenue: totalRevenue,
    revenueChange: -0.56, // Optional: calculate based on past week
    growthRate: 30.1,
    growthChange: 1.48,
    orders: totalOrders,
    ordersChange: 1.78
  };

  await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2));
}