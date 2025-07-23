'use client';

import { useState, useEffect } from 'react';
import DashboardModeToggle from '../../../../components/commissioner-dashboard/payment/dashboard-mode-toggle';
import OverviewToggle from '../../../../components/commissioner-dashboard/payment/overview-toggle';
import SpendingChart from '../../../../components/commissioner-dashboard/payment/spending-chart';
import RevenueChart from '../../../../components/commissioner-dashboard/payment/revenue-chart';
import SpendingSummaryCard from '../../../../components/commissioner-dashboard/payment/spending-summary-card';
import EarningsSummaryCard from '../../../../components/commissioner-dashboard/payment/earnings-summary-card';
import CombinedWalletHistory from '../../../../components/commissioner-dashboard/payment/combined-wallet-history';
import PaymentSettingsCard from '../../../../components/commissioner-dashboard/payment/payment-settings-card';

type DashboardMode = 'spending' | 'revenue';
type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

export default function CommissionerPaymentsPage() {
  const [mode, setMode] = useState<DashboardMode>('spending');
  const [range, setRange] = useState<RangeOption>('month');
  const [showChartModal, setShowChartModal] = useState(false);
  const [lastMonthTotal, setLastMonthTotal] = useState<number>(0);
  const [hasStorefront, setHasStorefront] = useState<boolean>(false);

  // Check if user has storefront products
  useEffect(() => {
    async function checkStorefront() {
      try {
        const res = await fetch('/api/commissioner-dashboard/payments/revenue-summary?range=month');
        const data = await res.json();
        setHasStorefront(data.hasProducts || false);
      } catch (err) {
        console.error('Failed to check storefront status:', err);
        setHasStorefront(false);
      }
    }
    checkStorefront();
  }, []);

  // Fetch last month data for the label
  useEffect(() => {
    async function fetchLastMonthData() {
      try {
        const endpoint = mode === 'spending'
          ? `/api/commissioner-dashboard/payments/spending-summary?range=${range}`
          : `/api/commissioner-dashboard/payments/revenue-summary?range=${range}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        setLastMonthTotal(data.previousTotal || 0);
      } catch (err) {
        console.error('Failed to load last month data:', err);
      }
    }
    fetchLastMonthData();
  }, [range, mode]);

  const getPageTitle = () => {
    if (!hasStorefront) return 'Spending Overview';
    return mode === 'spending' ? 'Spending Overview' : 'Revenue Overview';
  };

  const getLastMonthLabel = () => {
    const formattedAmount = lastMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
    if (mode === 'spending') {
      return `Last Month $${formattedAmount} spent`;
    }
    return `Last Month $${formattedAmount} earned`;
  };

  return (
    <section className="w-full flex flex-col gap-6 px-6 py-8">
      {/* Mobile Layout */}
      <div className="lg:hidden space-y-6">
        {/* 1. Header with Mode Toggle and Overview Toggle */}
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">{getPageTitle()}</h2>
              <p className="text-sm text-gray-500">
                {getLastMonthLabel()}
              </p>
            </div>
            <DashboardModeToggle
              mode={mode}
              onModeChange={setMode}
              hasStorefront={hasStorefront}
            />
          </div>

          <div className="flex justify-end">
            <OverviewToggle range={range} onRangeChange={setRange} mode={mode} />
          </div>
        </div>

        {/* 2. Summary Cards */}
        <div className="space-y-4">
          {mode === 'spending' ? (
            <SpendingSummaryCard
              range={range}
              onToggleChart={() => setShowChartModal(true)}
              isCleanVersion={true}
            />
          ) : (
            <EarningsSummaryCard
              range={range}
              onToggleChart={() => setShowChartModal(true)}
              isCleanVersion={true}
            />
          )}

          {/* Show earnings card below spending card when in spending mode and has storefront */}
          {mode === 'spending' && hasStorefront && (
            <EarningsSummaryCard
              range={range}
              isCleanVersion={true}
            />
          )}
        </div>

        {/* 3. Transaction History */}
        <CombinedWalletHistory />

        {/* 4. Payment Settings (last) */}
        <PaymentSettingsCard />
      </div>

      {/* Chart Modal for Mobile */}
      {showChartModal && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {mode === 'spending' ? 'Spending Chart' : 'Revenue Chart'}
              </h3>
              <button
                onClick={() => setShowChartModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {mode === 'spending' ? (
              <SpendingChart range={range} />
            ) : (
              <RevenueChart range={range} />
            )}
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {/* Left Column - Chart and Controls (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header: Mode Toggle & Overview Controls */}
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">{getPageTitle()}</h2>
                <p className="text-sm text-gray-500">
                  {getLastMonthLabel()}
                </p>
              </div>
              <DashboardModeToggle
                mode={mode}
                onModeChange={setMode}
                hasStorefront={hasStorefront}
              />
            </div>

            <div className="flex justify-end">
              <OverviewToggle range={range} onRangeChange={setRange} mode={mode} />
            </div>
          </div>

          {/* Chart */}
          {mode === 'spending' ? (
            <SpendingChart range={range} />
          ) : (
            <RevenueChart range={range} />
          )}

          {/* Payment Settings */}
          <PaymentSettingsCard />
        </div>

        {/* Right Column - Summary and History (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Summary Cards */}
          {mode === 'spending' ? (
            <SpendingSummaryCard range={range} />
          ) : (
            <EarningsSummaryCard range={range} />
          )}

          {/* Show earnings card below spending card when in spending mode and has storefront */}
          {mode === 'spending' && hasStorefront && (
            <EarningsSummaryCard range={range} />
          )}

          {/* Transaction History */}
          <CombinedWalletHistory />
        </div>
      </div>
    </section>
  );
}