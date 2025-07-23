'use client';

import SharedEarningsSummaryCard from '../../shared/earnings-summary-card';

type RangeOption = 'month' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december' | 'year' | 'all';

type Props = {
  range?: RangeOption;
  onToggleChart?: () => void;
  showChart?: boolean;
  isCleanVersion?: boolean;
};

export default function EarningsSummaryCard({
  range = 'month',
  onToggleChart,
  showChart = false,
  isCleanVersion = false
}: Props) {
  // Always use the shared component for commissioner earnings
  return (
    <SharedEarningsSummaryCard
      range={range}
      onToggleChart={onToggleChart}
      showChart={showChart}
      isCleanVersion={isCleanVersion}
      userType="commissioner"
    />
  );
}

