/**
 * Payment Notification Enrichment
 * 
 * Emit-time enrichment for milestone payment notifications.
 * No template-time reads allowed - all data must be resolved at emit-time.
 * 
 * Enrichment chain:
 * 1. Normalize identifiers (projectId, invoiceNumber)
 * 2. Resolve amounts (payment result > invoice fields > line items)
 * 3. Resolve identities (freelancer, organization)
 * 4. Build final payloads
 */

import { UnifiedStorageService } from '../storage/unified-storage-service';

/**
 * Raw payment data from invoice.paid event
 */
export interface RawPaymentData {
  actorId: number | string;
  targetId: number | string;
  projectId: number | string;
  invoiceNumber: string;
  amount?: number;
  projectTitle?: string;
}

/**
 * Enriched payment data ready for notification emission
 */
export interface EnrichedPaymentData {
  projectId: string;
  invoiceNumber: string;
  amount: number;
  commissionerId: number;
  freelancerId: number;
  freelancerName?: string;
  organizationName?: string;
  taskTitle?: string;
  projectTitle?: string;
  remainingBudget?: number;
}

/**
 * Normalize project ID to string format
 */
function normalizeProjectId(projectId: number | string): string {
  return String(projectId).trim();
}

/**
 * Normalize invoice number by stripping TXN- prefix
 */
function normalizeInvoiceNumber(invoiceNumber: string): string {
  if (invoiceNumber.startsWith('TXN-')) {
    return invoiceNumber.substring(4);
  }
  return invoiceNumber;
}

/**
 * Resolve invoice data (amount and task title) from hierarchical storage
 */
async function resolveInvoiceData(
  runtimeAmount: number | undefined,
  projectId: string,
  invoiceNumber: string
): Promise<{ amount: number; taskTitle?: string }> {
  let finalAmount = runtimeAmount;
  let taskTitle: string | undefined;

  try {
    // Try to find the invoice in the hierarchical storage
    // Check both current day and previous day
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const date of [today, yesterday]) {
      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const day = date.getDate().toString().padStart(2, '0');

      const invoicePath = `data/invoices/${year}/${month}/${day}/${projectId}/${invoiceNumber}.json`;

      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullPath = path.join(process.cwd(), invoicePath);
        console.log(`[payment-enrichment] Trying to read invoice from: ${fullPath}`);
        const invoiceData = await fs.readFile(fullPath, 'utf8');
        const invoice = JSON.parse(invoiceData);
        console.log(`[payment-enrichment] Successfully loaded invoice ${invoiceNumber}:`, {
          milestones: invoice.milestones?.length || 0,
          firstMilestone: invoice.milestones?.[0]?.description
        });

        // Extract task title from milestones (always do this)
        if (invoice.milestones && Array.isArray(invoice.milestones) && invoice.milestones.length > 0) {
          taskTitle = invoice.milestones[0].description;
          console.log(`[payment-enrichment] Found task title from invoice: "${taskTitle}"`);
        } else {
          console.log(`[payment-enrichment] No milestones found in invoice ${invoiceNumber}`);
        }

        // Use invoice amount if runtime amount not provided
        if (!finalAmount || finalAmount <= 0) {
          const amount = invoice.totalAmount || invoice.amount || invoice.total || invoice.grandTotal;
          if (amount && amount > 0) {
            finalAmount = amount;
          }
        }

        // If we found task title or amount, return what we have
        if (taskTitle || (finalAmount && finalAmount > 0)) {
          console.log(`[payment-enrichment] Returning invoice data: amount=${finalAmount}, taskTitle="${taskTitle}"`);
          return { amount: finalAmount || 0, taskTitle };
        }

        // Last resort: sum line items (only if no amount yet)
        if ((!finalAmount || finalAmount <= 0) && invoice.lineItems && Array.isArray(invoice.lineItems)) {
          const lineItemTotal = invoice.lineItems.reduce((sum: number, item: any) => {
            return sum + (item.total || item.amount || 0);
          }, 0);
          if (lineItemTotal > 0) {
            finalAmount = lineItemTotal;
          }
        }
      } catch (error) {
        // Continue to next date
      }
    }
  } catch (error) {
    console.warn('[payment-enrichment] Failed to resolve invoice data', error);
  }

  // Return whatever we found
  console.log(`[payment-enrichment] Final fallback: amount=${finalAmount || 0}, taskTitle="${taskTitle}"`);
  return { amount: finalAmount || 0, taskTitle };
}

