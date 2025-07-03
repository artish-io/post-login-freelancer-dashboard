// src/lib/proposals/hourly-utils.ts

export function calculateHourlyProposalTotal(
  startDate: Date | string | null,
  endDate: Date | string | null,
  rate: number | string | undefined,
  maxHours: number | string | undefined
): number {
  if (!startDate || !endDate || !rate || !maxHours) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const workDays = Math.ceil((totalDays / 7) * 5); // 5 workdays per 7-day week

  return workDays * Number(rate) * Number(maxHours);
}
