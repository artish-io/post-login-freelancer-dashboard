import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  parseISO,
  subDays,
  subYears,
  startOfMonth,
  startOfYear,
  isAfter,
  isBefore,
  format,
  getYear,
  getMonth,
} from 'date-fns';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data/storefront/unit-sales.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data/storefront/products.json');

type SalesTransaction = {
  productId: string;
  date: string;
  amount: number;
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commissionerId = parseInt(session.user.id);
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || 'month';

    // Read products to get user's product IDs
    const productsRaw = await readFile(PRODUCTS_PATH, 'utf-8');
    const products = JSON.parse(productsRaw);
    const userProductIds = products
      .filter((product: any) => product.authorId === commissionerId)
      .map((product: any) => product.id);

    // If user has no products, return empty data
    if (userProductIds.length === 0) {
      return NextResponse.json({
        range,
        currentTotal: 0,
        lastWeekTotal: 0,
        previousTotal: 0,
        monthlyGrowthPercent: 0,
        dailyBreakdown: [],
        hasProducts: false
      });
    }

    // Read sales data
    const salesRaw = await readFile(UNIT_SALES_PATH, 'utf-8');
    const allSales: SalesTransaction[] = JSON.parse(salesRaw);

    // Filter sales by user's products
    const userSales = allSales.filter(sale => userProductIds.includes(sale.productId));

    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    // Calculate date ranges based on the range parameter
    switch (range) {
      case 'month':
        fromDate = startOfMonth(now);
        break;
      case 'year':
        fromDate = startOfYear(now);
        break;
      case 'all':
        fromDate = new Date('2020-01-01');
        break;
      case 'january':
      case 'february':
      case 'march':
      case 'april':
      case 'may':
      case 'june':
      case 'july':
      case 'august':
      case 'september':
      case 'october':
      case 'november':
      case 'december':
        const monthIndex = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ].indexOf(range);
        fromDate = new Date(getYear(now), monthIndex, 1);
        toDate = new Date(getYear(now), monthIndex + 1, 0);
        break;
      default:
        fromDate = startOfMonth(now);
    }

    // Filter sales by date range
    const filtered = userSales.filter((sale) => {
      const saleDate = parseISO(sale.date);
      return isAfter(saleDate, fromDate) && isBefore(saleDate, toDate);
    });

    // Calculate current total revenue
    const currentTotal = filtered.reduce((sum, sale) => sum + sale.amount, 0);

    // Calculate last week total for comparison
    const lastWeekStart = subDays(now, 7);
    const lastWeekFiltered = userSales.filter((sale) => {
      const saleDate = parseISO(sale.date);
      return isAfter(saleDate, lastWeekStart) && isBefore(saleDate, now);
    });
    const lastWeekTotal = lastWeekFiltered.reduce((sum, sale) => sum + sale.amount, 0);

    // Calculate previous period total for growth calculation
    const previousPeriodStart = range === 'month' 
      ? startOfMonth(subDays(fromDate, 1))
      : subYears(fromDate, 1);
    const previousPeriodEnd = fromDate;
    
    const previousFiltered = userSales.filter((sale) => {
      const saleDate = parseISO(sale.date);
      return isAfter(saleDate, previousPeriodStart) && isBefore(saleDate, previousPeriodEnd);
    });
    const previousTotal = previousFiltered.reduce((sum, sale) => sum + sale.amount, 0);

    // Calculate growth percentage
    const monthlyGrowthPercent = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;

    // Create daily breakdown for chart
    const map = new Map<string, number>();
    filtered.forEach((sale) => {
      const date = format(parseISO(sale.date), 'yyyy-MM-dd');
      map.set(date, (map.get(date) || 0) + sale.amount);
    });

    const dailyBreakdown = Array.from(map.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2)),
      }));

    return NextResponse.json({
      range,
      currentTotal: Number(currentTotal.toFixed(2)),
      lastWeekTotal: Number(lastWeekTotal.toFixed(2)),
      previousTotal: Number(previousTotal.toFixed(2)),
      monthlyGrowthPercent: Number(monthlyGrowthPercent.toFixed(2)),
      dailyBreakdown,
      hasProducts: true
    });
  } catch (error) {
    console.error('Error building revenue summary:', error);
    return NextResponse.json(
      { error: 'Failed to load revenue summary' },
      { status: 500 }
    );
  }
}
