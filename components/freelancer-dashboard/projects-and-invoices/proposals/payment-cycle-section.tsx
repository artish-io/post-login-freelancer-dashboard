'use client';

import ProposalPaymentCycleToggle from './payment-cycle-toggle';
import PaymentCycleFixedAmountForm from './payment-cycle-fixed-amount-form';
import PaymentCycleHourlyForm from './payment-cycle-hourly-form';

type PaymentCycle = 'Fixed Amount' | 'Hourly Rate';

type Props = {
  paymentCycle: PaymentCycle;
  setPaymentCycle: (val: PaymentCycle) => void;
  totalAmount: string;
  upfrontPayment: string;
  onTotalAmountChange: (val: string) => void;
  onUpfrontPaymentChange: (val: string) => void;
  hourlyRate: string;
  maxHours: string;
  onHourlyRateChange: (val: string) => void;
  onMaxHoursChange: (val: string) => void;
};

export default function PaymentCycleSection({
  paymentCycle,
  setPaymentCycle,
  totalAmount,
  upfrontPayment,
  onTotalAmountChange,
  onUpfrontPaymentChange,
  hourlyRate,
  maxHours,
  onHourlyRateChange,
  onMaxHoursChange,
}: Props) {
  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      <label className="text-sm text-black font-medium">
        What is the payment cycle for this project?
      </label>

      <ProposalPaymentCycleToggle value={paymentCycle} onChange={setPaymentCycle} />

      {paymentCycle === 'Fixed Amount' ? (
        <PaymentCycleFixedAmountForm
          totalAmount={totalAmount}
          upfrontPayment={upfrontPayment}
          onTotalAmountChange={onTotalAmountChange}
          onUpfrontPaymentChange={onUpfrontPaymentChange}
        />
      ) : (
        <PaymentCycleHourlyForm
          hourlyRate={hourlyRate}
          maxHours={maxHours}
          onHourlyRateChange={onHourlyRateChange}
          onMaxHoursChange={onMaxHoursChange}
        />
      )}
    </div>
  );
}