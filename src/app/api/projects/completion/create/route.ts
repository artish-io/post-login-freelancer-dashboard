import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { CompletionCalculationService } from '../../payments/services/completion-calculation-service';

// 🚨 CRITICAL: This is a COMPLETELY NEW route - does not modify existing project creation routes
// 🛡️ PROTECTED: Existing project creation at /api/projects/create remains unchanged

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
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
    const upfrontAmount = CompletionCalculationService.calculateUpfrontAmount(projectData.totalBudget);
    const manualInvoiceAmount = CompletionCalculationService.calculateManualInvoiceAmount(
      projectData.totalBudget, 
      projectData.totalTasks
    );
    
    // ✅ SAFE: Create project using existing infrastructure pattern
    const projectId = generateProjectId();
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    
    // 🔔 COMPLETION-SPECIFIC: Emit project activation event (separate from payment)
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');

      // Project activation notification
      await handleCompletionNotification({
        type: 'completion.project_activated',
        actorId: commissionerId,
        targetId: projectData.freelancerId,
        projectId,
        context: {
          projectTitle: projectData.title,
          totalTasks: projectData.totalTasks
          // commissionerName and freelancerName will be enriched automatically
        }
      });

      // Upfront payment notification (if payment was successful)
      if (upfrontPaymentResult) {
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
      }
    } catch (e) {
      console.warn('Completion notification failed:', e);
    }
    
    return NextResponse.json(ok({
      project: {
        projectId: project.projectId,
        title: project.title,
        status: project.status,
        executionMethod: project.executionMethod,
        invoicingMethod: project.invoicingMethod,
        totalBudget: project.totalBudget,
        totalTasks: project.totalTasks,
        upfrontPaid: project.upfrontPaid
      },
      upfrontPayment: upfrontPaymentResult?.data || null,
      calculations: {
        upfrontAmount,
        manualInvoiceAmount,
        remainingBudget: project.remainingBudget
      },
      message: 'Completion-based project created successfully'
    }));
  });
}

// Helper functions - NEW, doesn't modify existing functions
function generateProjectId(): string {
  // Generate completion-specific project ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return `COMP-${timestamp}-${random}`;
}

async function saveProject(project: any) {
  try {
    const fs = await import('fs').promises;
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
    const fs = await import('fs').promises;
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
