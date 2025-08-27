/**
 * Zod Schemas for Storage Validation
 * 
 * Provides strict validation for all data structures used in hierarchical storage.
 * Ensures data integrity and type safety across the application.
 */

import { z } from 'zod';

/**
 * Project Schema
 */
export const ProjectSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, 'Project title is required'),
  description: z.string().optional(),
  organizationId: z.number().int().positive().optional(),
  typeTags: z.array(z.string()).optional(),
  commissionerId: z.number().int().positive().optional(),
  freelancerId: z.number().int().positive(),
  status: z.enum(['proposed', 'ongoing', 'paused', 'completed', 'archived', 'Proposed', 'Ongoing', 'Paused', 'Completed', 'Archived']),
  dueDate: z.string().optional(), // Allow both date and datetime formats
  totalTasks: z.number().int().nonnegative().optional(),
  invoicingMethod: z.enum(['completion', 'milestone']).default('completion'),

  // 🛡️ DURATION GUARD: Date separation and duration persistence
  gigId: z.number().int().positive().optional(), // Link to original gig
  gigPostedDate: z.string().optional(), // When the gig was originally posted
  projectActivatedAt: z.string().optional(), // When the project was activated (matched)
  originalDuration: z.object({
    deliveryTimeWeeks: z.number().nonnegative().optional(),
    estimatedHours: z.number().nonnegative().optional(),
    originalStartDate: z.string().optional(), // Original intended start from gig
    originalEndDate: z.string().optional(), // Original intended end from gig
  }).optional(),
  totalBudget: z.number().nonnegative().optional(),
  upfrontCommitment: z.number().nonnegative().optional(),
  paidToDate: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  manager: z.object({
    name: z.string(),
    title: z.string(),
    avatar: z.string(),
    email: z.string().email()
  }).optional(),
  // Allow extra fields for backward compatibility
  budget: z.object({
    lower: z.number().optional(),
    upper: z.number().optional(),
    currency: z.string().optional()
  }).optional(),
  id: z.number().optional(), // Legacy field
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  toolsRequired: z.array(z.string()).optional(),
  estimatedHours: z.number().optional(),
  deliveryTimeWeeks: z.number().optional()
}).passthrough(); // Allow extra fields instead of strict

/**
 * Project Task Schema
 */
export const ProjectTaskSchema = z.object({
  taskId: z.number().int().positive(),
  projectId: z.string().min(1),
  projectTitle: z.string().min(1),
  organizationId: z.number().int().nonnegative().optional(),
  projectTypeTags: z.array(z.string()).optional(),
  freelancerId: z.number().int().positive().optional(),
  title: z.string().min(1, 'Task title is required'),
  status: z.enum(['Ongoing', 'Submitted', 'In review', 'review', 'Rejected', 'Approved', 'done', 'in_progress']),
  completed: z.boolean(),
  order: z.number().int().nonnegative(),
  link: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  rejected: z.boolean().default(false),
  feedbackCount: z.number().int().nonnegative().default(0),
  pushedBack: z.boolean().default(false),
  version: z.number().int().positive().default(1),
  description: z.string().optional(),
  submittedDate: z.string().datetime().optional(),
  approvedDate: z.string().datetime().optional(),
  rejectedDate: z.string().datetime().optional(),
  createdDate: z.string().datetime(),
  lastModified: z.string().datetime(),
  // 🔒 COMPLETION-SPECIFIC: Additional fields for completion projects
  manualInvoiceEligible: z.boolean().optional(),
  invoicePaid: z.boolean().optional(),
  approvedBy: z.number().int().positive().optional(),

  // 🛡️ DURATION GUARD: Task-level duration information
  taskActivatedAt: z.string().datetime().optional(), // When this specific task was created/activated
  originalTaskDuration: z.object({
    estimatedHours: z.number().nonnegative().optional(),
    originalDueDate: z.string().optional(), // Original due date from gig milestone
  }).optional()
}).passthrough(); // Allow additional fields for extensibility

/**
 * Validation error type
 */
export interface ValidationError {
  success: false;
  code: 'VALIDATION_ERROR';
  message: string;
  details: z.ZodError;
}

/**
 * Parse and validate project data
 */
export function parseProject(data: unknown): z.infer<typeof ProjectSchema> {
  try {
    return ProjectSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: ValidationError = {
        success: false,
        code: 'VALIDATION_ERROR',
        message: `Project validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        details: error
      };
      throw validationError;
    }
    throw error;
  }
}

/**
 * Parse and validate task data
 */
export function parseTask(data: unknown): z.infer<typeof ProjectTaskSchema> {
  try {
    return ProjectTaskSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError: ValidationError = {
        success: false,
        code: 'VALIDATION_ERROR',
        message: `Task validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        details: error
      };
      throw validationError;
    }
    throw error;
  }
}

/**
 * Validate project data without throwing
 */
export function validateProject(data: unknown): { success: true; data: z.infer<typeof ProjectSchema> } | ValidationError {
  try {
    const validData = parseProject(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'VALIDATION_ERROR') {
      return error as ValidationError;
    }
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Unknown validation error',
      details: new z.ZodError([])
    };
  }
}

/**
 * Validate task data without throwing
 */
export function validateTask(data: unknown): { success: true; data: z.infer<typeof ProjectTaskSchema> } | ValidationError {
  try {
    const validData = parseTask(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'VALIDATION_ERROR') {
      return error as ValidationError;
    }
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Unknown validation error',
      details: new z.ZodError([])
    };
  }
}

/**
 * Type exports
 */
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectTask = z.infer<typeof ProjectTaskSchema>;
