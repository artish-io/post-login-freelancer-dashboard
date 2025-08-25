import { NextResponse, NextRequest } from 'next/server';
// ✅ SAFE: Reuse shared infrastructure only
import { requireSession, assert } from '@/lib/auth/session-guard';
import { sanitizeApiInput } from '@/lib/security/input-sanitizer';
import { withErrorHandling, ok, err } from '@/lib/http/envelope';
import { CompletionCalculationService } from '../payments/services/completion-calculation-service';

// 🔧 RETROACTIVE FIX: Generate missing notifications and execute missing upfront payments
// for completion projects that were created before the fix was implemented

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const { userId: actorId } = await requireSession(req);
    const body = await req.json();
    const { projectId, force = false } = sanitizeApiInput(body);
    
    assert(projectId, 'Project ID is required', 400);
    
    console.log(`🔧 Retroactive activation requested for project: ${projectId}`);
    
    // 1. Load the project
    const project = await getProjectById(projectId);
    assert(project, 'Project not found', 404);
    assert(project.invoicingMethod === 'completion', 'Only completion projects can be retroactively activated', 400);
    
    // 2. Check if project already has upfront payment
    if (project.upfrontPaid && !force) {
      return NextResponse.json(ok({
        message: 'Project already has upfront payment',
        project: {
          projectId: project.projectId,
          upfrontPaid: project.upfrontPaid,
          upfrontAmount: project.upfrontAmount
        },
        skipped: true
      }));
    }
    
    console.log(`🔍 Project ${projectId} needs retroactive activation:`, {
      title: project.title,
      totalBudget: project.totalBudget,
      upfrontPaid: project.upfrontPaid || false,
      commissionerId: project.commissionerId,
      freelancerId: project.freelancerId
    });
    
    // 3. Calculate missing upfront amount
    const upfrontAmount = CompletionCalculationService.calculateUpfrontAmount(project.totalBudget);
    const remainingBudget = project.totalBudget * 0.88;
    
    console.log(`💰 Calculated amounts:`, {
      totalBudget: project.totalBudget,
      upfrontAmount,
      remainingBudget
    });
    
    // 4. Execute retroactive upfront payment
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
        body: JSON.stringify({
          projectId,
          retroactive: true // Flag to indicate this is a retroactive payment
        })
      });
      
      if (!upfrontResponse.ok) {
        const errorText = await upfrontResponse.text();
        console.error(`❌ Retroactive upfront payment failed:`, errorText);
        throw new Error(`Upfront payment failed: ${errorText}`);
      }
      
      upfrontPaymentResult = await upfrontResponse.json();
      console.log(`✅ Retroactive upfront payment executed successfully`);
      
    } catch (error) {
      console.error('❌ Retroactive upfront payment failed:', error);
      throw new Error(`Failed to execute retroactive upfront payment: ${error.message}`);
    }
    
    // 5. Update project with upfront payment info
    const updatedProject = {
      ...project,
      upfrontPaid: true,
      upfrontAmount,
      remainingBudget,
      manualInvoiceAmount: CompletionCalculationService.calculateManualInvoiceAmount(project.totalBudget, project.totalTasks || 4),
      completionPayments: {
        upfrontCompleted: true,
        manualInvoicesCount: 0,
        finalPaymentCompleted: false
      },
      updatedAt: new Date().toISOString(),
      retroactiveActivation: {
        activatedAt: new Date().toISOString(),
        activatedBy: actorId,
        originalCreatedAt: project.createdAt
      }
    };
    
    await updateProject(projectId, updatedProject);
    console.log(`✅ Project ${projectId} updated with upfront payment info`);
    
    // 6. Generate missing notifications retroactively
    try {
      const { handleCompletionNotification } = await import('@/app/api/notifications-v2/completion-handler');
      
      // Get user names for better notifications
      const commissionerName = await getUserName(project.commissionerId) || 'Commissioner';
      const freelancerName = await getUserName(project.freelancerId) || 'Freelancer';
      const orgName = await getOrgName(project.organizationId) || 'Organization';
      
      // Generate project activation notification (backdated)
      await handleCompletionNotification({
        type: 'completion.project_activated',
        actorId: project.commissionerId,
        targetId: project.freelancerId,
        projectId,
        context: {
          projectTitle: project.title,
          totalTasks: project.totalTasks || 4,
          commissionerName,
          freelancerName,
          retroactive: true,
          originalDate: project.createdAt
        }
      });
      
      // Generate upfront payment notification (backdated)
      await handleCompletionNotification({
        type: 'completion.upfront_payment',
        actorId: project.commissionerId,
        targetId: project.freelancerId,
        projectId,
        context: {
          upfrontAmount,
          projectTitle: project.title,
          remainingBudget,
          orgName,
          freelancerName,
          retroactive: true,
          originalDate: project.createdAt
        }
      });
      
      console.log(`✅ Retroactive notifications generated for project ${projectId}`);
      
    } catch (error) {
      console.warn('⚠️ Retroactive notification generation failed:', error);
      // Don't fail the entire operation if notifications fail
    }
    
    return NextResponse.json(ok({
      message: 'Retroactive activation completed successfully',
      project: {
        projectId: updatedProject.projectId,
        title: updatedProject.title,
        upfrontPaid: updatedProject.upfrontPaid,
        upfrontAmount: updatedProject.upfrontAmount,
        remainingBudget: updatedProject.remainingBudget,
        retroactiveActivation: updatedProject.retroactiveActivation
      },
      upfrontPayment: upfrontPaymentResult?.data || null,
      notifications: {
        projectActivation: 'generated',
        upfrontPayment: 'generated'
      },
      calculations: {
        upfrontAmount,
        remainingBudget,
        manualInvoiceAmount: updatedProject.manualInvoiceAmount
      }
    }));
  });
}

