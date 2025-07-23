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

const SPENDING_HISTORY_PATH = path.join(process.cwd(), 'data/commissioner-payments/spending-history.json');

type SpendingTransaction = {
  id: number;
  commissionerId: number;
  freelancerId?: number;
  projectId?: number;
  type: 'freelancer_payout' | 'withdrawal';
  amount: number;
  currency: string;
  date: string;
  description: string;
  projectName?: string;
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

    const historyRaw = await readFile(SPENDING_HISTORY_PATH, 'utf-8');
    const history: SpendingTransaction[] = JSON.parse(historyRaw);

    const now = new Date();
    const userHistory = history.filter(
      (tx) => tx.commissionerId === commissionerId
    );

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

    // Filter transactions by date range
    const filtered = userHistory.filter((tx) => {
      const txDate = parseISO(tx.date);
      return isAfter(txDate, fromDate) && isBefore(txDate, toDate);
    });

    // Calculate current total spending
    const currentTotal = filtered.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate last week total for comparison
    const lastWeekStart = subDays(now, 7);
    const lastWeekFiltered = userHistory.filter((tx) => {
      const txDate = parseISO(tx.date);
      return isAfter(txDate, lastWeekStart) && isBefore(txDate, now);
    });
    const lastWeekTotal = lastWeekFiltered.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate previous period total for growth calculation
    const previousPeriodStart = range === 'month' 
      ? startOfMonth(subDays(fromDate, 1))
      : subYears(fromDate, 1);
    const previousPeriodEnd = fromDate;
    
    const previousFiltered = userHistory.filter((tx) => {
      const txDate = parseISO(tx.date);
      return isAfter(txDate, previousPeriodStart) && isBefore(txDate, previousPeriodEnd);
    });
    const previousTotal = previousFiltered.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate growth percentage
    const monthlyGrowthPercent = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;

    // Create daily breakdown for chart
    const map = new Map<string, number>();
    filtered.forEach((tx) => {
      const date = format(parseISO(tx.date), 'yyyy-MM-dd');
      map.set(date, (map.get(date) || 0) + tx.amount);
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
    });
  } catch (error) {
    console.error('Error building spending summary:', error);
    return NextResponse.json(
      { error: 'Failed to load spending summary' },
      { status: 500 }
    );
  }
}
