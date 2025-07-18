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
  const fallbackStart = data.startType === 'Immediately' ? today : new Date(data.customStartDate ?? today);
  const end = new Date(data.endDate ?? today);

  const durationInDays = Math.max(
    1,
    Math.ceil((end.getTime() - fallbackStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  console.log('📅 Effective start:', fallbackStart.toISOString());
  console.log('📅 Project end:', end.toISOString());
  console.log('📏 Duration in days:', durationInDays);

  const totalBid = data.totalBid || 0;

  // Calculate payment details based on execution method
  let upfrontAmount = 0;
  let upfrontPercentage = 0;
  let milestoneTotal = 0;
  let amountPerMilestone = 0;

  if (data.executionMethod === 'completion') {
    // Completion-based: 12% upfront commitment
    upfrontPercentage = 12;
    upfrontAmount = Math.round((totalBid * 12) / 100);
  } else if (data.executionMethod === 'milestone') {
    // Milestone-based: evenly distributed across milestones
    milestoneTotal = sanitizedMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    amountPerMilestone = sanitizedMilestones.length > 0 ? totalBid / sanitizedMilestones.length : 0;
  }

  console.log('💰 Total Bid:', totalBid);
  console.log('💰 Execution Method:', data.executionMethod);
  console.log('💰 Upfront Amount:', upfrontAmount);
  console.log('💸 Milestone Total:', milestoneTotal);

  return {
    ...data,
    milestones: sanitizedMilestones,
    projectId,
    totalBid,
    expectedDurationDays: durationInDays,
    upfrontAmount,
    upfrontPercentage,
    milestoneTotal,
    amountPerMilestone,
  };
}