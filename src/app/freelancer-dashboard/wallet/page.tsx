// src/app/freelancer-dashboard/wallet/page.tsx

'use client';

import { useState, useEffect } from 'react';
import WalletDropDownToggle from '../../../../components/freelancer-dashboard/wallet/wallet-drop-down-toggle';
import EarningsChart from '../../../../components/freelancer-dashboard/wallet/earnings-chart';
import EarningsSummaryCard from '../../../../components/freelancer-dashboard/wallet/earnings-summary-card';
import WalletHistoryList from '../../../../components/freelancer-dashboard/wallet/wallet-history-list';
import ChangeWithdrawalCard from '../../../../components/freelancer-dashboard/wallet/change-withdrawal-card';
import CurrencyDisplay from '../../../../components/ui/currency-display';

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

export default function WalletPage() {
  const [range, setRange] = useState<RangeOption>('month');
  const [showChartModal, setShowChartModal] = useState(false);
  const [lastMonthTotal, setLastMonthTotal] = useState<number>(0);

  // Fetch last month data for the label
  useEffect(() => {
    async function fetchLastMonthData() {
      try {
        const res = await fetch(`/api/dashboard/wallet/summary?range=${range}`);
        const data = await res.json();
        setLastMonthTotal(data.previousTotal || 0);
      } catch (err) {
        console.error('Failed to load last month data:', err);
      }
    }
    fetchLastMonthData();
  }, [range]);


  return (
    <section className="w-full flex flex-col gap-6 px-6 py-8">
      {/* Mobile Layout */}
      <div className="lg:hidden space-y-6">
        {/* 1. Header with Toggle and Last Month Label */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Earnings Overview</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              Last Month
              <CurrencyDisplay
                amount={lastMonthTotal}
                className="text-sm"
                currencySymbolSize="text-[10px]"
              />
            </p>
          </div>
          <WalletDropDownToggle range={range} onRangeChange={setRange} />
        </div>

        {/* 2. Clean Earnings Card */}
        <EarningsSummaryCard
          range={range}
          onToggleChart={() => setShowChartModal(true)}
          isCleanVersion={true}
        />

        {/* 3. Wallet History */}
        <WalletHistoryList />

        {/* 4. Change Withdrawal (last) */}
        <ChangeWithdrawalCard />
      </div>

      {/* Chart Modal for Mobile */}
      {showChartModal && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Earnings Chart</h3>
              <button
                onClick={() => setShowChartModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EarningsChart range={range} />
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {/* Left Column - Chart and Controls (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header: Earnings Overview & Controls */}
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">Earnings Overview</h2>
              <p className="text-sm text-gray-500">
                Last Month ${lastMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <WalletDropDownToggle range={range} onRangeChange={setRange} />
          </div>

          <EarningsChart range={range} />
          <ChangeWithdrawalCard />
        </div>

        {/* Right Column - Summary and History (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <EarningsSummaryCard />
          <WalletHistoryList />
        </div>
      </div>
    </section>
  );
}