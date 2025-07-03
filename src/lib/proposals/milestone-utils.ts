// src/lib/proposals/milestone-utils.ts

export interface Milestone {
  title: string;
  amount?: number;
  [key: string]: any;
}

export function calculateTotalBid(milestones: Milestone[] = []): number {
  return milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
}
