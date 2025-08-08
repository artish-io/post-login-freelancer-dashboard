import { z } from 'zod';

// Basic types
export const zInvoiceNumber = z.string().min(1, 'Invoice number is required');
export const zOrderId = z.union([z.string().min(1), z.number()]).transform(v => String(v));
export const zMoney = z.number().positive('Amount must be positive');
export const zCurrency = z.string().min(3).max(6).regex(/^[A-Z]{3,6}$/, 'Invalid currency format');
export const zProjectId = z.union([z.string(), z.number()]).transform(v => Number(v));
export const zTaskId = z.union([z.string(), z.number()]).transform(v => Number(v));
export const zUserId = z.union([z.string(), z.number()]).transform(v => Number(v));

// Payment-related schemas
export const zTriggerBody = z.object({
  invoiceNumber: zInvoiceNumber,
});

export const zExecuteBody = z.object({
  invoiceNumber: zInvoiceNumber,
});

export const zWithdrawBody = z.object({
  amount: zMoney,
  currency: zCurrency,
  withdrawalId: z.string().optional(),
});

export const zStorefrontCreditBody = z.object({
  orderId: zOrderId,
  productId: z.union([z.string(), z.number()]),
  amount: zMoney,
  currency: zCurrency,
});

// Task and project schemas
export const zTaskApproveBody = z.object({
  taskId: zTaskId,
  projectId: zProjectId,
});

export const zTaskSubmitBody = z.object({
  taskId: zTaskId,
  projectId: zProjectId,
  link: z.string().url().optional(),
  notes: z.string().optional(),
});

export const zProjectStatusUpdateBody = z.object({
  projectId: zProjectId,
  status: z.enum(['proposed', 'ongoing', 'paused', 'completed', 'archived']),
});

// Gig and proposal schemas
export const zGigAcceptBody = z.object({
  gigId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  proposalId: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
});

export const zProposalCreateBody = z.object({
  gigId: z.union([z.string(), z.number()]).transform(v => Number(v)),
  coverLetter: z.string().min(10, 'Cover letter must be at least 10 characters'),
  proposedRate: zMoney,
  currency: zCurrency,
  estimatedDuration: z.string().optional(),
});

// Query parameter schemas
export const zWalletQuery = z.object({
  currency: zCurrency.optional(),
});

export const zPaginationQuery = z.object({
  page: z.string().transform(v => Math.max(1, parseInt(v) || 1)).optional(),
  limit: z.string().transform(v => Math.min(100, Math.max(1, parseInt(v) || 10))).optional(),
});

// Invoice creation schema
export const zInvoiceCreateBody = z.object({
  projectId: zProjectId,
  amount: zMoney,
  currency: zCurrency,
  method: z.enum(['completion', 'milestone']),
  milestoneNumber: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  description: z.string().optional(),
});

// Notification schemas
export const zNotificationMarkReadBody = z.object({
  notificationIds: z.array(z.union([z.string(), z.number()])),
});

// File upload schemas
export const zFileUploadBody = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive().max(50 * 1024 * 1024), // 50MB max
  projectId: zProjectId.optional(),
  taskId: zTaskId.optional(),
});

/**
 * Helper to parse and validate request body
 */
export async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw Object.assign(new Error(`Validation error: ${message}`), { 
        code: 'VALIDATION_ERROR', 
        status: 400 
      });
    }
    throw error;
  }
}

/**
 * Helper to parse and validate query parameters
 */
export function parseQuery<T>(url: URL, schema: z.ZodSchema<T>): T {
  try {
    const params = Object.fromEntries(url.searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw Object.assign(new Error(`Query validation error: ${message}`), { 
        code: 'VALIDATION_ERROR', 
        status: 400 
      });
    }
    throw error;
  }
}
