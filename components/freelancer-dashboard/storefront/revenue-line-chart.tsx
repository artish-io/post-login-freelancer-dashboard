

'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

type ChartPoint = {
  day: string;
  current: number;
  previous: number;
};

type Props = {
  startDate: string;
  endDate: string;
};

export default function RevenueLineChart({ startDate, endDate }: Props) {
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    async function fetchChartData() {
      try {
        const res = await fetch('/api/storefront/revenue-chart?range=week');
        const json = await res.json();

        // Handle the API response structure
        if (json && typeof json === 'object' && json.current && json.previous) {
          // Convert the API response to chart data format
          const chartData: ChartPoint[] = [];
          const maxLength = Math.max(json.current.length || 0, json.previous.length || 0);

          for (let i = 0; i < maxLength; i++) {
            chartData.push({
              day: `Day ${i + 1}`,
              current: json.current[i] || 0,
              previous: json.previous[i] || 0,
            });
          }
          setData(chartData);
        } else if (Array.isArray(json)) {
          // If it's already an array, use it directly
          setData(json);
        } else {
          // Fallback with empty data
          setData([]);
        }
      } catch (err) {
        console.error('Failed to load revenue chart data:', err);
        setData([]);
      }
    }

    fetchChartData();
  }, [startDate, endDate]);

  return (
    <div className="w-full h-[300px] bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
        <h3 className="text-lg font-semibold">Revenue</h3>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-xs text-gray-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pink-600 inline-block" />
            <span className="text-xs">Current Week</span> <strong className="text-xs">$30</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pink-300 inline-block" />
            <span className="text-xs">Previous Week</span> <strong className="text-xs">$45</strong>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#888', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#888', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="previous"
            stroke="#f9a8d4"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke="#be185d"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}