import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { generateOrganizationProjectId } from '@/lib/utils/id-generation';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
// import { CompletionCalculationService } from '../../payments/services/completion-calculation-service';

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing project creation routes
// 🛡️ PROTECTED: Existing project creation at /api/projects/create remains unchanged

async function handleCompletionProjectCreation(req: NextRequest) {
    // ✅ SAFE: Reuse auth infrastructure
    const { userId: commissionerId } = await requireSession(req);
    const body = await req.json();
    const projectData = sanitizeApiInput(body);
    
    // 🔒 COMPLETION-SPECIFIC: Validate completion project data
    assert(projectData.executionMethod === 'completion', 'Must be completion execution method', 400);
    assert(projectData.invoicingMethod === 'completion', 'Must be completion invoicing method', 400);
    assert(projectData.totalBudget > 0, 'Total budget must be positive', 400);
    assert(projectData.totalTasks > 0, 'Total tasks must be positive', 400);
    assert(projectData.freelancerId, 'Freelancer ID is required', 400);
    assert(projectData.title, 'Project title is required', 400);
    
    // 🧮 COMPLETION-SPECIFIC: Calculate upfront amount for validation
    const upfrontAmount = Math.round((projectData.totalBudget || 0) * 0.12 * 100) / 100;
    const manualInvoiceAmount = Math.round(((projectData.totalBudget || 0) * 0.88) / (projectData.totalTasks || 1) * 100) / 100;
    
    // ✅ SAFE: Create project using organization-based ID generation
    let projectId: string;
    const activationDate = new Date();

    // Generate organization-based project ID if organization info is available
    if (projectData.organizationId) {
      try {
        const organization = await UnifiedStorageService.getOrganizationById(projectData.organizationId);
        if (organization?.name) {
          // Get existing project IDs to avoid collisions
          const existingProjects = await UnifiedStorageService.listProjects();
          const existingProjectIds = new Set(existingProjects.map(p => p.projectId.toString()));

          projectId = generateOrganizationProjectId(organization.name, existingProjectIds);
        } else {
          // Fallback to numeric ID if organization not found
          const { generateProjectId } = await import('@/lib/utils/id-generation');
          projectId = generateProjectId().toString();
        }
      } catch (error) {
        console.warn('Failed to generate organization-based project ID, using fallback:', error);
        const { generateProjectId } = await import('@/lib/utils/id-generation');
        projectId = generateProjectId().toString();
      }
    } else {
      // Fallback to numeric ID if no organization
      const { generateProjectId } = await import('@/lib/utils/id-generation');
      projectId = generateProjectId().toString();
    }

    // 🛡️ DURATION GUARD: Calculate due date from activation time to preserve project duration
    const dueDate = (() => {
      const deliveryWeeks = projectData.deliveryTimeWeeks || 4; // Default to 4 weeks if not specified
      return new Date(activationDate.getTime() + deliveryWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    })();

    const project = {
      projectId,
      title: projectData.title,
      description: projectData.description || '',
      totalBudget: projectData.totalBudget,
      totalTasks: projectData.totalTasks,
      commissionerId,
      freelancerId: projectData.freelancerId,
      organizationId: projectData.organizationId,
      status: 'ongoing',
      executionMethod: 'completion', // 🔒 COMPLETION-SPECIFIC
      invoicingMethod: 'completion', // 🔒 COMPLETION-SPECIFIC
      dueDate, // 🛡️ DURATION GUARD: Due date calculated from activation time
      createdAt: activationDate.toISOString(),
      updatedAt: activationDate.toISOString(),

      // 🛡️ DURATION GUARD: Clear date separation and duration persistence
      gigId: projectData.gigId,
      gigPostedDate: projectData.gigPostedDate,
      projectActivatedAt: activationDate.toISOString(),
      originalDuration: {
        deliveryTimeWeeks: projectData.deliveryTimeWeeks,
        estimatedHours: projectData.estimatedHours,
        originalStartDate: projectData.originalStartDate,
        originalEndDate: projectData.originalEndDate,
      },
      // Legacy fields for backward compatibility
      deliveryTimeWeeks: projectData.deliveryTimeWeeks,
      estimatedHours: projectData.estimatedHours,
      // 🔒 COMPLETION-SPECIFIC: Additional fields
      upfrontPaid: false,
      upfrontAmount,
      manualInvoiceAmount,
      remainingBudget: projectData.totalBudget * 0.88,
      completionPayments: {
        upfrontCompleted: false,
        manualInvoicesCount: 0,
        finalPaymentCompleted: false
      }
    };
    
    await saveProject(project);
    
    // 🔒 COMPLETION-SPECIFIC: Automatically trigger upfront payment
    let upfrontPaymentResult = null;
    try {
      const upfrontResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payments/completion/execute-upfront`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
          // 🔑 CRITICAL: Forward cookies for NextAuth session
          'Cookie': req.headers.get('Cookie') || ''
        },
        body: JSON.stringify({ projectId })
      });
      
      if (upfrontResponse.ok) {
        upfrontPaymentResult = await upfrontResponse.json();
        
        // Update project to mark upfront as paid
        await updateProject(projectId, { 
          upfrontPaid: true,
          'completionPayments.upfrontCompleted': true
        });
      } else {
        console.warn('Upfront payment failed:', await upfrontResponse.text());
        // Don't rollback project creation - allow manual retry
      }
    } catch (e) {
      console.warn('Upfront payment trigger failed:', e);
      // Don't rollback project creation - allow manual retry
    }
    
    // 🔔 COMPLETION-SPECIFIC: Emit project activation events (separate from payment)
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Project activation notification for freelancer only
      await handleCompletionNotification({
        type: 'completion.project_activated',
        actorId: commissionerId,
        targetId: projectData.freelancerId,
        projectId,
        context: {
          projectTitle: projectData.title,
          dueDate: projectData.dueDate
          // commissionerName and freelancerName will be enriched automatically
        } as any
      });

      // Upfront payment notification (if payment was successful)
      if (upfrontPaymentResult) {
        // Freelancer upfront payment notification
        await handleCompletionNotification({
          type: 'completion.upfront_payment',
          actorId: commissionerId,
          targetId: projectData.freelancerId,
          projectId,
          context: {
            upfrontAmount,
            projectTitle: projectData.title,
            remainingBudget: project.remainingBudget
            // orgName and freelancerName will be enriched automatically
          }
        });

        // Commissioner upfront payment notification (self-targeted)
        await handleCompletionNotification({
          type: 'completion.upfront_payment',
          actorId: commissionerId,
          targetId: commissionerId,
          projectId,
          context: {
            upfrontAmount,
            projectTitle: projectData.title,
            remainingBudget: project.remainingBudget
            // orgName and freelancerName will be enriched automatically
          }
        });
      }
    } catch (e) {
      console.warn('Completion notification failed:', e);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        project: project
      },
      message: 'Completion-based project created successfully'
    });
}

// Wrap the handler with error handling
export const POST = withErrorHandling(handleCompletionProjectCreation);

// Helper functions - NEW, doesn't modify existing functions

async function saveProject(project: any) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    let projects = [];
    
    try {
      const projectsData = await fs.readFile(projectsPath, 'utf8');
      projects = JSON.parse(projectsData);
    } catch (e) {
      // File doesn't exist, start with empty array
    }
    
    projects.push(project);
    
    await fs.writeFile(projectsPath, JSON.stringify(projects, null, 2));
    
    return project;
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
}

async function updateProject(projectId: string, updates: any) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const projectsData = await fs.readFile(projectsPath, 'utf8');
    const projects = JSON.parse(projectsData);
    
    const projectIndex = projects.findIndex((p: any) => p.projectId === projectId);
    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await fs.writeFile(projectsPath, JSON.stringify(projects, null, 2));
    }
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}
