import { useEffect, useState } from 'react';
import StorefrontSummaryStatsCard from './storefront-summary-stats-card';

type SummaryStats = {
  revenue: number;
  revenueChange: number;
  growthRate: number;
  growthChange: number;
  orders: number;
  ordersChange: number;
};

type Props = {
  startDate: string;
  endDate: string;
};

export default function StorefrontSummaryStatsRow({ startDate, endDate }: Props) {
  const [stats, setStats] = useState<SummaryStats>({
    revenue: 0,
    revenueChange: 0,
    growthRate: 0,
    growthChange: 0,
    orders: 0,
    ordersChange: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/storefront/summary?start=${startDate}&end=${endDate}`);
        const data = await res.json();

        // Ensure we have valid data with fallbacks
        setStats({
          revenue: data.revenue || 0,
          revenueChange: data.revenueChange || 0,
          growthRate: data.growthRate || 0,
          growthChange: data.growthChange || 0,
          orders: data.orders || 0,
          ordersChange: data.ordersChange || 0,
        });
      } catch (error) {
        console.error('Failed to fetch storefront summary:', error);
        // Keep default values on error
      }
    };

    fetchStats();
  }, [startDate, endDate]);

  const cards = [
    {
      label: 'Revenue',
      value: stats.revenue,
      bgColor: '#FDE7EF',
      change: stats.revenueChange,
      changeDirection: stats.revenueChange >= 0 ? ('up' as const) : ('down' as const),
      isCurrency: true,
    },
    {
      label: 'Growth (Month-on-Month)',
      value: `${stats.growthRate.toFixed(1)}%`,
      bgColor: '#F7DEE7',
      change: stats.growthChange,
      changeDirection: stats.growthChange >= 0 ? ('up' as const) : ('down' as const),
    },
    {
      label: 'Orders',
      value: stats.orders,
      bgColor: '#FBE4EC',
      change: stats.ordersChange,
      changeDirection: stats.ordersChange >= 0 ? ('up' as const) : ('down' as const),
    },
  ];

  return (
    <>
      {/* Mobile: Single combined card */}
      <div className="block sm:hidden">
        <div
          className="rounded-2xl px-6 py-6 w-full"
          style={{ backgroundColor: '#FDE7EF' }}
        >
          <h3 className="text-lg font-semibold text-black mb-4">Summary</h3>
          <div className="space-y-4">
            {cards.map((card, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium text-black">{card.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-black">{card.value}</span>
                  {card.change !== undefined && (
                    <span className={`text-sm font-medium ${card.changeDirection === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {card.changeDirection === 'up' ? '+' : ''}{card.change.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: Individual cards with reduced spacing */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3 w-full">
        {cards.map((card, index) => (
          <StorefrontSummaryStatsCard
            key={index}
            label={card.label}
            value={card.value}
            bgColor={card.bgColor}
            change={card.change}
            changeDirection={card.changeDirection}
          />
        ))}
      </div>
    </>
  );
}