/**
 * Gig Input Validation
 * Strict runtime validation for gig creation requests
 */

export interface GigInput {
  title: string;
  budget: number;
  executionMethod: 'completion' | 'milestone';
  invoicingMethod?: 'completion' | 'milestone';
  commissionerId: number;
  createdAt?: string;
  description?: string;
  tags?: string[];
  category?: string;
  subcategory?: string;
  skills?: string[];
  tools?: string[];
  deliveryTimeWeeks?: number;
  estimatedHours?: number;
  lowerBudget?: number;
  upperBudget?: number;
  startType?: 'Immediately' | 'Custom';
  customStartDate?: string;
  endDate?: string;
  milestones?: Array<{
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }>;
  isPublic?: boolean;
  isTargetedRequest?: boolean;
  targetFreelancerId?: number;
  organizationData?: {
    id?: number;
    name: string;
    [key: string]: unknown;
  };
}

/**
 * Runtime type guard for gig input validation
 */
export function isGigInput(x: any): x is GigInput {
  return (
    x &&
    typeof x === 'object' &&
    typeof x.title === 'string' &&
    x.title.trim().length > 0 &&
    Number.isFinite(x.budget) &&
    x.budget > 0 &&
    (x.executionMethod === 'completion' || x.executionMethod === 'milestone') &&
    (x.invoicingMethod === undefined || x.invoicingMethod === 'completion' || x.invoicingMethod === 'milestone') &&
    Number.isFinite(x.commissionerId) &&
    x.commissionerId > 0 &&
    // Optional fields validation
    (x.createdAt === undefined || typeof x.createdAt === 'string') &&
    (x.description === undefined || typeof x.description === 'string') &&
    (x.tags === undefined || Array.isArray(x.tags)) &&
    (x.category === undefined || typeof x.category === 'string') &&
    (x.subcategory === undefined || typeof x.subcategory === 'string') &&
    (x.skills === undefined || Array.isArray(x.skills)) &&
    (x.tools === undefined || Array.isArray(x.tools)) &&
    (x.deliveryTimeWeeks === undefined || Number.isFinite(x.deliveryTimeWeeks)) &&
    (x.estimatedHours === undefined || Number.isFinite(x.estimatedHours)) &&
    (x.lowerBudget === undefined || Number.isFinite(x.lowerBudget)) &&
    (x.upperBudget === undefined || Number.isFinite(x.upperBudget)) &&
    (x.startType === undefined || x.startType === 'Immediately' || x.startType === 'Custom') &&
    (x.customStartDate === undefined || typeof x.customStartDate === 'string') &&
    (x.endDate === undefined || typeof x.endDate === 'string') &&
    (x.milestones === undefined || Array.isArray(x.milestones)) &&
    (x.isPublic === undefined || typeof x.isPublic === 'boolean') &&
    (x.isTargetedRequest === undefined || typeof x.isTargetedRequest === 'boolean') &&
    (x.targetFreelancerId === undefined || Number.isFinite(x.targetFreelancerId)) &&
    (x.organizationData === undefined || (
      typeof x.organizationData === 'object' &&
      x.organizationData !== null &&
      typeof x.organizationData.name === 'string'
    ))
  );
}

/**
 * Validate and normalize gig input
 */
export function validateGigInput(data: unknown): {
  isValid: boolean;
  error?: string;
  gigData?: GigInput;
} {
  if (!isGigInput(data)) {
    return {
      isValid: false,
      error: 'Missing or invalid required fields: title (string), budget (positive number), executionMethod (completion|milestone), commissionerId (positive number)'
    };
  }

  // Additional business logic validation
  if (data.executionMethod === 'milestone' && (!data.milestones || data.milestones.length === 0)) {
    return {
      isValid: false,
      error: 'Milestone execution method requires at least one milestone'
    };
  }

  if (data.isTargetedRequest && !data.targetFreelancerId) {
    return {
      isValid: false,
      error: 'Targeted requests require a targetFreelancerId'
    };
  }

  if (data.startType === 'Custom' && !data.customStartDate) {
    return {
      isValid: false,
      error: 'Custom start type requires a customStartDate'
    };
  }

  // Validate date formats if provided
  if (data.createdAt) {
    try {
      new Date(data.createdAt);
    } catch {
      return {
        isValid: false,
        error: 'Invalid createdAt date format'
      };
    }
  }

  if (data.customStartDate) {
    try {
      new Date(data.customStartDate);
    } catch {
      return {
        isValid: false,
        error: 'Invalid customStartDate format'
      };
    }
  }

  if (data.endDate) {
    try {
      new Date(data.endDate);
    } catch {
      return {
        isValid: false,
        error: 'Invalid endDate format'
      };
    }
  }

  return {
    isValid: true,
    gigData: data
  };
}
