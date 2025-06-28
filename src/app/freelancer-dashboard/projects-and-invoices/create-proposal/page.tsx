'use client';

import { useState } from 'react';
import ProposalHeader from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-header';
import ProposalClientSelector from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/propoosal-client-selector';
import ProposalProjectNameInput from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-project-name-input';
import ProposalScheduleSelect from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-schedule-select';
import ProposalExecutionMethod from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-execution-method';
import PaymentCycleSection from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/payment-cycle-section';
import ProposalProjectScopeInput from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-project-scope-input';
import ProposalMilestonesEditor, {
  Milestone
} from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-milestones-editor';

type Contact = {
  id: number;
  name: string;
  email: string;
  title?: string;
  avatar?: string;
  type: string;
  organization?: {
    name: string;
    logo?: string;
    address?: string;
  };
};

type ExecutionMethod = 'completion' | 'milestone';
type PaymentCycle = 'Fixed Amount' | 'Hourly Rate';

export default function CreateProposalPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | { email: string } | null>(null);
  const [projectName, setProjectName] = useState('');
  const [startType, setStartType] = useState<'Immediately' | 'Select a Date'>('Immediately');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [executionMethod, setExecutionMethod] = useState<ExecutionMethod>('completion');
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>('Fixed Amount');
  const [projectScope, setProjectScope] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const [totalAmount, setTotalAmount] = useState('');
  const [upfrontPayment, setUpfrontPayment] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [maxHours, setMaxHours] = useState('');

  const contactSelected = !!selectedContact && 'id' in selectedContact;
  const isCustomEmail = !!selectedContact && 'email' in selectedContact && !('id' in selectedContact);
  const isValid =
    !!selectedContact &&
    'email' in selectedContact &&
    selectedContact.email.trim() !== '' &&
    projectName.trim() !== '';

  const handleSaveDraft = () => console.log('Saving draft...');
  const handlePreview = () => console.log('Previewing proposal...');
  const handleCancel = () => console.log('Cancelled.');
  const handleSend = () => console.log('Sending proposal...');

  return (
    <section className="w-full px-4 md:px-10 py-6 flex flex-col gap-8">
      <ProposalHeader
        contactSelected={contactSelected}
        isCustomEmail={isCustomEmail}
        projectName={projectName}
        isValid={isValid}
        onSaveDraft={handleSaveDraft}
        onPreview={handlePreview}
        onCancel={handleCancel}
        onSend={handleSend}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-6">
        <ProposalClientSelector
          selectedContact={selectedContact}
          onSelect={setSelectedContact}
        />

        <ProposalProjectNameInput value={projectName} onChange={setProjectName} />

        <ProposalScheduleSelect
          startType={startType}
          onStartTypeChange={setStartType}
          customStartDate={customStartDate}
          onCustomStartDateChange={setCustomStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Choose invoice execution method
          </label>
          <ProposalExecutionMethod value={executionMethod} onChange={setExecutionMethod} />
        </div>

        <PaymentCycleSection
          paymentCycle={paymentCycle}
          setPaymentCycle={setPaymentCycle}
          totalAmount={totalAmount}
          upfrontPayment={upfrontPayment}
          onTotalAmountChange={setTotalAmount}
          onUpfrontPaymentChange={setUpfrontPayment}
          hourlyRate={hourlyRate}
          maxHours={maxHours}
          onHourlyRateChange={setHourlyRate}
          onMaxHoursChange={setMaxHours}
        />

        <ProposalProjectScopeInput value={projectScope} onChange={setProjectScope} />

        <ProposalMilestonesEditor milestones={milestones} onChange={setMilestones} />
      </div>
    </section>
  );
}