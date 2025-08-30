'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSuccessToast, useErrorToast } from '../../../../../components/ui/toast';

import ProposalHeader from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-header';
import ProposalMetaInfo from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-meta-info';
import ProposalScheduleSelect from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-schedule-select';
import ProposalExecutionMethod from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/proposal-execution-method';
import SimplifiedPaymentSection from '../../../../../components/freelancer-dashboard/projects-and-invoices/proposals/simplified-payment-section';
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

export default function CreateProposalPage() {
  const router = useRouter();
  const showSuccessToast = useSuccessToast();
  const showErrorToast = useErrorToast();

  const [selectedContact, setSelectedContact] = useState<Contact | { email: string } | null>(null);
  const [typeTags, setTypeTags] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [startType, setStartType] = useState<'Immediately' | 'Custom'>('Immediately');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [executionMethod, setExecutionMethod] = useState<ExecutionMethod>('completion');
  const [projectScope, setProjectScope] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [totalAmount, setTotalAmount] = useState('');

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
        if (data.totalBid) setTotalAmount(data.totalBid.toString());
        if (data.customStartDate) setCustomStartDate(new Date(data.customStartDate));
        if (data.endDate) setEndDate(new Date(data.endDate));
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

  // 💰 Simple validation for total amount
  useEffect(() => {
    const bid = Number(totalAmount) || 0;
    const milestoneSum = milestones.reduce((acc, m) => acc + Number(m.amount || 0), 0);

    if (executionMethod === 'milestone' && milestones.length > 0 && Math.round(milestoneSum) !== Math.round(bid)) {
      setMismatchError(
        `Milestones total ($${milestoneSum.toLocaleString()}) must equal total budget ($${bid.toLocaleString()})`
      );
    } else {
      setMismatchError(null);
    }
  }, [milestones, totalAmount, executionMethod]);

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
        totalBid: Number(totalAmount) || 0,
        customStartDate,
        endDate,
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
    totalAmount,
    selectedContact,
    typeTags,
    customStartDate,
    endDate,
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

  const handleSend = async () => {
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
      totalBid: Number(totalAmount) || 0,
      customStartDate,
      endDate,
      executionMethod,
      startType,
    });

    try {
      const res = await fetch('/api/proposals/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send proposal');
      }

      const result = await res.json(); // Get the response with proposal ID
      console.log('✅ FRONTEND: Proposal sent successfully:', result);

      // Show success message and redirect to the sent proposal page
      showSuccessToast('Proposal Sent!', 'Your proposal has been sent successfully.');

      // Navigate immediately with optimized navigation
      if (result.id) {
        console.log(`🔄 NAVIGATION: Attempting to navigate to proposal ${result.id}`);
        const targetUrl = `/freelancer-dashboard/projects-and-invoices/proposals/${result.id}`;
        console.log(`🔄 NAVIGATION: Target URL: ${targetUrl}`);

        // Use immediate navigation - toast will show during transition
        try {
          router.push(targetUrl);
          console.log(`✅ NAVIGATION: Router.push called successfully`);
        } catch (routerError) {
          console.error(`❌ NAVIGATION: Router.push failed:`, routerError);
          console.log(`🔄 NAVIGATION: Falling back to window.location.href`);
          window.location.href = targetUrl;
        }
      } else {
        console.log('🔄 NAVIGATION: No proposal ID returned, navigating to proposals list');
        // Fallback to proposals list if no ID returned
        router.push('/freelancer-dashboard/projects-and-invoices/proposals');
      }
    } catch (err) {
      console.error('Send failed:', err);
      showErrorToast('Failed to Send Proposal', err instanceof Error ? err.message : 'Unknown error occurred.');
    }
  };

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
      totalBid: Number(totalAmount) || 0,
      customStartDate,
      endDate,
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
    <motion.section
      className="w-full px-4 md:px-10 py-6 flex flex-col gap-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <ProposalHeader
          contactSelected={contactSelected}
          isCustomEmail={isCustomEmail}
          projectName={projectName}
          isValid={isValid}
          onSaveDraft={() => console.log('Saving draft...')}
          onCancel={() => router.back()}
          onSend={handleSend}
          onPreview={handlePreview}
        />
      </motion.div>

      <motion.div
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
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

        <SimplifiedPaymentSection
          executionMethod={executionMethod}
          totalAmount={totalAmount}
          onTotalAmountChange={setTotalAmount}
          milestoneCount={milestones.length}
        />

        {mismatchError && (
          <div className="text-sm text-red-600 font-medium -mt-2">{mismatchError}</div>
        )}

        <ProposalProjectScopeInput value={projectScope} onChange={setProjectScope} />

        <ProposalMilestonesEditor
          milestones={milestones}
          onChange={setMilestones}
          totalBid={Number(totalAmount) || 0}
          projectEndDate={endDate}
          executionMethod={executionMethod}
        />
      </motion.div>
    </motion.section>
  );
}