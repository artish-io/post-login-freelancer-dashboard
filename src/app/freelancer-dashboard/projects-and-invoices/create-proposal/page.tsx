'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import ProposalHeader from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-header';
import ProposalMetaInfo from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-meta-info';
import ProposalScheduleSelect from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-schedule-select';
import ProposalExecutionMethod from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-execution-method';
import PaymentCycleSection from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/payment-cycle-section';
import ProposalProjectScopeInput from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-project-scope-input';
import ProposalMilestonesEditor, {
  Milestone,
} from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-milestones-editor';

import { generateDraftProposal } from '../../../../lib/proposals/generate-draft';

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
  const router = useRouter();

  const [selectedContact, setSelectedContact] = useState<Contact | { email: string } | null>(null);
  const [typeTags, setTypeTags] = useState<string[]>([]);
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

  const [mismatchError, setMismatchError] = useState<string | null>(null);

  // 🔁 Load draft from preview-cache.json or fallback
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const res = await fetch('/api/proposals/preview-cache');
        const data = await res.json();
        if (!data || Object.keys(data).length === 0) return;

        setProjectName(data.title ?? '');
        setProjectScope(data.summary ?? '');
        setMilestones(data.milestones ?? []);
        setPaymentCycle(data.paymentCycle ?? 'Fixed Amount');
        if (data.rate) setHourlyRate(data.rate.toString());
        if (data.depositRate) setUpfrontPayment(data.depositRate.toString());
        if (data.totalBid) setTotalAmount(data.totalBid.toString());
        if (data.customStartDate) setCustomStartDate(new Date(data.customStartDate));
        if (data.endDate) setEndDate(new Date(data.endDate));
        if (data.maxHours) setMaxHours(data.maxHours.toString());
        if (data.executionMethod) setExecutionMethod(data.executionMethod);
        if (data.startType) setStartType(data.startType);
        if (data.contact) setSelectedContact(data.contact);
        if (data.typeTags) setTypeTags(data.typeTags);
      } catch (err) {
        console.warn('⚠️ No draft loaded:', err);
      }
    };

    loadDraft();
  }, []);

  // 💰 Milestone + Upfront Validation
  useEffect(() => {
    if (paymentCycle !== 'Fixed Amount') {
      setMismatchError(null); // reset error if switching away from Fixed
      return;
    }

    const bid = Number(totalAmount) || 0;
    const deposit = Number(upfrontPayment) || 0;
    const depositValue = (bid * deposit) / 100;
    const milestoneSum = milestones.reduce((acc, m) => acc + Number(m.amount || 0), 0);

    if (Math.round(depositValue + milestoneSum) !== Math.round(bid)) {
      setMismatchError(
        `Milestones ($${milestoneSum.toLocaleString()}) + upfront ($${depositValue.toLocaleString()}) must equal total bid ($${bid.toLocaleString()})`
      );
    } else {
      setMismatchError(null);
    }
  }, [milestones, upfrontPayment, totalAmount, paymentCycle]);

  // ⏳ Auto-save every 500ms on field change
  useEffect(() => {
    const timeout = setTimeout(() => {
      const sanitized = milestones.map((m) => ({
        ...m,
        amount: Number(m.amount ?? 0),
      }));

      const draft = generateDraftProposal({
        title: projectName,
        summary: projectScope,
        logoUrl:
          selectedContact && 'organization' in selectedContact
            ? selectedContact.organization?.logo ?? ''
            : '',
        contact: selectedContact ?? undefined,
        typeTags,
        milestones: sanitized,
        paymentCycle,
        rate: paymentCycle === 'Hourly Rate' ? Number(hourlyRate) || 0 : undefined,
        depositRate: paymentCycle === 'Fixed Amount' ? upfrontPayment : undefined,
        totalBid: paymentCycle === 'Fixed Amount' ? Number(totalAmount) || 0 : undefined,
        customStartDate,
        endDate,
        maxHours: Number(maxHours) || 0,
        executionMethod,
        startType,
      });

      fetch('/api/proposals/preview-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    projectName,
    projectScope,
    milestones,
    paymentCycle,
    hourlyRate,
    upfrontPayment,
    totalAmount,
    selectedContact,
    typeTags,
    customStartDate,
    endDate,
    maxHours,
    executionMethod,
    startType,
  ]);

  // 🧠 Button logic
  const contactSelected = !!selectedContact && 'id' in selectedContact;
  const isCustomEmail =
    !!selectedContact && 'email' in selectedContact && !('id' in selectedContact);
  const isValid =
    !!selectedContact &&
    'email' in selectedContact &&
    selectedContact.email.trim() !== '' &&
    projectName.trim() !== '' &&
    !mismatchError;

  const handlePreview = async () => {
    if (!isValid) return;

    const sanitizedMilestones = milestones.map((m) => ({
      ...m,
      amount: Number(m.amount ?? 0),
    }));

    const draft = generateDraftProposal({
      title: projectName,
      summary: projectScope,
      logoUrl:
        selectedContact && 'organization' in selectedContact
          ? selectedContact.organization?.logo ?? ''
          : '',
      contact: selectedContact ?? undefined,
      typeTags,
      milestones: sanitizedMilestones,
      paymentCycle,
      rate: paymentCycle === 'Hourly Rate' ? Number(hourlyRate) || 0 : undefined,
      depositRate: paymentCycle === 'Fixed Amount' ? upfrontPayment : undefined,
      totalBid: paymentCycle === 'Fixed Amount' ? Number(totalAmount) || 0 : undefined,
      customStartDate,
      endDate,
      maxHours: Number(maxHours) || 0,
      executionMethod,
      startType,
    });

    try {
      const res = await fetch('/api/proposals/preview-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });

      if (!res.ok) throw new Error('Failed to preview');

      router.push(
        '/freelancer-dashboard/projects-and-invoices/create-proposal/proposal-preview'
      );
    } catch (err) {
      console.error('Preview failed:', err);
    }
  };

  return (
    <section className="w-full px-4 md:px-10 py-6 flex flex-col gap-8">
      <ProposalHeader
        contactSelected={contactSelected}
        isCustomEmail={isCustomEmail}
        projectName={projectName}
        isValid={isValid}
        onSaveDraft={() => console.log('Saving draft...')}
        onCancel={() => console.log('Cancelled.')}
        onSend={() => console.log('Sending proposal...')}
        onPreview={handlePreview}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-6">
        <ProposalMetaInfo
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
          projectName={projectName}
          onChangeProjectName={setProjectName}
          typeTags={typeTags}
          onChangeTypeTags={setTypeTags}
        />

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

        {mismatchError && (
          <div className="text-sm text-red-600 font-medium -mt-2">{mismatchError}</div>
        )}

        <ProposalProjectScopeInput value={projectScope} onChange={setProjectScope} />

        <ProposalMilestonesEditor
          milestones={milestones}
          onChange={setMilestones}
          totalBid={Number(totalAmount) || 0}
          paymentCycle={paymentCycle}
          projectEndDate={endDate}
        />
      </div>
    </section>
  );
}