'use client';

import { useState } from 'react';
import StorefrontSummaryStatsRow from '../../../../components/freelancer-dashboard/storefront/storefront-summary-stats-row';
import RevenueLineChart from '../../../../components/freelancer-dashboard/storefront/revenue-line-chart';
import RecentSalesTable from '../../../../components/freelancer-dashboard/storefront/recent-sales-table';
import TopProductsBarChart from '../../../../components/freelancer-dashboard/storefront/top-products-bar-chart';
import SalesSourcesPieChart from '../../../../components/freelancer-dashboard/storefront/sales-sources-pie-chart';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover } from '@headlessui/react';
import { StorefrontCalendar } from '../../../../components/ui/storefront-calendar';
import ActionButtons from '../../../../components/freelancer-dashboard/storefront/action-buttons';

export default function StorefrontDashboardPage() {
  const now = new Date();
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(now));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(now));

  const formattedStart = startDate ? format(startDate, 'yyyy-MM-dd') : '';
  const formattedEnd = endDate ? format(endDate, 'yyyy-MM-dd') : '';

  return (
    <div className="w-full px-4 sm:px-6 md:px-10 py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Storefront Dashboard</h1>
          <p className="text-sm text-gray-500">Sales analytics for digital products</p>
        </div>

        {/* Separate Start and End Date Pickers */}
        <div className="flex items-center gap-3">
          <Popover className="relative">
            <Popover.Button className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-50">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-xs md:text-sm">
                {startDate ? format(startDate, 'dd MMM, yyyy') : 'Start Date'}
              </span>
            </Popover.Button>
            <Popover.Panel className="absolute left-0 md:-left-8 z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
              <StorefrontCalendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
              />
            </Popover.Panel>
          </Popover>

          <span className="text-gray-400 text-xs md:text-sm">to</span>

          <Popover className="relative">
            <Popover.Button className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-50">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-xs md:text-sm">
                {endDate ? format(endDate, 'dd MMM, yyyy') : 'End Date'}
              </span>
            </Popover.Button>
            <Popover.Panel className="absolute -right-6 md:-right-8 z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
              <StorefrontCalendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
              />
            </Popover.Panel>
          </Popover>
        </div>
      </div>

      <StorefrontSummaryStatsRow
        startDate={formattedStart}
        endDate={formattedEnd}
      />

      {/* Mobile: Action buttons before table */}
      <div className="block lg:hidden">
        <ActionButtons />
      </div>

      {/* Two-column layout: Main content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Charts and Tables */}
        <div className="flex-1 flex flex-col gap-6">
          <RevenueLineChart
            startDate={formattedStart}
            endDate={formattedEnd}
          />
          <RecentSalesTable />
        </div>

        {/* Right column - Sidebar (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-80 flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Most Sold Items</h3>
            <TopProductsBarChart />
          </div>

          <ActionButtons />

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Total Sales</h3>
            <SalesSourcesPieChart />
          </div>
        </div>
      </div>
    </div>
  );
}