/**
 * Resolve freelancer name from user data
 */
async function resolveFreelancerName(freelancerId: number): Promise<string | undefined> {
  try {
    const user = await UnifiedStorageService.getUserById(freelancerId);

    if (user) {
      return user.displayName || user.name || `User ${freelancerId}`;
    }
  } catch (error) {
    console.warn('[payment-enrichment] Failed to resolve freelancer name', error);
  }

  return undefined;
}

/**
 * Resolve organization name using the specified chain
 */
async function resolveOrganizationName(
  commissionerId: number,
  projectId: string
): Promise<string | undefined> {
  try {
    // 1) Get project data first
    const project = await UnifiedStorageService.getProjectById(projectId);

    // 2) Try to get organization via organizationId
    if (project?.organizationId) {
      const organization = await UnifiedStorageService.getOrganizationById(project.organizationId);
      if (organization?.name) {
        return organization.name;
      }
    }

    // 3) Get commissioner data
    const commissioner = await UnifiedStorageService.getUserById(commissionerId);

    // 4) Try commissioner.profile.organizationName
    if (commissioner?.profile?.organizationName) {
      return commissioner.profile.organizationName;
    }

    // 5) Try commissioner.displayName / name
    if (commissioner?.displayName) {
      return commissioner.displayName;
    }
    if (commissioner?.name) {
      return commissioner.name;
    }

    // 6) (last resort) project.commissionerLabel (must be non-empty)
    if (project?.commissionerLabel && typeof project.commissionerLabel === 'string' && project.commissionerLabel.trim()) {
      return project.commissionerLabel;
    }
  } catch (error) {
    console.warn('[payment-enrichment] Failed to resolve organization name', error);
  }

  return undefined;
}

/**
 * Resolve project details (title, remaining budget)
 * Calculate remaining budget historically based on invoice timestamp
 */
async function resolveProjectDetails(
  projectId: string,
  invoiceNumber: string,
  paymentAmount: number
): Promise<{
  projectTitle?: string;
  remainingBudget?: number;
  taskTitle?: string;
}> {
  try {
    const project = await UnifiedStorageService.getProjectById(projectId);

    if (project) {
      const totalBudget = project.totalBudget || 0;

      // Get all paid invoices for this project to calculate historical remaining budget
      const paidInvoicesBeforeThis = await getPaidInvoicesBeforeInvoice(projectId, invoiceNumber);
      const totalPaidBefore = paidInvoicesBeforeThis.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const remainingAfterThisPayment = totalBudget - (totalPaidBefore + paymentAmount);

      console.log(`[payment-enrichment] Historical budget calculation for ${projectId}/${invoiceNumber}:`, {
        totalBudget,
        totalPaidBefore,
        paymentAmount,
        remainingAfterThisPayment,
        paidInvoicesBeforeThis: paidInvoicesBeforeThis.map(inv => ({
          number: inv.invoiceNumber,
          amount: inv.totalAmount,
          processedAt: inv.paymentDetails?.processedAt
        }))
      });

      return {
        projectTitle: project.title,
        remainingBudget: remainingAfterThisPayment > 0 ? remainingAfterThisPayment : 0,
        taskTitle: (typeof project.currentTaskTitle === 'string' ? project.currentTaskTitle : null) || 'task' // Fallback
      };
    }
  } catch (error) {
    console.warn('[payment-enrichment] Failed to resolve project details', error);
  }

  return {};
}

/**
 * Get all paid invoices for a project that were processed before the given invoice
 */
