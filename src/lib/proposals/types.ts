// src/lib/proposals/types.ts

export interface Milestone {
  title: string;
  amount?: number;
  [key: string]: any;
}

export type ExecutionMethod = 'completion' | 'milestone';

export type StartMode = 'immediate' | 'custom';

export interface ProposalInput {
  title?: string;
  summary?: string;
  logoUrl?: string;
  executionMethod?: ExecutionMethod;
  totalBid?: number;
  typeTags?: string[];
  milestones?: Milestone[];
  customStartDate?: Date | string | null;
  endDate?: Date | string | null;
  startType?: 'Immediately' | 'Custom';
  [key: string]: any;
}

export interface DraftProposal extends ProposalInput {
  projectId: string;
  totalBid: number;
  expectedDurationDays: number;

  // ✅ FIELDS FOR COMPLETION-BASED PAYMENT
  upfrontAmount?: number; // 12% of total for completion-based
  upfrontPercentage?: number; // Always 12% for completion-based

  // ✅ FIELDS FOR MILESTONE-BASED PAYMENT
  milestoneTotal?: number;
  amountPerMilestone?: number;
}