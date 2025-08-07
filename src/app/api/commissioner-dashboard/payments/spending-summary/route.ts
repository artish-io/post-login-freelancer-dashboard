import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSpendingSummary } from '@/lib/commissioner-spending-service';
import {
  subDays,
  subYears,
  startOfMonth,
  startOfYear,
  getYear,
  getMonth,
} from 'date-fns';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commissionerId = parseInt(session.user.id);
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || 'month';

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

    // Calculate previous period dates
    const previousPeriodStart = range === 'month'
      ? startOfMonth(subDays(fromDate, 1))
      : subYears(fromDate, 1);
    const previousPeriodEnd = fromDate;
    const lastWeekStart = subDays(now, 7);

    // Get spending summary using unified service
    const summary = await getSpendingSummary(
      commissionerId,
      fromDate,
      toDate,
      previousPeriodStart,
      previousPeriodEnd,
      lastWeekStart
    );

    return NextResponse.json({
      range,
      ...summary,
    });
  } catch (error) {
    console.error('Error building spending summary:', error);
    return NextResponse.json(
      { error: 'Failed to load spending summary' },
      { status: 500 }
    );
  }
}
