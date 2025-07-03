// src/lib/proposal-validation.ts

import { ProposalInput } from './proposals/types';

export function isValidProposalData(data: any): data is ProposalInput {
  return !!data?.title && Array.isArray(data.milestones);
}