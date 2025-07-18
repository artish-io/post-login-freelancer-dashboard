'use client';

import ProjectStartSelect from './project-start-select';
import ProjectDurationPicker from './project-duration-picker';

type Props = {
  startType: 'Immediately' | 'Custom';
  onStartTypeChange: (val: 'Immediately' | 'Custom') => void;
  customStartDate: Date | null;
  onCustomStartDateChange: (val: Date | null) => void;
  endDate: Date | null;
  onEndDateChange: (val: Date | null) => void;
};

export default function ProposalScheduleSelect({
  startType,
  onStartTypeChange,
  customStartDate,
  onCustomStartDateChange,
  endDate,
  onEndDateChange,
}: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ProjectStartSelect
        value={startType}
        onChange={onStartTypeChange}
        customDate={customStartDate}
        onCustomDateChange={onCustomStartDateChange}
      />

      <ProjectDurationPicker
  endDate={endDate}
  onEndDateChange={onEndDateChange}
  startDate={startType === 'Immediately' ? new Date() : customStartDate}
/>
    </div>
  );
}