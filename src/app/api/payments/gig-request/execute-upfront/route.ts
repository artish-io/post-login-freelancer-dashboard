import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { readProject, updateProject } from '@/lib/projects-utils';
import { getInvoicesByProjectId, saveInvoice, getAllInvoices } from '@/lib/invoice-storage';
import { assert } from '@/lib/auth/session-guard';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

/**
 * Execute upfront payment for gig request acceptance
 * 
 * Key difference from regular upfront payment:
 * - Freelancer triggers the payment (authorization)
 * - Commissioner is charged (payment execution)
 * - Used when freelancer accepts a gig request
 */
export async function POST(request: Request) {
  try {
    console.log('🚀 GIG REQUEST UPFRONT PAYMENT: Starting execute-upfront route...');
    
    // Parse request
    console.log('📄 GIG REQUEST UPFRONT PAYMENT: Parsing request body...');
    const { projectId, freelancerId, commissionerId } = await request.json();
    
    // Validate session - freelancer must be authenticated
    console.log('🔐 GIG REQUEST UPFRONT PAYMENT: Starting auth check...');
    const session = await getServerSession(authOptions);
    assert(session?.user?.id, 'Unauthorized', 401);
    
    const sessionUserId = parseInt(session.user.id);
    console.log('✅ GIG REQUEST UPFRONT PAYMENT: Auth successful, sessionUserId:', sessionUserId);
    
    // Validate that the authenticated user is the freelancer
    assert(sessionUserId === freelancerId, 'Unauthorized: Only the freelancer can trigger gig request payment', 403);
    console.log('✅ GIG REQUEST UPFRONT PAYMENT: Freelancer authorization validated');
    
    // Get project details
    console.log('🔍 GIG REQUEST UPFRONT PAYMENT: Looking up project...');
    const project = await readProject(projectId);
    console.log('📋 GIG REQUEST UPFRONT PAYMENT: Project lookup result:', {
      found: !!project,
      projectId,
      invoicingMethod: project?.invoicingMethod,
      commissionerId: project?.commissionerId,
      totalBudget: project?.totalBudget
    });
    
    // Validate project
    assert(project, 'Project not found', 404);
    assert(project!.invoicingMethod === 'completion', 'Project must be completion-based', 400);
    assert(project!.commissionerId === commissionerId, 'Commissioner mismatch', 400);
    assert(project!.freelancerId === freelancerId, 'Freelancer mismatch', 400);
    console.log('✅ GIG REQUEST UPFRONT PAYMENT: Project validation passed');
    
    // Calculate 12% upfront amount
    console.log('🧮 GIG REQUEST UPFRONT PAYMENT: Calculating upfront amount...');
    const upfrontAmount = Math.round((project!.totalBudget || 0) * 0.12 * 100) / 100;
    console.log('💰 GIG REQUEST UPFRONT PAYMENT: Calculated upfront amount:', upfrontAmount);
    
    // Check if upfront already paid
    console.log('🔍 GIG REQUEST UPFRONT PAYMENT: Checking for existing upfront invoices...');
    const allProjectInvoices = await getInvoicesByProjectId(projectId);
    const existingUpfrontInvoices = allProjectInvoices.filter(inv => inv.invoiceType === 'completion_upfront');
    
    if (existingUpfrontInvoices.length > 0) {
      const existingInvoice = existingUpfrontInvoices[0];
      console.log('⚠️ GIG REQUEST UPFRONT PAYMENT: Found existing upfront invoice:', {
        invoiceNumber: existingInvoice.invoiceNumber,
        status: existingInvoice.status
      });
      
      if (existingInvoice.status === 'paid') {
        console.log('✅ GIG REQUEST UPFRONT PAYMENT: Upfront already paid');
        return NextResponse.json({
          success: true,
          message: 'Upfront payment already completed',
          invoiceNumber: existingInvoice.invoiceNumber,
          amount: existingInvoice.totalAmount
        });
      }
    }
    
    // Generate invoice number for upfront payment using commissioner initials
    console.log('🔢 GIG REQUEST UPFRONT PAYMENT: Generating invoice number...');
    let invoiceNumber = `COMP-UPF-C-${projectId}-${Date.now()}`; // Fallback

    try {
      // Get commissioner data for initials
      const commissioner = await UnifiedStorageService.getUserById(commissionerId);

      if (commissioner?.name) {
        // Extract initials from commissioner name
        const initials = commissioner.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('');

        // Get existing COMPLETION invoices to determine next number
        const existingInvoices = await getAllInvoices({ commissionerId });
        const completionInvoices = existingInvoices.filter(inv =>
          inv.invoiceType && (
            inv.invoiceType.includes('completion') ||
            inv.invoiceNumber?.includes('-C')
          )
        );

        // Find the highest existing number for this commissioner's completion invoices
        let highestNumber = 0;
        for (const invoice of completionInvoices) {
          const parts = invoice.invoiceNumber.split('-');
          const numberPart = parts[parts.length - 1]; // Get last part after final dash
          if (numberPart && /^\d+$/.test(numberPart)) {
            const num = parseInt(numberPart, 10);
            if (num > highestNumber) {
              highestNumber = num;
            }
          }
        }

        const nextNumber = String(highestNumber + 1).padStart(3, '0');
        invoiceNumber = `${initials}-C${nextNumber}`;
        console.log(`📋 GIG REQUEST UPFRONT PAYMENT: Generated invoice number: ${invoiceNumber} for commissioner ${commissioner.name}`);
      }
    } catch (error) {
      console.warn('⚠️ GIG REQUEST UPFRONT PAYMENT: Could not generate custom invoice number, using fallback:', error);
    }

    console.log('📄 GIG REQUEST UPFRONT PAYMENT: Final invoice number:', invoiceNumber);
    
    // Create and save upfront invoice
    const upfrontInvoice = {
      invoiceNumber,
      freelancerId,
      commissionerId,
      projectId,
      projectTitle: project!.title,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0], // Due immediately
      totalAmount: upfrontAmount,
      status: 'paid' as const, // Mark as paid immediately for gig request acceptance
      invoiceType: 'completion_upfront' as const,
      milestoneNumber: 1, // 1 = upfront
      currency: 'USD',
      milestones: [{
        description: 'Upfront payment (12% of project budget)',
        rate: upfrontAmount,
        title: 'Project Initiation',
        taskId: 'upfront'
      }],
      createdAt: new Date().toISOString(),
      paidDate: new Date().toISOString(),
      isAutoGenerated: true,
      generatedAt: new Date().toISOString(),
      paymentDetails: {
        paymentId: `gig-request-upfront-${projectId}-${Date.now()}`,
        paymentMethod: 'gig_request_acceptance',
        platformFee: 0,
        processedAt: new Date().toISOString()
      }
    };

    // Save the invoice
    console.log('💾 GIG REQUEST UPFRONT PAYMENT: Saving invoice...');
    await saveInvoice(upfrontInvoice);

    // Update project paid-to-date
    console.log('📊 GIG REQUEST UPFRONT PAYMENT: Updating project paid-to-date...');
    const currentPaidToDate = project!.paidToDate || 0;
    await updateProject(projectId, {
      paidToDate: currentPaidToDate + upfrontAmount,
      updatedAt: new Date().toISOString()
    });

    // 🔔 GIG REQUEST SPECIFIC: Emit gig request upfront payment notification
    console.log('🔔 GIG REQUEST UPFRONT PAYMENT: Emitting gig request upfront notification...');
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // 🔔 ATOMIC LOG: Freelancer gig request upfront payment notification
      console.log('🔔 ATOMIC: About to emit freelancer upfront notification:', {
        type: 'completion.gig-request-upfront',
        actorId: project!.commissionerId || 0,
        targetId: project!.freelancerId,
        projectId,
        timestamp: new Date().toISOString()
      });

      const freelancerUpfrontResult = await handleCompletionNotification({
        type: 'completion.gig-request-upfront',
        actorId: project!.commissionerId || 0,
        targetId: project!.freelancerId,
        projectId,
        context: {
          upfrontAmount,
          projectTitle: project!.title || 'Project',
          remainingBudget: (project!.totalBudget || 0) * 0.88
          // orgName and freelancerName will be enriched automatically
        }
      });

      console.log('🔔 ATOMIC: Freelancer upfront notification result:', freelancerUpfrontResult);

      // 🔔 ATOMIC LOG: Commissioner gig request upfront payment notification
      console.log('🔔 ATOMIC: About to emit commissioner upfront notification:', {
        type: 'completion.gig-request-upfront-commissioner',
        actorId: project!.commissionerId || 0,
        targetId: project!.commissionerId || 0,
        projectId,
        timestamp: new Date().toISOString()
      });

      const commissionerUpfrontResult = await handleCompletionNotification({
        type: 'completion.gig-request-upfront-commissioner',
        actorId: project!.commissionerId || 0,
        targetId: project!.commissionerId || 0,
        projectId,
        context: {
          upfrontAmount,
          projectTitle: project!.title || 'Project',
          remainingBudget: (project!.totalBudget || 0) * 0.88
          // orgName and freelancerName will be enriched automatically
        }
      });

      console.log('🔔 ATOMIC: Commissioner upfront notification result:', commissionerUpfrontResult);
      console.log('✅ GIG REQUEST UPFRONT PAYMENT: Gig request upfront notification emitted successfully');
    } catch (e) {
      console.warn('⚠️ GIG REQUEST UPFRONT PAYMENT: Gig request upfront notification emission failed:', e);
      console.error('⚠️ GIG REQUEST UPFRONT PAYMENT: Full error details:', e);
    }

    console.log('✅ GIG REQUEST UPFRONT PAYMENT: Payment completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Upfront payment executed successfully',
      invoiceNumber,
      amount: upfrontAmount,
      paymentId: upfrontInvoice.paymentDetails?.paymentId
    });
    
  } catch (error) {
    console.error('❌ GIG REQUEST UPFRONT PAYMENT: Caught error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
