// src/lib/proposals/generate-draft.ts

import { DraftProposal, ProposalInput } from './types';
import { calculateTotalBid } from './milestone-utils';
import { calculateHourlyProposalTotal } from './hourly-utils';
import { generateCustomProjectId } from '../project-id-utils';

export function generateDraftProposal(data: ProposalInput): DraftProposal {
  const userName = data?.user?.name || 'Temp User';
  const projectId = generateCustomProjectId(userName);

  const sanitizedMilestones = (data.milestones || []).map((m) => ({
    ...m,
    amount: typeof m.amount === 'string' ? Number(m.amount) || 0 : m.amount || 0,
  }));

  const today = new Date();
  const fallbackStart = data.startMode === 'immediate' ? today : new Date(data.customStartDate ?? today);
  const end = new Date(data.endDate ?? today);

  const durationInDays = Math.max(
    1,
    Math.ceil((end.getTime() - fallbackStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  console.log('📅 Effective start:', fallbackStart.toISOString());
  console.log('📅 Project end:', end.toISOString());
  console.log('📏 Duration in days:', durationInDays);

  const totalBid =
    data.paymentCycle === 'Hourly Rate'
      ? calculateHourlyProposalTotal(
          fallbackStart,
          end,
          Number(data.rate) || 0,
          Number(data.maxHours) || 0
        )
      : calculateTotalBid(sanitizedMilestones);

  const depositRate = Number(data.depositRate) || 0;
  const upfrontAmount = Math.round((totalBid * depositRate) / 100);
  const milestoneTotal = sanitizedMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  const isAmountValid = data.paymentCycle === 'Hourly Rate'
    ? true
    : milestoneTotal + upfrontAmount === totalBid;

  console.log('💰 Upfront:', upfrontAmount);
  console.log('💸 Milestone Total:', milestoneTotal);
  console.log('✅ Valid Amount Split:', isAmountValid);

  return {
    ...data,
    milestones: sanitizedMilestones,
    projectId,
    totalBid,
    expectedDurationDays: durationInDays,
    upfrontAmount,
    milestoneTotal,
    isAmountValid,
  };
}