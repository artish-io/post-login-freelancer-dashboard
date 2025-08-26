/**
 * Transaction Service
 * 
 * Provides atomic operations for task approval, project completion,
 * and invoice generation with rollback capabilities
 */

import { UnifiedStorageService } from '../storage/unified-storage-service';
import { generateInvoiceWithRetry } from '../invoices/robust-invoice-service';
import { checkAndAutoCompleteProject } from '../project-completion/auto-completion-service';
import { readProject } from '../projects-utils';

export interface TransactionStep {
  id: string;
  type: 'task_update' | 'project_update' | 'invoice_generation' | 'notification' | 'custom';
  operation: () => Promise<any>;
  rollback: () => Promise<void>;
  description: string;
  data?: any;
}

export interface TransactionResult {
  success: boolean;
  transactionId: string;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
  rollbackPerformed: boolean;
  results: Record<string, any>;
}

export interface TaskApprovalTransaction {
  taskId: number;
  projectId: number | string;
  freelancerId: number;
  commissionerId: number;
  taskTitle: string;
  projectTitle: string;
  generateInvoice: boolean;
  invoiceType?: 'completion' | 'milestone';
}

export interface CommissionerMatchingTransaction {
  applicationId: number;
  gigId: number;
  freelancerId: number;
  commissionerId: number;
  gigData: any;
  generateUpfrontInvoice?: boolean;
}

/**
 * Execute task approval with transaction integrity
 */
