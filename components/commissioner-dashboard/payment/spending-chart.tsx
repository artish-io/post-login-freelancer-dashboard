'use client';

import { useEffect, useState } from 'react';

type DailySpending = {
  date: string; // e.g. '2025-07-08'
  amount: number;
};

type SpendingSummaryResponse = {
  range: 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';
  currentTotal: number;
  lastWeekTotal: number;
  monthlyGrowthPercent: number;
  dailyBreakdown: DailySpending[];
};

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

type Props = {
  range: RangeOption;
};

export default function SpendingChart({ range }: Props) {
  const [dailyTotals, setDailyTotals] = useState<DailySpending[]>([]);
  const [yMax, setYMax] = useState(1000);

  const getYMax = (maxAmount: number) => {
    const scale = 500;
    return Math.ceil(maxAmount / scale) * scale;
  };

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/commissioner-dashboard/payments/spending-summary?range=${range}`);
        const data: SpendingSummaryResponse = await res.json();

        if (Array.isArray(data.dailyBreakdown)) {
          const sorted = data.dailyBreakdown.sort(
            (a: DailySpending, b: DailySpending) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const max = Math.max(...sorted.map((d: DailySpending) => d.amount));
          setYMax(getYMax(max));
          setDailyTotals(sorted);
        }
      } catch (err) {
        console.error('Failed to load spending summary for range:', range, err);
      }
    }

    fetchSummary();
  }, [range]);

  const getRangeLabel = () => {
    if (range === 'month') return 'this month';
    if (range === 'january') return 'January';
    if (range === 'february') return 'February';
    if (range === 'march') return 'March';
    if (range === 'april') return 'April';
    if (range === 'may') return 'May';
    if (range === 'june') return 'June';
    if (range === 'july') return 'July';
    if (range === 'august') return 'August';
    if (range === 'september') return 'September';
    if (range === 'october') return 'October';
    if (range === 'november') return 'November';
    if (range === 'december') return 'December';
    if (range === 'year') return 'this year';
    return 'the last 5 years';
  };

  // Generate Y-axis labels (5 levels: 0, 25%, 50%, 75%, 100%)
  const yAxisLabels = [];
  for (let i = 0; i <= 4; i++) {
    yAxisLabels.push(Math.round((yMax / 4) * i));
  }

  return (
    <div className="w-full">
      <p className="text-sm text-gray-500 mb-4">
        Total spending for {getRangeLabel()}
      </p>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-[840px]">
          {/* Y-axis */}
          <div className="flex flex-col justify-between h-[288px] py-2">
            {yAxisLabels.reverse().map((label, index) => (
              <div key={index} className="text-xs text-gray-400 text-right w-12 leading-none">
                ${label}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            {/* Horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-2">
              {yAxisLabels.map((_, index) => (
                <div key={index} className="border-t border-gray-100 w-full"></div>
              ))}
            </div>

            {/* Bars container */}
            <div className="flex gap-2 h-[288px] items-end pb-2 relative">
              {dailyTotals.length === 0 ? (
                <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                  No data available for {getRangeLabel()}
                </div>
              ) : (
                dailyTotals.map(({ date, amount }) => {
                  // Calculate fill height as percentage of total bar height
                  const fillPercent = yMax > 0 ? (amount / yMax) * 100 : 0;
                  const dayLabel = date.slice(-2); // last 2 digits of day (e.g. '08')

                  return (
                    <div
                      key={date}
                      className="flex flex-col items-center justify-end shrink-0"
                    >
                      {/* Bar with grey background and dynamic pink fill */}
                      <div
                        className="relative rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: '13.34px',
                          height: '288px',
                          backgroundColor: '#EEEEEE'
                        }}
                        title={`$${amount.toFixed(2)} on ${date}`}
                      >
                        {/* Dynamic fill */}
                        <div
                          className="absolute bottom-0 left-0 w-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            height: `${fillPercent}%`,
                            backgroundColor: '#B30445'
                          }}
                        />
                      </div>
                      <span className="mt-2 text-xs text-gray-400 leading-none">{dayLabel}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
