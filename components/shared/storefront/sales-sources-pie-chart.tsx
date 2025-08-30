'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '../../ui/loading-skeleton';
import dynamic from 'next/dynamic';

// Lazy load chart components to reduce initial bundle size
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), {
  ssr: false,
  loading: () => <Skeleton height={160} width={160} rounded />
});

// Lazy load Chart.js components
const ChartJS = dynamic(() => import('chart.js').then(mod => mod.Chart), { ssr: false });
const ArcElement = dynamic(() => import('chart.js').then(mod => mod.ArcElement), { ssr: false });
const Tooltip = dynamic(() => import('chart.js').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('chart.js').then(mod => mod.Legend), { ssr: false });

import type { TooltipItem } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

type SourceData = {
  label: string;
  value: number;
  color: string;
};

export default function SalesSourcesPieChart() {
  const [data, setData] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSalesSources() {
      try {
        const res = await fetch('/api/storefront/sales-sources');
        const json = await res.json();

        // Transform the data to match expected structure
        if (json && json.length > 0) {
          const rawData = json[0];
          const colors = ['#B30445', '#E91E63', '#F8BBD9', '#FCD5E3'];
          const labels = ['Direct', 'Affiliate', 'E-Mail', 'Others'];

          const transformedData = Object.entries(rawData).map(([key, value], index) => ({
            label: labels[index] || key.charAt(0).toUpperCase() + key.slice(1),
            value: typeof value === 'number' ? value : 0,
            color: colors[index] || '#B30445'
          }));

          console.log('Transformed data:', transformedData);
          setData(transformedData);
        } else {
          console.log('No data received:', json);
        }
      } catch (err) {
        console.error('Failed to fetch sales sources:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSalesSources();
  }, []);

  if (loading) {
    return (
      <div className="text-center text-sm text-gray-500 py-8">Loading...</div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-8">No data available</div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => d.color),
        borderWidth: 2,
        borderColor: '#fff',
        hoverBorderWidth: 3,
      },
    ],
  };

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const topPercentage = totalValue > 0 ? Math.round((data[0]?.value / totalValue) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[160px] h-[160px]">
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: TooltipItem<'doughnut'>) => `${ctx.label}: $${ctx.raw}`,
                },
              },
            },
            elements: {
              arc: {
                borderWidth: 2,
              },
            },
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          {topPercentage}%
        </div>
      </div>

      <div className="w-full text-sm space-y-1">
        {data.map((item) => (
          <div key={item.label} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
              <span>{item.label}</span>
            </div>
            <span className="font-medium">${(item.value || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