async function getPaidInvoicesBeforeInvoice(projectId: string, currentInvoiceNumber: string): Promise<any[]> {
  try {
    const paidInvoices = [];

    // Get the current invoice to find its payment timestamp
    let currentInvoiceTimestamp: string | null = null;

    // Check both current day and previous day for invoices
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const date of [today, yesterday]) {
      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const day = date.getDate().toString().padStart(2, '0');

      const invoicesDir = `data/invoices/${year}/${month}/${day}/${projectId}`;

      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullDir = path.join(process.cwd(), invoicesDir);
        const files = await fs.readdir(fullDir);

        for (const file of files) {
          if (file.endsWith('.json')) {
            const invoicePath = path.join(fullDir, file);
            const invoiceData = await fs.readFile(invoicePath, 'utf8');
            const invoice = JSON.parse(invoiceData);

            if (invoice.status === 'paid') {
              if (invoice.invoiceNumber === currentInvoiceNumber) {
                currentInvoiceTimestamp = invoice.paymentDetails?.processedAt;
              } else {
                paidInvoices.push(invoice);
              }
            }
          }
        }
      } catch (error) {
        // Continue to next date
      }
    }

    // Filter invoices that were paid before the current invoice
    if (currentInvoiceTimestamp) {
      return paidInvoices.filter(invoice => {
        const invoiceTimestamp = invoice.paymentDetails?.processedAt;
        return invoiceTimestamp && invoiceTimestamp < currentInvoiceTimestamp;
      });
    }

    return [];
  } catch (error) {
    console.warn('[payment-enrichment] Failed to get paid invoices before invoice', error);
    return [];
  }
}

/**
 * Main enrichment function
 * Takes raw payment data and returns enriched data ready for notification emission
 */
export async function enrichPaymentData(rawData: RawPaymentData): Promise<EnrichedPaymentData | null> {
  try {
    // Phase 1: Normalize identifiers
    const projectId = normalizeProjectId(rawData.projectId);
    const invoiceNumber = normalizeInvoiceNumber(rawData.invoiceNumber);
    
    // Phase 2: Resolve invoice data (amount and task title)
    const invoiceData = await resolveInvoiceData(rawData.amount, projectId, invoiceNumber);
    if (invoiceData.amount <= 0) {
      console.warn('[payment-enrichment] Invalid amount, skipping enrichment', { amount: invoiceData.amount });
      return null;
    }

    // Phase 3: Resolve identities
    const commissionerId = Number(rawData.actorId);
    const freelancerId = Number(rawData.targetId);
    
    // Guard against invalid IDs
    if (!commissionerId || !freelancerId) {
      console.warn('[payment-enrichment] Invalid user IDs, skipping enrichment', {
        commissionerId,
        freelancerId
      });
      return null;
    }

    // Resolve names in parallel
    const [freelancerName, organizationName, projectDetails] = await Promise.all([
      resolveFreelancerName(freelancerId),
      resolveOrganizationName(commissionerId, projectId),
      resolveProjectDetails(projectId, invoiceNumber, invoiceData.amount)
    ]);

    // Phase 4: Build final payload
    const finalTaskTitle = invoiceData.taskTitle || projectDetails.taskTitle || 'task';
    console.log(`[payment-enrichment] Final task title resolution: invoice="${invoiceData.taskTitle}", project="${projectDetails.taskTitle}", final="${finalTaskTitle}"`);

    return {
      projectId,
      invoiceNumber,
      amount: invoiceData.amount,
      commissionerId,
      freelancerId,
      freelancerName,
      organizationName,
      taskTitle: finalTaskTitle,
      projectTitle: projectDetails.projectTitle || rawData.projectTitle,
      remainingBudget: projectDetails.remainingBudget
    };
  } catch (error) {
    console.warn('[payment-enrichment] Enrichment failed', error);
    return null;
  }
}

/**
 * Check if enriched data has minimum required fields for emission
 */
export function hasMinimumRequiredFields(data: EnrichedPaymentData): {
  commissioner: boolean;
  freelancer: boolean;
} {
  return {
    commissioner: !!(data.freelancerName && data.freelancerName !== 'Freelancer' && data.amount > 0),
    freelancer: !!(data.organizationName && data.organizationName !== 'Organization' && data.amount > 0)
  };
}
