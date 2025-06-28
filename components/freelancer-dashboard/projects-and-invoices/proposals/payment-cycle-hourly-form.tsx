'use client';

type Props = {
  hourlyRate: string;
  maxHours: string;
  onHourlyRateChange: (val: string) => void;
  onMaxHoursChange: (val: string) => void;
};

export default function PaymentCycleHourlyForm({
  hourlyRate,
  maxHours,
  onHourlyRateChange,
  onMaxHoursChange,
}: Props) {
  return (
    <div className="w-full mt-4 flex flex-col gap-1">
      {/* LABEL ROW */}
      <div className="flex justify-between items-end mb-1">
        <label className="text-black text-xs font-normal pl-1">Hourly Rate</label>
        <label className="text-black text-xs font-normal pr-1">Max Hours Per Day</label>
      </div>

      {/* INPUTS */}
      <div className="flex gap-3">
        {/* Hourly Rate Input */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base font-semibold">$</span>
          <input
            type="number"
            value={hourlyRate}
            min={0}
            onChange={e => onHourlyRateChange(e.target.value)}
            className="w-full pl-8 pr-3 py-3 rounded-2xl border border-gray-300 text-base font-normal tracking-normal leading-normal bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
            placeholder="0.00"
          />
        </div>

        {/* Max Hours Input */}
        <div className="flex-1 relative">
          <input
            type="number"
            value={maxHours}
            min={0}
            onChange={e => onMaxHoursChange(e.target.value)}
            className="w-full pl-4 pr-12 py-3 rounded-2xl border border-gray-300 text-base font-normal tracking-normal leading-normal bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
            placeholder="0"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              type="button"
              className="px-2 py-0 rounded text-black text-lg font-bold border border-gray-300 hover:bg-gray-100"
              tabIndex={-1}
              onClick={() => {
                const newVal = Math.max(0, Number(maxHours) - 1);
                onMaxHoursChange(String(newVal));
              }}
            >
              −
            </button>
            <button
              type="button"
              className="px-2 py-0 rounded text-black text-lg font-bold border border-gray-300 hover:bg-gray-100"
              tabIndex={-1}
              onClick={() => {
                const newVal = Math.max(0, Number(maxHours) + 1);
                onMaxHoursChange(String(newVal));
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}