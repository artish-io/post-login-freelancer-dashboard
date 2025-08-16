/**
 * Project Duration Calculator
 * 
 * Standardized utility for calculating project duration and estimated hours
 * Handles short-duration projects correctly (less than 1 week)
 */

export interface ProjectDuration {
  totalDays: number;
  workDays: number;
  estimatedHours: number;
  deliveryTimeWeeks: number;
  breakdown: {
    hoursPerDay: number;
    workDaysPerWeek: number;
    calculation: string;
  };
}

export interface DurationCalculationOptions {
  hoursPerWorkDay?: number;
  workDaysPerWeek?: number;
  minimumHours?: number;
}

/**
 * Calculate project duration and estimated hours from start and end dates
 * Handles short projects (< 1 week) correctly by using day-based calculations
 */
export function calculateProjectDuration(
  startDate: Date | string,
  endDate: Date | string,
  options: DurationCalculationOptions = {}
): ProjectDuration {
  const {
    hoursPerWorkDay = 8,
    workDaysPerWeek = 5,
    minimumHours = 1
  } = options;

  // Convert to Date objects if needed
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end date provided');
  }

  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  // Calculate total calendar days
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate work days (accounting for weekends)
  const workDays = Math.max(1, Math.ceil(totalDays * (workDaysPerWeek / 7)));

  // Calculate estimated hours
  const estimatedHours = Math.max(minimumHours, workDays * hoursPerWorkDay);

  // Calculate delivery time in weeks (for compatibility with existing code)
  const deliveryTimeWeeks = Math.max(0.1, totalDays / 7); // Minimum 0.1 weeks for very short projects

  const calculation = `${totalDays} calendar days → ${workDays} work days × ${hoursPerWorkDay} hours/day = ${estimatedHours} hours`;

  return {
    totalDays,
    workDays,
    estimatedHours,
    deliveryTimeWeeks,
    breakdown: {
      hoursPerDay: hoursPerWorkDay,
      workDaysPerWeek,
      calculation
    }
  };
}

/**
 * Calculate hourly rate from budget and duration
 * Guards against division by zero and provides meaningful rates for short projects
 */
export function calculateHourlyRate(
  budget: number,
  duration: ProjectDuration
): {
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  explanation: string;
} {
  if (budget <= 0) {
    throw new Error('Budget must be greater than zero');
  }

  if (duration.estimatedHours <= 0) {
    throw new Error('Estimated hours must be greater than zero');
  }

  const hourlyRate = Math.round((budget / duration.estimatedHours) * 100) / 100;
  const dailyRate = Math.round((budget / duration.workDays) * 100) / 100;
  const weeklyRate = Math.round((budget / Math.max(0.1, duration.deliveryTimeWeeks)) * 100) / 100;

  let explanation: string;
  if (duration.totalDays < 7) {
    explanation = `Short project: $${budget} for ${duration.totalDays} days (${duration.workDays} work days) = $${hourlyRate}/hr`;
  } else if (duration.totalDays < 30) {
    explanation = `Medium project: $${budget} for ${Math.round(duration.deliveryTimeWeeks * 10) / 10} weeks = $${hourlyRate}/hr`;
  } else {
    explanation = `Long project: $${budget} for ${Math.round(duration.deliveryTimeWeeks)} weeks = $${hourlyRate}/hr`;
  }

  return {
    hourlyRate,
    dailyRate,
    weeklyRate,
    explanation
  };
}

/**
 * Calculate budget from hourly rate and duration
 */
export function calculateBudgetFromRate(
  hourlyRate: number,
  duration: ProjectDuration
): {
  totalBudget: number;
  breakdown: {
    hourlyRate: number;
    estimatedHours: number;
    calculation: string;
  };
} {
  if (hourlyRate <= 0) {
    throw new Error('Hourly rate must be greater than zero');
  }

  const totalBudget = Math.round(hourlyRate * duration.estimatedHours * 100) / 100;
  const calculation = `$${hourlyRate}/hr × ${duration.estimatedHours} hours = $${totalBudget}`;

  return {
    totalBudget,
    breakdown: {
      hourlyRate,
      estimatedHours: duration.estimatedHours,
      calculation
    }
  };
}

/**
 * Validate project duration for business rules
 */
export function validateProjectDuration(duration: ProjectDuration): {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check for very short projects
  if (duration.totalDays < 1) {
    warnings.push('Project duration is less than 1 day');
    recommendations.push('Consider extending the project timeline for better quality deliverables');
  }

  // Check for very long projects
  if (duration.totalDays > 365) {
    warnings.push('Project duration exceeds 1 year');
    recommendations.push('Consider breaking this into smaller milestone-based projects');
  }

  // Check for unrealistic hour estimates
  if (duration.estimatedHours < 4) {
    warnings.push('Very low hour estimate may not be realistic for quality work');
    recommendations.push('Consider if the scope can be completed in the estimated time');
  }

  if (duration.estimatedHours > 2000) {
    warnings.push('Very high hour estimate suggests a complex project');
    recommendations.push('Consider milestone-based execution for better project management');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    recommendations
  };
}

/**
 * Format duration for display
 */
export function formatDuration(duration: ProjectDuration): string {
  if (duration.totalDays === 1) {
    return '1 day';
  } else if (duration.totalDays < 7) {
    return `${duration.totalDays} days`;
  } else if (duration.totalDays < 30) {
    const weeks = Math.round(duration.deliveryTimeWeeks * 10) / 10;
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else if (duration.totalDays < 365) {
    const months = Math.round(duration.totalDays / 30);
    return months === 1 ? '1 month' : `${months} months`;
  } else {
    const years = Math.round(duration.totalDays / 365 * 10) / 10;
    return years === 1 ? '1 year' : `${years} years`;
  }
}

/**
 * Get recommended execution method based on project duration
 */
export function getRecommendedExecutionMethod(duration: ProjectDuration): {
  recommended: 'completion' | 'milestone';
  reason: string;
} {
  if (duration.totalDays <= 7) {
    return {
      recommended: 'completion',
      reason: 'Short projects (≤1 week) work well with completion-based payment'
    };
  } else if (duration.totalDays <= 30) {
    return {
      recommended: 'completion',
      reason: 'Medium projects (≤1 month) can use either method, completion is simpler'
    };
  } else {
    return {
      recommended: 'milestone',
      reason: 'Long projects (>1 month) benefit from milestone-based payment for better cash flow'
    };
  }
}
