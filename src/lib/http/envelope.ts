// src/lib/http/envelope.ts
// Standard response envelope for all API routes
// Provides consistent structure for success/error responses with observability

export interface SuccessEnvelope<T extends Record<string, any> = Record<string, any>> {
  ok: true;
  requestId: string;
  entities: T;
  refreshHints: string[];
  notificationsQueued: boolean;
  message?: string;
}

export interface ErrorEnvelope {
  ok: false;
  requestId: string;
  code: string;
  message: string;
  status: number;
}

export type ApiEnvelope<T extends Record<string, any> = Record<string, any>> = 
  | SuccessEnvelope<T> 
  | ErrorEnvelope;

/**
 * Create a standardized success response envelope
 * @param payload - Response data including entities, refresh hints, etc.
 * @returns Standardized success envelope
 */
export function ok<T extends Record<string, any>>(payload: {
  entities?: T;
  refreshHints?: string[];
  notificationsQueued?: boolean;
  message?: string;
}): SuccessEnvelope<T> {
  const requestId = crypto.randomUUID();
  return {
    ok: true,
    requestId,
    entities: payload.entities ?? {} as T,
    refreshHints: payload.refreshHints ?? [],
    notificationsQueued: !!payload.notificationsQueued,
    message: payload.message,
  };
}

/**
 * Create a standardized error response envelope
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @returns Standardized error envelope
 */
export function err(code: string, message: string, status = 400): ErrorEnvelope {
  const requestId = crypto.randomUUID();
  return {
    ok: false,
    requestId,
    code,
    message,
    status,
  };
}

/**
 * Common refresh hints for different domains
 */
export const RefreshHints = {
  // Wallet-related updates
  WALLET_SUMMARY: 'wallet:summary',
  WALLET_TRANSACTIONS: 'wallet:transactions',
  
  // Invoice-related updates
  INVOICES_LIST: 'invoices:list',
  INVOICE_DETAIL: 'invoice:detail',
  
  // Transaction-related updates
  TRANSACTIONS_LIST: 'transactions:list',
  TRANSACTION_DETAIL: 'transaction:detail',
  
  // Project-related updates
  PROJECTS_OVERVIEW: 'projects:overview',
  PROJECT_DETAIL: 'project:detail',
  PROJECT_TASKS: 'project:tasks',
  
  // Task-related updates
  TASKS_LIST: 'tasks:list',
  TASK_DETAIL: 'task:detail',
  
  // Notification updates
  NOTIFICATIONS: 'notifications',
  
  // Dashboard updates
  DASHBOARD: 'dashboard',
  
  // Gig-related updates
  GIGS_LIST: 'gigs:list',
  GIG_DETAIL: 'gig:detail',
} as const;

/**
 * Common error codes for consistent error handling
 */
export const ErrorCodes = {
  // Authentication/Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  FORBIDDEN_OWNER: 'FORBIDDEN_OWNER',
  FORBIDDEN_USER_TYPE: 'FORBIDDEN_USER_TYPE',
  FORBIDDEN_PROJECT_ACCESS: 'FORBIDDEN_PROJECT_ACCESS',
  FORBIDDEN_PROJECT_FREELANCER: 'FORBIDDEN_PROJECT_FREELANCER',
  FORBIDDEN_PROJECT_COMMISSIONER: 'FORBIDDEN_PROJECT_COMMISSIONER',
  INVALID_SESSION: 'INVALID_SESSION',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Business Logic
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  DUPLICATE_OPERATION: 'DUPLICATE_OPERATION',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INVALID_ORDER_MAPPING: 'INVALID_ORDER_MAPPING',

  // Payment specific
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_NOT_ELIGIBLE: 'PAYMENT_NOT_ELIGIBLE',
  WITHDRAWAL_LIMIT_EXCEEDED: 'WITHDRAWAL_LIMIT_EXCEEDED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

/**
 * Helper to create common error responses
 */
export const CommonErrors = {
  unauthorized: () => err(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401),
  forbidden: (message = 'Access denied') => err(ErrorCodes.FORBIDDEN, message, 403),
  notFound: (resource = 'Resource') => err(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),
  validation: (message: string) => err(ErrorCodes.VALIDATION_ERROR, message, 400),
  conflict: (message: string) => err(ErrorCodes.DUPLICATE_OPERATION, message, 409),
  internal: (message = 'Internal server error') => err(ErrorCodes.INTERNAL_ERROR, message, 500),
};

/**
 * Convert thrown errors to proper response envelopes
 */
export function handleRouteError(error: any): ErrorEnvelope {
  // Handle our custom errors with status codes
  if (error.status && error.code) {
    return err(error.code, error.message, error.status);
  }

  // Handle validation errors
  if (error.name === 'ZodError') {
    const message = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Validation failed';
    return err(ErrorCodes.VALIDATION_ERROR, message, 400);
  }

  // Handle generic errors
  console.error('Unhandled route error:', error);
  return err(
    ErrorCodes.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    500
  );
}

/**
 * Wrapper for route handlers with consistent error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const errorResponse = handleRouteError(error);
      return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
