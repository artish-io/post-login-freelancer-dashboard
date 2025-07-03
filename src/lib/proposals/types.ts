// src/lib/proposals/types.ts

export interface Milestone {
  title: string;
  amount?: number;
  [key: string]: any;
}

export type PaymentCycle = 'Fixed Amount' | 'Hourly Rate';

export type StartMode = 'immediate' | 'custom';

export interface ProposalInput {
  title?: string;
  summary?: string;
  logoUrl?: string;
  paymentCycle?: PaymentCycle;
  rate?: number;
  depositRate?: string;
  typeTags?: string[];
  milestones?: Milestone[];
  customStartDate?: Date | string | null;
  endDate?: Date | string | null;
  maxHours?: number | string;
  startMode?: StartMode;
  [key: string]: any;
}

export interface DraftProposal extends ProposalInput {
  projectId: string;
  totalBid: number;
  expectedDurationDays: number;

  // ✅ NEW FIELDS FOR VALIDATION + UX DISPLAY
  milestoneTotal: number;
  upfrontAmount: number;
  isAmountValid: boolean;
}