/**
 * Completion-Based Invoicing Calculation Service
 *
 * 🔒 COMPLETION-SPECIFIC: All calculation logic for completion-based projects
 * 🛡️ PROTECTED: Does not modify existing milestone calculation logic
 */

export interface CompletionProjectStatus {
  isReadyForFinalPayout: boolean;
  allTasksApproved: boolean;
  hasRemainingBudget: boolean;
  remainingBudget: number;
  totalTasks: number;
  approvedTasks: number;
  finalPaymentAlreadyProcessed: boolean;
  reason?: string;
}

export class CompletionCalculationService {
  /**
   * 🔒 COMPLETION-SPECIFIC: Centralized gate to determine if a completion project is ready for final payout
   * This is the single source of truth for final payment eligibility
   */
  static async isProjectReadyForFinalPayout(projectId: string): Promise<CompletionProjectStatus> {
    const startTime = Date.now();
    console.log(`[COMPLETION_PAY] Starting final payout eligibility check for project ${projectId}`);

    try {
      // 🛡️ GUARD: Validate input
      if (!projectId || typeof projectId !== 'string') {
        console.error(`[COMPLETION_PAY] Invalid project ID provided: ${projectId}`);
        throw new Error('Invalid project ID');
      }
      // Get project data
      const project = await this.getProjectById(projectId);
      if (!project) {
        return {
          isReadyForFinalPayout: false,
          allTasksApproved: false,
          hasRemainingBudget: false,
          remainingBudget: 0,
          totalTasks: 0,
          approvedTasks: 0,
          finalPaymentAlreadyProcessed: false,
          reason: 'Project not found'
        };
      }

      // 🛡️ GUARD: Ensure this is a completion project - CRITICAL for preventing milestone contamination
      if (project.invoicingMethod !== 'completion') {
        console.warn(`[COMPLETION_PAY] GUARD VIOLATION: Project ${projectId} is not a completion project (method: ${project.invoicingMethod})`);
        return {
          isReadyForFinalPayout: false,
          allTasksApproved: false,
          hasRemainingBudget: false,
          remainingBudget: 0,
          totalTasks: 0,
          approvedTasks: 0,
          finalPaymentAlreadyProcessed: false,
          reason: `GUARD: Not a completion project (method: ${project.invoicingMethod})`
        };
      }

      console.log(`[COMPLETION_PAY] Project ${projectId} confirmed as completion project with budget $${project.totalBudget}`);

      // Check if final payment already processed
      const existingFinalInvoices = await this.getInvoicesByProject(projectId, 'completion_final');
      const finalPaymentAlreadyProcessed = existingFinalInvoices.length > 0;

      // Get all tasks for this project
      const tasks = await this.getTasksByProject(projectId);
      const totalTasks = tasks.length;
      const approvedTasks = tasks.filter((t: any) => t.status === 'Approved').length;
      const allTasksApproved = approvedTasks === totalTasks && totalTasks > 0;

      // Calculate remaining budget
      const remainingBudget = await this.calculateRemainingBudget(projectId, project.totalBudget);
      const hasRemainingBudget = remainingBudget > 0;

      // Determine final eligibility
      const isReadyForFinalPayout = allTasksApproved && hasRemainingBudget && !finalPaymentAlreadyProcessed;

      let reason = '';
      if (!allTasksApproved) {
        reason = `Not all tasks approved (${approvedTasks}/${totalTasks})`;
      } else if (!hasRemainingBudget) {
        reason = `No remaining budget ($${remainingBudget})`;
      } else if (finalPaymentAlreadyProcessed) {
        reason = 'Final payment already processed';
      } else if (isReadyForFinalPayout) {
        reason = 'Ready for final payout';
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`[COMPLETION_PAY] Project ${projectId} eligibility check completed in ${elapsedTime}ms: ${reason}`);
      console.log(`[COMPLETION_PAY] Final decision for project ${projectId}: ${isReadyForFinalPayout ? 'ELIGIBLE' : 'NOT ELIGIBLE'} - Tasks: ${approvedTasks}/${totalTasks}, Budget: $${remainingBudget}, Final processed: ${finalPaymentAlreadyProcessed}`);

      return {
        isReadyForFinalPayout,
        allTasksApproved,
        hasRemainingBudget,
        remainingBudget,
        totalTasks,
        approvedTasks,
        finalPaymentAlreadyProcessed,
        reason
      };

    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.error(`[COMPLETION_PAY] CRITICAL ERROR checking project ${projectId} eligibility after ${elapsedTime}ms:`, error);
      return {
        isReadyForFinalPayout: false,
        allTasksApproved: false,
        hasRemainingBudget: false,
        remainingBudget: 0,
        totalTasks: 0,
        approvedTasks: 0,
        finalPaymentAlreadyProcessed: false,
        reason: `CRITICAL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Calculate upfront amount (12% of total budget)
   * 🔒 COMPLETION-SPECIFIC: Fixed 12% calculation
   */
  static calculateUpfrontAmount(totalBudget: number): number {
    if (totalBudget <= 0) {
      throw new Error('Total budget must be positive');
    }
    return Math.round(totalBudget * 0.12 * 100) / 100;
  }
  
  /**
   * Calculate manual invoice amount per task
   * 🔒 COMPLETION-SPECIFIC: 88% of budget divided equally among ALL tasks (upfront is NOT payment for a task)
   */
  static calculateManualInvoiceAmount(totalBudget: number, totalTasks: number): number {
    if (totalBudget <= 0) {
      throw new Error('Total budget must be positive');
    }
    if (totalTasks <= 0) {
      throw new Error('Total tasks must be positive');
    }

    // CORRECT: 88% of budget is for ALL tasks, upfront 12% is just commitment payment
    const taskPortionBudget = totalBudget * 0.88;
    const amountPerTask = Math.round((taskPortionBudget / totalTasks) * 100) / 100;

    console.log(`[COMPLETION_PAY] Manual invoice calculation: $${totalBudget} total, $${taskPortionBudget} for tasks (88%), ${totalTasks} tasks, $${amountPerTask} per task`);

    return amountPerTask;
  }
  
  /**
   * 🔒 COMPLETION-SPECIFIC: Validate remaining budget integrity before any payment operation
   * This prevents negative balances and ensures atomic budget tracking
   */
  static async validateRemainingBudgetIntegrity(
    projectId: string,
    proposedPaymentAmount: number
  ): Promise<{
    isValid: boolean;
    currentRemainingBudget: number;
    wouldResultInNegative: boolean;
    errors: string[];
  }> {
    console.log(`[REMAINDER_BUDGET] Validating budget integrity for project ${projectId}, proposed payment: $${proposedPaymentAmount}`);

    const errors: string[] = [];

    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        errors.push('Project not found');
        return { isValid: false, currentRemainingBudget: 0, wouldResultInNegative: false, errors };
      }

      if (project.invoicingMethod !== 'completion') {
        errors.push('Not a completion project');
        return { isValid: false, currentRemainingBudget: 0, wouldResultInNegative: false, errors };
      }

      // Calculate current remaining budget
      const currentRemainingBudget = await this.calculateRemainingBudget(projectId, project.totalBudget);

      // Check if proposed payment would result in negative balance
      const wouldResultInNegative = (currentRemainingBudget - proposedPaymentAmount) < 0;

      if (proposedPaymentAmount <= 0) {
        errors.push('Payment amount must be positive');
      }

      if (wouldResultInNegative) {
        errors.push(`Payment of $${proposedPaymentAmount} would exceed remaining budget of $${currentRemainingBudget}`);
      }

      const isValid = errors.length === 0;

      console.log(`[REMAINDER_BUDGET] Project ${projectId} validation: ${isValid ? 'VALID' : 'INVALID'} - Remaining: $${currentRemainingBudget}, Proposed: $${proposedPaymentAmount}`);

      return {
        isValid,
        currentRemainingBudget,
        wouldResultInNegative,
        errors
      };

    } catch (error) {
      console.error(`[REMAINDER_BUDGET] Error validating budget integrity for project ${projectId}:`, error);
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, currentRemainingBudget: 0, wouldResultInNegative: false, errors };
    }
  }

  /**
   * Calculate remaining budget for final payment
   * 🔒 COMPLETION-SPECIFIC: 88% - sum of paid manual invoices
   */
  static async calculateRemainingBudget(
    projectId: string,
    totalBudget: number
  ): Promise<number> {
    if (totalBudget <= 0) {
      throw new Error('Total budget must be positive');
    }

    const remainingBudget = totalBudget * 0.88;

    // Get all paid manual invoices for this project
    const paidManualInvoices = await this.getPaidManualInvoices(projectId);

    const manualPaymentsTotal = paidManualInvoices.reduce(
      (sum, invoice) => sum + invoice.totalAmount,
      0
    );

    const finalAmount = remainingBudget - manualPaymentsTotal;
    const result = Math.round(finalAmount * 100) / 100;

    // Log for debugging
    console.log(`[REMAINDER_BUDGET] Project ${projectId}: Total budget: $${totalBudget}, 88% portion: $${remainingBudget}, Manual payments: $${manualPaymentsTotal}, Remaining: $${result}`);

    return result;
  }
  
  /**
   * Validate completion project payment state
   * 🔒 COMPLETION-SPECIFIC: Ensure payment integrity
   */
  static async validatePaymentState(projectId: string): Promise<{
    isValid: boolean;
    upfrontPaid: boolean;
    manualPaymentsCount: number;
    remainingAmount: number;
    errors: string[];
    summary: {
      totalBudget: number;
      upfrontAmount: number;
      manualPaymentsTotal: number;
      finalAmount: number;
    };
  }> {
    const errors: string[] = [];
    
    try {
      const project = await this.getProjectById(projectId);
      
      if (!project) {
        errors.push('Project not found');
        return this.createErrorResponse(errors);
      }
      
      if (project.invoicingMethod !== 'completion') {
        errors.push('Project is not completion-based');
        return this.createErrorResponse(errors);
      }
      
      // Check upfront payment
      const upfrontInvoices = await this.getInvoicesByProject(projectId, 'completion_upfront', 'paid');
      const upfrontPaid = upfrontInvoices.length > 0;
      
      if (!upfrontPaid) {
        errors.push('Upfront payment (12%) not completed');
      }
      
      // Check manual payments
      const manualInvoices = await this.getPaidManualInvoices(projectId);
      const manualPaymentsCount = manualInvoices.length;
      const manualPaymentsTotal = manualInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      // Calculate amounts
      const upfrontAmount = this.calculateUpfrontAmount(project.totalBudget);
      const remainingAmount = await this.calculateRemainingBudget(projectId, project.totalBudget);
      
      // Validate budget integrity
      const totalPaid = (upfrontPaid ? upfrontAmount : 0) + manualPaymentsTotal;
      if (totalPaid > project.totalBudget) {
        errors.push(`Total payments (${totalPaid}) exceed project budget (${project.totalBudget})`);
      }
      
      return {
        isValid: errors.length === 0,
        upfrontPaid,
        manualPaymentsCount,
        remainingAmount,
        errors,
        summary: {
          totalBudget: project.totalBudget,
          upfrontAmount,
          manualPaymentsTotal,
          finalAmount: remainingAmount
        }
      };
      
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createErrorResponse(errors);
    }
  }
  
  /**
   * Calculate completion project progress
   * 🔒 COMPLETION-SPECIFIC: Progress based on payments made
   */
  static async calculateProjectProgress(projectId: string): Promise<{
    progressPercentage: number;
    upfrontCompleted: boolean;
    manualPaymentsCount: number;
    finalPaymentCompleted: boolean;
    totalTasks: number;
    approvedTasks: number;
  }> {
    const project = await this.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    const upfrontInvoices = await this.getInvoicesByProject(projectId, 'completion_upfront', 'paid');
    const upfrontCompleted = upfrontInvoices.length > 0;
    
    const manualInvoices = await this.getPaidManualInvoices(projectId);
    const manualPaymentsCount = manualInvoices.length;
    
    const finalInvoices = await this.getInvoicesByProject(projectId, 'completion_final', 'paid');
    const finalPaymentCompleted = finalInvoices.length > 0;
    
    const tasks = await this.getTasksByProject(projectId);
    const approvedTasks = tasks.filter((t: any) => t.status === 'Approved').length;
    
    // Calculate progress: 12% for upfront + 88% for completion
    let progressPercentage = 0;
    if (upfrontCompleted) progressPercentage += 12;
    if (finalPaymentCompleted) progressPercentage += 88;
    
    return {
      progressPercentage,
      upfrontCompleted,
      manualPaymentsCount,
      finalPaymentCompleted,
      totalTasks: tasks.length,
      approvedTasks
    };
  }
  
  // Helper methods
  private static async getProjectById(projectId: string) {
    try {
      const fs = await import('fs').promises;
      const path = await import('path');
      
      const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
      const projectsData = await fs.readFile(projectsPath, 'utf8');
      const projects = JSON.parse(projectsData);
      
      return projects.find((p: any) => p.projectId === projectId);
    } catch (error) {
      console.error('Error reading project:', error);
      return null;
    }
  }
  
  private static async getInvoicesByProject(projectId: string, invoiceType: string, status?: string) {
    try {
      // ✅ FIXED: Use hierarchical storage instead of flat file
      const { getAllInvoices } = await import('@/lib/invoice-storage');
      const allInvoices = await getAllInvoices({ projectId });

      return allInvoices.filter((inv: any) => {
        const matchesType = inv.invoiceType === invoiceType;
        const matchesStatus = status ? inv.status === status : true;

        return matchesType && matchesStatus;
      });
    } catch (error) {
      console.error('Error reading invoices:', error);
      return [];
    }
  }
  
  private static async getPaidManualInvoices(projectId: string) {
    return this.getInvoicesByProject(projectId, 'completion_manual', 'paid');
  }

  private static async getProjectById(projectId: string) {
    try {
      // ✅ FIXED: Use hierarchical storage instead of flat file
      const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
      return await UnifiedStorageService.readProject(projectId);
    } catch (error) {
      console.error('Error reading project:', error);
      return null;
    }
  }

  private static async getTasksByProject(projectId: string) {
    try {
      // ✅ FIXED: Use hierarchical storage instead of flat file
      const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
      return await UnifiedStorageService.getTasksByProject(projectId);
    } catch (error) {
      console.error('Error reading tasks:', error);
      return [];
    }
  }
  
  private static createErrorResponse(errors: string[]) {
    return {
      isValid: false,
      upfrontPaid: false,
      manualPaymentsCount: 0,
      remainingAmount: 0,
      errors,
      summary: {
        totalBudget: 0,
        upfrontAmount: 0,
        manualPaymentsTotal: 0,
        finalAmount: 0
      }
    };
  }
}
