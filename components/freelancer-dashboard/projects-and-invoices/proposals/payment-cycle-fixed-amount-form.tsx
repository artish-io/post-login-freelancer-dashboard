'use client';

type Props = {
  totalAmount: string;
  upfrontPayment: string;
  onTotalAmountChange: (val: string) => void;
  onUpfrontPaymentChange: (val: string) => void;
};

export default function PaymentCycleFixedAmountForm({
  totalAmount,
  upfrontPayment,
  onTotalAmountChange,
  onUpfrontPaymentChange,
}: Props) {
  return (
    <div className="w-full mt-4 flex flex-col gap-1">
      {/* LABEL ROW */}
      <div className="flex justify-between items-end mb-1">
        <label className="text-black text-xs font-normal pl-1">Total Amount</label>
        <label className="text-black text-xs font-normal pr-1">Upfront Payment</label>
      </div>

      {/* INPUTS */}
      <div className="flex gap-3">
        {/* Total Amount Input */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base font-semibold">$</span>
          <input
            type="number"
            value={totalAmount}
            min={0}
            onChange={e => onTotalAmountChange(e.target.value)}
            className="w-full pl-8 pr-3 py-3 rounded-2xl border border-gray-300 text-base font-normal tracking-normal leading-normal bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
            placeholder="0.00"
          />
        </div>

        {/* Upfront Payment Input */}
        <div className="flex-1 relative">
          <input
            type="number"
            value={upfrontPayment}
            min={0}
            max={100}
            onChange={e => onUpfrontPaymentChange(e.target.value)}
            className="w-full pl-4 pr-8 py-3 rounded-2xl border border-gray-300 text-base font-normal tracking-normal leading-normal bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
            placeholder="0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base font-semibold">%</span>
        </div>
      </div>
    </div>
  );
}