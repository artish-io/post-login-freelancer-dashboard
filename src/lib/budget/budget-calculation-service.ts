/**
 * Budget Calculation Service
 * 
 * Handles budget vs hourly rate calculations and project budget determination
 */

export interface BudgetRange {
  min?: number;
  max?: number;
  currency?: string;
}

export interface FreelancerRate {
  rateString: string; // e.g., "$50 - $75/hr"
  minRate: number;
  maxRate: number;
  avgRate: number;
}

export interface ProjectBudgetCalculation {
  finalHourlyRate: number;
  totalProjectBudget: number;
  estimatedHours: number;
  rateSource: 'freelancer' | 'project_limit' | 'default';
  explanation: string;
  breakdown: {
    freelancerRequestedRate: number;
    projectBudgetLimit: number;
    rateUsed: number;
    budgetConstraintApplied: boolean;
  };
}

/**
 * Parse freelancer rate string into structured data
 */
export function parseFreelancerRate(rateString: string): FreelancerRate {
  // Handle various rate formats:
  // "$50 - $75/hr", "$50/hr", "$50-$75/hr", etc.
  const cleanRate = rateString.replace(/[^\d\-$]/g, '');
  const matches = cleanRate.match(/\$(\d+)(?:-\$(\d+))?/);
  
  if (!matches) {
    // Fallback for unparseable rates
    return {
      rateString,
      minRate: 50,
      maxRate: 50,
      avgRate: 50
    };
  }
  
  const minRate = parseInt(matches[1]);
  const maxRate = matches[2] ? parseInt(matches[2]) : minRate;
  const avgRate = (minRate + maxRate) / 2;
  
  return {
    rateString,
    minRate,
    maxRate,
    avgRate
  };
}

/**
 * Calculate project budget based on freelancer rate and project constraints
 */
export function calculateProjectBudget(
  freelancerRateString: string,
  projectBudgetRange: BudgetRange,
  estimatedHours: number = 40,
  projectType: 'completion' | 'milestone' = 'completion'
): ProjectBudgetCalculation {
  
  const freelancerRate = parseFreelancerRate(freelancerRateString);
  const freelancerRequestedBudget = freelancerRate.avgRate * estimatedHours;
  const projectMaxBudget = projectBudgetRange.max || Infinity;
  const projectMinBudget = projectBudgetRange.min || 0;
  
  let finalHourlyRate: number;
  let totalProjectBudget: number;
  let rateSource: 'freelancer' | 'project_limit' | 'default';
  let explanation: string;
  let budgetConstraintApplied = false;
  
  if (freelancerRequestedBudget <= projectMaxBudget && freelancerRequestedBudget >= projectMinBudget) {
    // Freelancer rate fits within project budget range
    finalHourlyRate = freelancerRate.avgRate;
    totalProjectBudget = freelancerRequestedBudget;
    rateSource = 'freelancer';
    explanation = `Using freelancer's rate of $${freelancerRate.avgRate}/hr for ${estimatedHours} hours`;
    
  } else if (freelancerRequestedBudget > projectMaxBudget) {
    // Project budget limits the rate (freelancer asking too much)
    finalHourlyRate = projectMaxBudget / estimatedHours;
    totalProjectBudget = projectMaxBudget;
    rateSource = 'project_limit';
    budgetConstraintApplied = true;
    explanation = `Project budget limits rate to $${finalHourlyRate.toFixed(2)}/hr (freelancer requested $${freelancerRate.avgRate}/hr)`;
    
  } else {
    // Freelancer rate is below minimum budget (rare case)
    finalHourlyRate = Math.max(freelancerRate.avgRate, projectMinBudget / estimatedHours);
    totalProjectBudget = finalHourlyRate * estimatedHours;
    rateSource = freelancerRate.avgRate >= (projectMinBudget / estimatedHours) ? 'freelancer' : 'project_limit';
    explanation = `Using ${rateSource === 'freelancer' ? 'freelancer' : 'project minimum'} rate of $${finalHourlyRate}/hr`;
  }
  
  return {
    finalHourlyRate: Math.round(finalHourlyRate * 100) / 100,
    totalProjectBudget: Math.round(totalProjectBudget * 100) / 100,
    estimatedHours,
    rateSource,
    explanation,
    breakdown: {
      freelancerRequestedRate: freelancerRate.avgRate,
      projectBudgetLimit: projectMaxBudget,
      rateUsed: finalHourlyRate,
      budgetConstraintApplied
    }
  };
}

/**
 * Calculate invoice amounts based on project type and budget
 */
