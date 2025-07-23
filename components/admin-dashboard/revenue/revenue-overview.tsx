'use client';

import { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Users,
  CreditCard,
  Calendar,
  BarChart3
} from 'lucide-react';

interface RevenueOverviewProps {
  data: any;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function RevenueOverview({ data, dateRange }: RevenueOverviewProps) {
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Mock data for demonstration - replace with real data
  const mockData = {
    totalRevenue: 45750.25,
    serviceCharges: 32100.50,
    storefrontSales: 13649.75,
    totalTransactions: 1247,
    averageTransaction: 36.70,
    growth: {
      revenue: 12.5,
      transactions: 8.3,
      avgTransaction: 4.2
    },
    dailyRevenue: [
      { date: '2025-01-15', service: 450, storefront: 230 },
      { date: '2025-01-16', service: 680, storefront: 340 },
      { date: '2025-01-17', service: 520, storefront: 180 },
      { date: '2025-01-18', service: 750, storefront: 420 },
      { date: '2025-01-19', service: 890, storefront: 560 },
      { date: '2025-01-20', service: 620, storefront: 290 },
      { date: '2025-01-21', service: 1100, storefront: 680 }
    ]
  };

  const actualData = data || mockData;

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${actualData.totalRevenue?.toLocaleString() || '0'}`,
      change: actualData.growth?.revenue || 0,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Service Charges (5%)',
      value: `$${actualData.serviceCharges?.toLocaleString() || '0'}`,
      change: actualData.growth?.serviceCharges || 0,
      icon: CreditCard,
      color: 'bg-blue-500'
    },
    {
      title: 'Storefront Sales',
      value: `$${actualData.storefrontSales?.toLocaleString() || '0'}`,
      change: actualData.growth?.storefrontSales || 0,
      icon: ShoppingCart,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Transactions',
      value: actualData.totalTransactions?.toLocaleString() || '0',
      change: actualData.growth?.transactions || 0,
      icon: BarChart3,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          
          return (
            <div key={index} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div className="flex items-center mt-4">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(stat.change)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
          <div className="flex space-x-2">
            {['daily', 'weekly', 'monthly'].map((view) => (
              <button
                key={view}
                onClick={() => setChartView(view as any)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  chartView === view
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-4">
          {actualData.dailyRevenue?.slice(-7).map((day: any, index: number) => {
            const total = day.service + day.storefront;
            const maxValue = Math.max(...actualData.dailyRevenue.map((d: any) => d.service + d.storefront));
            const serviceWidth = (day.service / maxValue) * 100;
            const storefrontWidth = (day.storefront / maxValue) * 100;
            
            return (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-blue-500 rounded-lg"
                    style={{ width: `${serviceWidth}%` }}
                  />
                  <div 
                    className="absolute top-0 h-full bg-purple-500 rounded-lg"
                    style={{ 
                      left: `${serviceWidth}%`,
                      width: `${storefrontWidth}%` 
                    }}
                  />
                </div>
                <div className="w-20 text-sm font-medium text-gray-900 text-right">
                  ${total.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Service Charges</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Storefront Sales</span>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Sources */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Sources</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-3"></div>
                <span className="text-gray-700">Service Charges (5%)</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  ${actualData.serviceCharges?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-500">
                  {((actualData.serviceCharges / actualData.totalRevenue) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded mr-3"></div>
                <span className="text-gray-700">Storefront Sales</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  ${actualData.storefrontSales?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-500">
                  {((actualData.storefrontSales / actualData.totalRevenue) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Average Transaction</span>
              <span className="font-semibold text-gray-900">
                ${actualData.averageTransaction?.toFixed(2) || '0.00'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Total Transactions</span>
              <span className="font-semibold text-gray-900">
                {actualData.totalTransactions?.toLocaleString() || '0'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Revenue per Day</span>
              <span className="font-semibold text-gray-900">
                ${((actualData.totalRevenue || 0) / 30).toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Active Period</span>
              <span className="font-semibold text-gray-900">
                {Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
