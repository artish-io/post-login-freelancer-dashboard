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
  format,
  getYear,
  getMonth,
} from 'date-fns';

const HISTORY_PATH = path.join(process.cwd(), 'data/wallet/wallet-history.json');

type Transaction = {
  userId: number;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || 'month';

    const historyRaw = await readFile(HISTORY_PATH, 'utf-8');
    const history: Transaction[] = JSON.parse(historyRaw);

    const now = new Date();
    const userHistory = history.filter(
      (tx) => tx.userId === userId && tx.type === 'credit'
    );

    // Note: earnings data available if needed for future enhancements

    let fromDate: Date;
    let toDate: Date = now;

    if (range === 'year') {
      fromDate = startOfYear(now);
    } else if (range === 'all') {
      fromDate = subYears(now, 5);
    } else if (range === 'month') {
      fromDate = startOfMonth(now);
    } else {
      // Handle specific months (january, february, etc.)
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.indexOf(range);

      if (monthIndex !== -1) {
        const currentYear = getYear(now);
        fromDate = new Date(currentYear, monthIndex, 1);
        toDate = new Date(currentYear, monthIndex + 1, 0); // Last day of the month
      } else {
        // Fallback to current month
        fromDate = startOfMonth(now);
      }
    }

    const filtered = userHistory.filter((tx) => {
      const txDate = parseISO(tx.date);
      if (range === 'month' || range === 'year' || range === 'all') {
        return isAfter(txDate, fromDate);
      } else {
        // For specific months, filter between fromDate and toDate
        return txDate >= fromDate && txDate <= toDate;
      }
    });

    const currentTotal = filtered.reduce(
      (sum: number, tx: Transaction) => sum + tx.amount,
      0
    );

    const last7Days = subDays(now, 7);
    const lastWeekTotal = userHistory
      .filter((tx) => isAfter(parseISO(tx.date), last7Days))
      .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);

    let previousTotal = 0;

    if (range === 'month') {
      const prevMonth = getMonth(now) - 1;
      const sameYear = getYear(now);
      previousTotal = userHistory
        .filter((tx) => {
          const d = parseISO(tx.date);
          return getMonth(d) === prevMonth && getYear(d) === sameYear;
        })
        .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
    }

    if (range === 'year') {
      const prevYear = getYear(now) - 1;
      previousTotal = userHistory
        .filter((tx) => getYear(parseISO(tx.date)) === prevYear)
        .reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);
    }

    const monthlyGrowthPercent = previousTotal
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
      : 100;

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
      monthlyGrowthPercent,
      dailyBreakdown,
    });
  } catch (error) {
    console.error('Error building wallet summary:', error);
    return NextResponse.json(
      { error: 'Failed to load wallet summary' },
      { status: 500 }
    );
  }
}