// Helper functions
async function getProjectById(projectId: string) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    // Try hierarchical storage first (new format)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const hierarchicalPath = path.join(process.cwd(), 'data', 'projects', String(year), month, day, projectId, 'project.json');
    
    try {
      const projectData = await fs.readFile(hierarchicalPath, 'utf8');
      return JSON.parse(projectData);
    } catch (e) {
      // Try flat storage (old format)
      const flatPath = path.join(process.cwd(), 'data', 'projects.json');
      try {
        const projectsData = await fs.readFile(flatPath, 'utf8');
        const projects = JSON.parse(projectsData);
        return projects.find((p: any) => p.projectId === projectId);
      } catch (e2) {
        return null;
      }
    }
  } catch (error) {
    console.error('Error reading project:', error);
    return null;
  }
}

async function updateProject(projectId: string, updatedProject: any) {
  try {
    const fs = await import('fs').promises;
    const path = await import('path');
    
    // Update hierarchical storage
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const hierarchicalPath = path.join(process.cwd(), 'data', 'projects', String(year), month, day, projectId, 'project.json');
    
    try {
      await fs.writeFile(hierarchicalPath, JSON.stringify(updatedProject, null, 2));
      console.log(`✅ Updated project in hierarchical storage: ${hierarchicalPath}`);
    } catch (e) {
      console.warn('⚠️ Failed to update hierarchical storage, trying flat storage');
      
      // Try flat storage
      const flatPath = path.join(process.cwd(), 'data', 'projects.json');
      try {
        const projectsData = await fs.readFile(flatPath, 'utf8');
        const projects = JSON.parse(projectsData);
        const projectIndex = projects.findIndex((p: any) => p.projectId === projectId);
        
        if (projectIndex !== -1) {
          projects[projectIndex] = updatedProject;
          await fs.writeFile(flatPath, JSON.stringify(projects, null, 2));
          console.log(`✅ Updated project in flat storage`);
        }
      } catch (e2) {
        console.error('❌ Failed to update project in both storage formats');
        throw e2;
      }
    }
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

async function getUserName(userId: number): Promise<string | null> {
  try {
    const { UnifiedStorageService } = await import('@/lib/storage/unified-storage-service');
    const user = await UnifiedStorageService.getUserById(userId);
    return user?.name || null;
  } catch (error) {
    console.error(`Error fetching user name for ID ${userId}:`, error);
    return null;
  }
}

async function getOrgName(orgId: number): Promise<string | null> {
  try {
    const { getAllOrganizations } = await import('@/lib/storage/unified-storage-service');
    const organizations = await getAllOrganizations();
    const organization = organizations.find((org: any) => org.id === orgId);
    return organization?.name || null;
  } catch (error) {
    console.error(`Error fetching organization name for ID ${orgId}:`, error);
    return null;
  }
}