export async function executeTaskApprovalTransaction(
  params: TaskApprovalTransaction
): Promise<TransactionResult> {
  const transactionId = `task_approval_${params.taskId}_${Date.now()}`;

  console.log(`🔄 Starting task approval transaction ${transactionId}...`);
  console.log(`[EXEC_PATH] Transaction params:`, {
    taskId: params.taskId,
    projectId: params.projectId,
    generateInvoice: params.generateInvoice,
    invoiceType: params.invoiceType
  });

  const steps: TransactionStep[] = [];
  const completedSteps: string[] = [];
  const results: Record<string, any> = {};
  
  try {
    // Step 1: Get current task state for rollback
    const originalTask = await UnifiedStorageService.getTaskById(params.taskId);
    if (!originalTask) {
      throw new Error(`Task ${params.taskId} not found`);
    }

    const originalTaskState = { ...originalTask };

    // Step 2: Update task to approved using unified storage
    steps.push({
      id: 'update_task',
      type: 'task_update',
      operation: async () => {
        const updatedTask = {
          ...originalTask,
          status: 'Approved' as const,
          completed: true,
          rejected: false,
          approvedDate: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };

        await UnifiedStorageService.saveTask(updatedTask);
        
        return updatedTask;
      },
      rollback: async () => {
        console.log(`🔙 Rolling back task ${params.taskId} to original state...`);
        await UnifiedStorageService.saveTask(originalTaskState);
      },
      description: `Approve task ${params.taskId}`,
      data: { taskId: params.taskId, originalState: originalTaskState }
    });
    
    // Step 3: Generate invoice if requested
    if (params.generateInvoice) {
      console.log(`[PAY_TRIGGER] Invoice generation requested for ${params.invoiceType} project`);

      steps.push({
        id: 'generate_invoice',
        type: 'invoice_generation',
        operation: async () => {
          const invoiceRequest = {
            taskId: params.taskId,
            projectId: params.projectId,
            freelancerId: params.freelancerId,
            commissionerId: params.commissionerId,
            taskTitle: params.taskTitle,
            projectTitle: params.projectTitle,
            invoiceType: params.invoiceType || 'completion'
          };

          // 🛡️ MILESTONE GUARD: For milestone projects, use auto-generate endpoint
          if (params.invoiceType === 'milestone') {
            console.log(`🔧 Generating milestone invoice for task ${params.taskId}...`);

            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invoices/auto-generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskId: params.taskId,
                projectId: params.projectId,
                action: 'task_approved'
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Milestone invoice generation failed: ${errorData.error || response.statusText}`);
            }

            const result = await response.json();
            console.log(`✅ Milestone invoice generated:`, result);

            return {
              success: true,
              invoiceNumber: result.invoice?.invoiceNumber || result.invoiceNumber,
              message: result.message || 'Milestone invoice generated successfully'
            };
          } else {
            // Use existing completion invoice generation
            const invoiceResult = await generateInvoiceWithRetry(invoiceRequest);

            if (!invoiceResult.success) {
              throw new Error(`Invoice generation failed: ${invoiceResult.error}`);
            }

            return invoiceResult;
          }
        },
        rollback: async () => {
          console.log(`🔙 Rolling back invoice generation...`);
          // Note: In a real system, you'd need to delete the generated invoice
          // For now, we'll log this as a manual cleanup item
          console.warn(`⚠️ Manual cleanup required: Delete invoice for task ${params.taskId}`);
        },
        description: `Generate invoice for task ${params.taskId}`,
        data: { taskId: params.taskId, invoiceType: params.invoiceType }
      });
    }

    // Step 4: Execute payment for the generated invoice (only if invoice was generated)
    if (params.generateInvoice) {
      // 🛡️ CRITICAL COMPLETION GUARD: Block payment execution for completion projects
      if (params.invoiceType === 'completion') {
        console.log(`[TYPE_GUARD] BLOCKING payment execution for completion project ${params.projectId} - individual task approvals should not trigger payments`);
        console.log(`[PAY_TRIGGER] Completion project payment blocked - use dedicated completion payment endpoints instead`);
        // Skip payment execution step for completion projects
      } else {
        console.log(`[PAY_TRIGGER] Payment execution allowed for ${params.invoiceType} project ${params.projectId}`);

        steps.push({
        id: 'execute_payment',
        operation: async () => {
          console.log(`💳 Executing payment for task ${params.taskId}...`);

        // Get the generated invoice number from the previous step
        const invoiceResult = results['generate_invoice'];
        const invoiceNumber = invoiceResult?.invoiceNumber || invoiceResult?.existingInvoiceNumber;
        if (!invoiceNumber) {
          throw new Error('No invoice number available for payment execution');
        }

        // Execute payment directly using the payments service
        const { PaymentsService } = await import('../../app/api/payments/services/payments-service');

        // Get invoice details
        const { getInvoiceByNumber } = await import('../invoice-storage');
        const invoice = await getInvoiceByNumber(invoiceNumber);

        if (!invoice) {
          throw new Error(`Invoice ${invoiceNumber} not found`);
        }

        // Execute payment
        const paymentResult = await PaymentsService.processInvoicePayment({
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          commissionerId: invoice.commissionerId,
          freelancerId: invoice.freelancerId,
          projectId: invoice.projectId,
          source: 'auto_milestone_payment',
          invoiceType: params.invoiceType // Pass through the invoiceType from transaction params
        });

        if (!paymentResult.success) {
          throw new Error(`Payment execution failed: ${paymentResult.error}`);
        }

        console.log(`✅ Payment executed successfully:`, paymentResult);

        // Log milestone payment notification for freelancer
        try {
          // Get organization information for the commissioner
          const { readProject } = await import('../projects-utils');

          // Normalize projectId to string (accepts IDs like "C-009")
          const projectIdStr = String(invoice.projectId ?? '').trim();
          if (!projectIdStr) {
            throw new Error(`Invalid project ID: ${invoice.projectId}`);
          }

          const project = await readProject(projectIdStr);

          // Get organization data
          let organizationName = 'Organization';
          try {
            const { getOrganizationByCommissionerId } = await import('../storage/unified-storage-service');
            const organization = await getOrganizationByCommissionerId(invoice.commissionerId);
            if (organization) {
              organizationName = organization.name;
            }
          } catch (orgError) {
            console.warn('Could not fetch organization name, using fallback');
          }

          // Only send commissioner milestone payment notifications for milestone-based projects
          // (Freelancer notifications are handled by the bus system via PaymentsService)
          if (params.invoiceType === 'milestone') {
            const { logMilestonePaymentSent } = await import('../events/event-logger');
            const { NotificationStorage } = await import('../notifications/notification-storage');

            // Notification for commissioner (sender) only
            // Get freelancer name for the sender notification
            let freelancerName = 'Freelancer';
            try {
              const { getUserById } = await import('../storage/unified-storage-service');
              const freelancer = await getUserById(invoice.freelancerId as any);
              if (freelancer && freelancer.name) {
                freelancerName = freelancer.name;
              }
            } catch (userError) {
              console.warn('Could not fetch freelancer name, using fallback');
            }

            // Deduplicate against bus-emitted notification using invoiceNumber
            const existing = NotificationStorage.getRecentEvents(500).find(ev =>
              ev.type === 'milestone_payment_sent' && ev.metadata?.invoiceNumber === invoice.invoiceNumber
            );
            if (existing) {
              console.log('🔄 Skipping local milestone_payment_sent (bus will/has emitted)', {
                projectId: projectIdStr,
                invoiceNumber: invoice.invoiceNumber
              });
            } else {
              await logMilestonePaymentSent(
                invoice.commissionerId,
                invoice.freelancerId as any,
                projectIdStr,
                params.taskTitle,
                invoice.totalAmount,
                freelancerName,
                invoice.invoiceNumber,
                project?.totalBudget || project?.budget?.upper || project?.budget?.lower,
                project?.title
              );
              console.log(`📧 Payment sent notification created for commissioner ${invoice.commissionerId}`);
            }
            console.log(`ℹ️ Freelancer notification will be handled by bus system`);
          } else {
            console.log(`ℹ️ Skipping milestone payment notifications for ${params.invoiceType}-based project`);
          }
        } catch (notificationError) {
          console.error('⚠️ Failed to send milestone payment notification:', notificationError);
          // Don't fail the payment if notification fails
        }

        return {
          success: true,
          paymentId: paymentResult.paymentId,
          amount: paymentResult.amount,
          message: 'Payment executed successfully'
        };
      },
      rollback: async () => {
        console.log(`🔙 Rolling back payment execution...`);
        // Note: In a real system, you'd need to reverse the payment
        console.warn(`⚠️ Manual cleanup required: Reverse payment for task ${params.taskId}`);
      },
      description: `Execute payment for task ${params.taskId}`,
      data: { taskId: params.taskId }
    });
      } // End of milestone payment execution block
    }

    // Step 4: Check for project auto-completion
    steps.push({
      id: 'check_project_completion',
      type: 'project_update',
      operation: async () => {
        const completionResult = await checkAndAutoCompleteProject(params.projectId);
        return completionResult;
      },
      rollback: async () => {
        // If project was auto-completed, revert it
        console.log(`🔙 Rolling back project completion check...`);
        const project = await UnifiedStorageService.readProject(params.projectId);
        if (project && project.status === 'completed') {
          await UnifiedStorageService.writeProject({
            ...project,
            status: 'ongoing',
            completedAt: undefined,
            updatedAt: new Date().toISOString()
          });
        }
      },
      description: `Check project ${params.projectId} for auto-completion`,
      data: { projectId: params.projectId }
    });
    
    // Execute all steps
    for (const step of steps) {
      try {
        console.log(`⚡ Executing step: ${step.description}`);
        const result = await step.operation();
        results[step.id] = result;
        completedSteps.push(step.id);
        console.log(`✅ Step completed: ${step.id}`);
      } catch (stepError) {
        console.error(`❌ Step failed: ${step.id}`, stepError);
        
        // Rollback all completed steps in reverse order
        await rollbackSteps(steps, completedSteps);
        
        return {
          success: false,
          transactionId,
          completedSteps,
          failedStep: step.id,
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
          rollbackPerformed: true,
          results
        };
      }
    }
    
    console.log(`✅ Transaction ${transactionId} completed successfully`);
    
    return {
      success: true,
      transactionId,
      completedSteps,
      rollbackPerformed: false,
      results
    };
    
  } catch (error) {
    console.error(`❌ Transaction ${transactionId} failed:`, error);
    
    // Rollback any completed steps
    await rollbackSteps(steps, completedSteps);
    
    return {
      success: false,
      transactionId,
      completedSteps,
      error: error instanceof Error ? error.message : 'Unknown error',
      rollbackPerformed: true,
      results
    };
  }
}

/**
 * Execute commissioner matching with freelancer transaction
 */
export async function executeCommissionerMatchingTransaction(
  params: CommissionerMatchingTransaction
): Promise<TransactionResult> {
  const transactionId = `commissioner_matching_${params.gigId}_${params.freelancerId}_${Date.now()}`;

  console.log(`🔄 Starting commissioner matching transaction ${transactionId}...`);

  const steps: TransactionStep[] = [];
  const completedSteps: string[] = [];
  const results: Record<string, any> = {};

  try {
    // Step 1: Update application status to accepted
    steps.push({
      id: 'accept_application',
      type: 'custom',
      operation: async () => {
        // This would call the existing application acceptance logic
        const response = await fetch('/api/gig-applications/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: params.applicationId,
            gigId: params.gigId,
            freelancerId: params.freelancerId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to accept application');
        }

        return await response.json();
      },
      rollback: async () => {
        console.log(`🔙 Rolling back application acceptance...`);
        // Revert application status
        await fetch('/api/gig-applications/revert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: params.applicationId })
        });
      },
      description: `Accept application ${params.applicationId}`,
      data: { applicationId: params.applicationId }
    });

    // Step 2: Create project from gig
    steps.push({
      id: 'create_project',
      type: 'project_update',
      operation: async () => {
        // Use existing project creation logic
        const { ProjectService } = await import('../../app/api/projects/services/project-service');
        const project = await ProjectService.acceptGig(params.gigData, params.freelancerId, params.commissionerId);
        return project;
      },
      rollback: async () => {
        console.log(`🔙 Rolling back project creation...`);
        // Delete the created project
        const { deleteProject } = await import('../projects-utils');
        if (results.create_project?.projectId) {
          await deleteProject(results.create_project.projectId);
        }
      },
      description: `Create project from gig ${params.gigId}`,
      data: { gigId: params.gigId, gigData: params.gigData }
    });

    // Step 3: Generate upfront invoice for completion-based projects
    if (params.generateUpfrontInvoice && params.gigData.invoicingMethod === 'completion') {
      steps.push({
        id: 'generate_upfront_invoice',
        type: 'invoice_generation',
        operation: async () => {
          const { generateInvoiceWithRetry } = await import('../invoices/robust-invoice-service');

          const invoiceRequest = {
            taskId: 0, // Upfront invoice doesn't relate to specific task
            projectId: results.create_project?.projectId || 0,
            freelancerId: params.freelancerId,
            commissionerId: params.commissionerId,
            taskTitle: '12% Upfront Payment',
            projectTitle: params.gigData.title,
            invoiceType: 'completion' as const,
            amount: (params.gigData.totalBudget || 5000) * 0.12 // 12% upfront
          };

          const invoiceResult = await generateInvoiceWithRetry(invoiceRequest);

          if (!invoiceResult.success) {
            throw new Error(`Upfront invoice generation failed: ${invoiceResult.error}`);
          }

          return invoiceResult;
        },
        rollback: async () => {
          console.log(`🔙 Rolling back upfront invoice generation...`);
          // Note: In a real system, you'd need to delete the generated invoice
          console.warn(`⚠️ Manual cleanup required: Delete upfront invoice for gig ${params.gigId}`);
        },
        description: `Generate upfront invoice for gig ${params.gigId}`,
        data: { gigId: params.gigId, invoiceType: 'upfront' }
      });
    }

    // Execute all steps
    for (const step of steps) {
      try {
        console.log(`⚡ Executing step: ${step.description}`);
        const result = await step.operation();
        results[step.id] = result;
        completedSteps.push(step.id);
        console.log(`✅ Step completed: ${step.id}`);
      } catch (stepError) {
        console.error(`❌ Step failed: ${step.id}`, stepError);

        // Rollback all completed steps in reverse order
        await rollbackSteps(steps, completedSteps);

        return {
          success: false,
          transactionId,
          completedSteps,
          failedStep: step.id,
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
          rollbackPerformed: true,
          results
        };
      }
    }

    console.log(`✅ Transaction ${transactionId} completed successfully`);

    return {
      success: true,
      transactionId,
      completedSteps,
      rollbackPerformed: false,
      results
    };

  } catch (error) {
    console.error(`❌ Transaction ${transactionId} failed:`, error);

    // Rollback any completed steps
    await rollbackSteps(steps, completedSteps);

    return {
      success: false,
      transactionId,
      completedSteps,
      error: error instanceof Error ? error.message : 'Unknown error',
      rollbackPerformed: true,
      results
    };
  }
}

/**
 * Execute project completion with transaction integrity
 */
export async function executeProjectCompletionTransaction(
  projectId: number,
  completedBy: number
): Promise<TransactionResult> {
  const transactionId = `project_completion_${projectId}_${Date.now()}`;
  
  console.log(`🔄 Starting project completion transaction ${transactionId}...`);
  
  const steps: TransactionStep[] = [];
  const completedSteps: string[] = [];
  const results: Record<string, any> = {};
  
  try {
    // Get original project state
    const originalProject = await UnifiedStorageService.readProject(projectId);
    if (!originalProject) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const originalProjectState = { ...originalProject };
    
    // Step 1: Update project status to completed
    steps.push({
      id: 'complete_project',
      type: 'project_update',
      operation: async () => {
        await UnifiedStorageService.writeProject({
          ...originalProject,
          status: 'completed',
          completedAt: new Date().toISOString(),
          completedBy,
          updatedAt: new Date().toISOString()
        });
        return { projectId, status: 'completed' };
      },
      rollback: async () => {
        console.log(`🔙 Rolling back project ${projectId} completion...`);
        await UnifiedStorageService.writeProject({
          ...originalProject,
          status: originalProjectState.status,
          completedAt: undefined,
          completedBy: undefined,
          updatedAt: new Date().toISOString()
        });
      },
      description: `Complete project ${projectId}`,
      data: { projectId, originalState: originalProjectState }
    });
    
    // Step 2: Generate final invoices if needed
    // This would be expanded based on your business logic
    
    // Execute all steps
    for (const step of steps) {
      try {
        console.log(`⚡ Executing step: ${step.description}`);
        const result = await step.operation();
        results[step.id] = result;
        completedSteps.push(step.id);
        console.log(`✅ Step completed: ${step.id}`);
      } catch (stepError) {
        console.error(`❌ Step failed: ${step.id}`, stepError);
        
        // Rollback all completed steps
        await rollbackSteps(steps, completedSteps);
        
        return {
          success: false,
          transactionId,
          completedSteps,
          failedStep: step.id,
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
          rollbackPerformed: true,
          results
        };
      }
    }
    
    console.log(`✅ Transaction ${transactionId} completed successfully`);
    
    return {
      success: true,
      transactionId,
      completedSteps,
      rollbackPerformed: false,
      results
    };
    
  } catch (error) {
    console.error(`❌ Transaction ${transactionId} failed:`, error);
    
    await rollbackSteps(steps, completedSteps);
    
    return {
      success: false,
      transactionId,
      completedSteps,
      error: error instanceof Error ? error.message : 'Unknown error',
      rollbackPerformed: true,
      results
    };
  }
}

/**
 * Rollback completed steps in reverse order
 */
async function rollbackSteps(
  steps: TransactionStep[], 
  completedSteps: string[]
): Promise<void> {
  console.log(`🔙 Rolling back ${completedSteps.length} completed steps...`);
  
  // Rollback in reverse order
  for (let i = completedSteps.length - 1; i >= 0; i--) {
    const stepId = completedSteps[i];
    const step = steps.find(s => s.id === stepId);
    
    if (step) {
      try {
        console.log(`🔙 Rolling back step: ${step.description}`);
        await step.rollback();
        console.log(`✅ Rollback completed: ${stepId}`);
      } catch (rollbackError) {
        console.error(`❌ Rollback failed for step ${stepId}:`, rollbackError);
        // Continue with other rollbacks even if one fails
      }
    }
  }
  
  console.log(`🔙 Rollback process completed`);
}

/**
 * Execute custom transaction with provided steps
 */
export async function executeCustomTransaction(
  transactionId: string,
  steps: TransactionStep[]
): Promise<TransactionResult> {
  console.log(`🔄 Starting custom transaction ${transactionId}...`);
  
  const completedSteps: string[] = [];
  const results: Record<string, any> = {};
  
  try {
    for (const step of steps) {
      try {
        console.log(`⚡ Executing step: ${step.description}`);
        const result = await step.operation();
        results[step.id] = result;
        completedSteps.push(step.id);
        console.log(`✅ Step completed: ${step.id}`);
      } catch (stepError) {
        console.error(`❌ Step failed: ${step.id}`, stepError);
        
        await rollbackSteps(steps, completedSteps);
        
        return {
          success: false,
          transactionId,
          completedSteps,
          failedStep: step.id,
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
          rollbackPerformed: true,
          results
        };
      }
    }
    
    console.log(`✅ Transaction ${transactionId} completed successfully`);
    
    return {
      success: true,
      transactionId,
      completedSteps,
      rollbackPerformed: false,
      results
    };
    
  } catch (error) {
    console.error(`❌ Transaction ${transactionId} failed:`, error);
    
    await rollbackSteps(steps, completedSteps);
    
    return {
      success: false,
      transactionId,
      completedSteps,
      error: error instanceof Error ? error.message : 'Unknown error',
      rollbackPerformed: true,
      results
    };
  }
}