export function calculateInvoiceAmounts(
  projectBudget: number,
  projectType: 'completion' | 'milestone',
  totalTasks: number,
  paidTasks: number = 0
): {
  upfrontAmount?: number;
  remainingAmount?: number;
  amountPerTask: number;
  amountPerMilestone?: number;
  breakdown: string;
} {
  
  if (projectType === 'completion') {
    // COMPLETION-BASED: 12% upfront, 88% divided among tasks
    const upfrontAmount = Math.round(projectBudget * 0.12 * 100) / 100;
    const remainingBudget = projectBudget - upfrontAmount;
    const remainingTasks = Math.max(1, totalTasks - paidTasks);
    const amountPerTask = Math.round((remainingBudget / remainingTasks) * 100) / 100;
    
    return {
      upfrontAmount,
      remainingAmount: remainingBudget,
      amountPerTask,
      breakdown: `Completion-based: $${upfrontAmount} upfront (12%), $${amountPerTask} per task for ${remainingTasks} remaining tasks`
    };
    
  } else {
    // MILESTONE-BASED: No upfront, total budget divided evenly across all milestones
    const amountPerMilestone = Math.round((projectBudget / totalTasks) * 100) / 100;
    
    return {
      amountPerTask: amountPerMilestone,
      amountPerMilestone,
      breakdown: `Milestone-based: $${amountPerMilestone} per milestone (${totalTasks} total milestones)`
    };
  }
}

/**
 * Validate if a freelancer should be able to apply to a gig based on rate compatibility
 */
export function validateRateCompatibility(
  freelancerRateString: string,
  projectBudgetRange: BudgetRange,
  estimatedHours: number = 40
): {
  canApply: boolean;
  reason: string;
  suggestedAction?: string;
  rateGap?: number;
} {
  
  const freelancerRate = parseFreelancerRate(freelancerRateString);
  const freelancerMinBudget = freelancerRate.minRate * estimatedHours;
  const projectMaxBudget = projectBudgetRange.max || Infinity;
  
  if (freelancerMinBudget <= projectMaxBudget) {
    return {
      canApply: true,
      reason: 'Freelancer rate is compatible with project budget'
    };
  }
  
  const rateGap = freelancerMinBudget - projectMaxBudget;
  const hourlyGap = rateGap / estimatedHours;
  
  return {
    canApply: false,
    reason: `Freelancer minimum rate ($${freelancerRate.minRate}/hr) exceeds project budget limit`,
    suggestedAction: `Consider reducing your rate by $${hourlyGap.toFixed(2)}/hr or look for higher-budget projects`,
    rateGap: hourlyGap
  };
}

/**
 * Get recommended budget range for a project based on market rates
 */
export function getRecommendedBudgetRange(
  projectType: string,
  complexity: 'simple' | 'medium' | 'complex',
  estimatedHours: number = 40
): BudgetRange {
  
  // Base rates by complexity (these could be configurable)
  const baseRates = {
    simple: { min: 25, max: 50 },
    medium: { min: 50, max: 100 },
    complex: { min: 100, max: 200 }
  };
  
  const rates = baseRates[complexity];
  
  return {
    min: rates.min * estimatedHours,
    max: rates.max * estimatedHours,
    currency: 'USD'
  };
}

/**
 * Calculate remaining budget after task payouts for completion-based projects
 */
export function calculateRemainingBudget(
  originalBudget: number,
  upfrontPaid: number,
  taskPayouts: number[],
  totalTasks: number
): {
  remainingBudget: number;
  paidTasks: number;
  remainingTasks: number;
  newAmountPerTask: number;
  redistributionNeeded: boolean;
} {
  
  const totalPaidOut = upfrontPaid + taskPayouts.reduce((sum, amount) => sum + amount, 0);
  const remainingBudget = originalBudget - totalPaidOut;
  const paidTasks = taskPayouts.length;
  const remainingTasks = Math.max(1, totalTasks - paidTasks);
  const newAmountPerTask = Math.round((remainingBudget / remainingTasks) * 100) / 100;
  
  // Check if redistribution is needed (if manual payouts changed the per-task amount)
  const originalAmountPerTask = Math.round(((originalBudget - upfrontPaid) / totalTasks) * 100) / 100;
  const redistributionNeeded = Math.abs(newAmountPerTask - originalAmountPerTask) > 0.01;
  
  return {
    remainingBudget,
    paidTasks,
    remainingTasks,
    newAmountPerTask,
    redistributionNeeded
  };
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Parse budget range from string format
 */
export function parseBudgetRange(budgetString: string): BudgetRange {
  // Handle formats like "$1000 - $5000", "$1000-$5000", "$1000", etc.
  const cleanBudget = budgetString.replace(/[^\d\-$]/g, '');
  const matches = cleanBudget.match(/\$(\d+)(?:-\$(\d+))?/);
  
  if (!matches) {
    return { min: 1000, max: 5000, currency: 'USD' };
  }
  
  const min = parseInt(matches[1]);
  const max = matches[2] ? parseInt(matches[2]) : min;
  
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
    currency: 'USD'
  };
}
