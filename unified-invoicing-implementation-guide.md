# Unified Invoicing Implementation Guide

## Overview

This guide provides a comprehensive implementation plan to ensure proposals and gig requests use the same invoicing logic as public gigs, properly initializing both milestone-based and completion-based invoicing methods.

## Implementation Strategy

### Core Principle
Create a unified project activation service that handles invoicing method initialization regardless of the project creation source (proposal, gig request, or public gig).

### Architecture Pattern
```
Project Creation Source → Unified Project Activation Service → Invoicing Method Handler
```

## Phase 1: Create Unified Project Activation Service

### 1.1 Create Project Activation Service

**File**: `src/lib/projects/project-activation-service.ts`

```typescript
import { UnifiedStorageService } from '../storage/unified-storage-service';

export interface ProjectActivationRequest {
  projectData: {
    projectId: number;
    title: string;
    description: string;
    freelancerId: number;
    commissionerId: number;
    totalBudget: number;
    invoicingMethod: 'completion' | 'milestone';
    totalTasks?: number;
    // ... other project fields
  };
  source: 'proposal' | 'gig_request' | 'gig_application';
  sourceId: string | number;
}

export interface ProjectActivationResult {
  project: any;
  upfrontPayment?: {
    invoiceNumber: string;
    amount: number;
    transactionId: string;
  };
  milestoneSetup?: {
    milestoneCount: number;
    amountPerMilestone: number;
  };
}

export class ProjectActivationService {
  static async activateProject(request: ProjectActivationRequest): Promise<ProjectActivationResult> {
    const { projectData, source, sourceId } = request;
    
    // 1. Create base project
    const project = await UnifiedStorageService.writeProject({
      ...projectData,
      status: 'ongoing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Initialize invoicing method
    const result: ProjectActivationResult = { project };
    
    if (projectData.invoicingMethod === 'completion') {
      result.upfrontPayment = await this.initializeCompletionInvoicing(projectData);
    } else if (projectData.invoicingMethod === 'milestone') {
      result.milestoneSetup = await this.initializeMilestoneInvoicing(projectData);
    }

    // 3. Log activation event
    await this.logProjectActivation(projectData, source, sourceId);

    return result;
  }

  private static async initializeCompletionInvoicing(projectData: any) {
    // Call existing completion upfront payment API
    const response = await fetch('/api/payments/completion/execute-upfront', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: projectData.projectId })
    });

    if (!response.ok) {
      throw new Error('Failed to execute upfront payment');
    }

    const result = await response.json();
    return {
      invoiceNumber: result.data.invoice.invoiceNumber,
      amount: result.data.invoice.amount,
      transactionId: result.data.transaction.transactionId
    };
  }

  private static async initializeMilestoneInvoicing(projectData: any) {
    // Calculate milestone structure
    const totalTasks = projectData.totalTasks || 1;
    const amountPerMilestone = projectData.totalBudget / totalTasks;

    // No immediate payment for milestone-based projects
    // Auto-invoicing will be triggered on task approvals

    return {
      milestoneCount: totalTasks,
      amountPerMilestone: Math.round(amountPerMilestone * 100) / 100
    };
  }

  private static async logProjectActivation(projectData: any, source: string, sourceId: string | number) {
    // Log project activation event
    console.log(`✅ Project ${projectData.projectId} activated from ${source} ${sourceId}`);
    console.log(`💰 Invoicing method: ${projectData.invoicingMethod}`);
  }
}
```

## Phase 2: Update Proposal Acceptance

### 2.1 Modify Proposal Acceptance Endpoint

**File**: `src/app/api/proposals/[proposalId]/accept/route.ts`

```typescript
// Add import
import { ProjectActivationService } from '../../../../../lib/projects/project-activation-service';

// Replace existing project creation logic with:
async function handleProposalAcceptance(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    // ... existing auth and proposal reading logic ...

    // Prepare project data for activation
    const projectActivationRequest = {
      projectData: {
        projectId: proposal!.projectId || Date.now(),
        title: proposal!.title,
        description: proposal!.summary,
        freelancerId: proposal!.freelancerId,
        commissionerId: proposal!.commissionerId,
        totalBudget: (proposal! as any).totalBid || 0,
        invoicingMethod: (proposal! as any).executionMethod || 'completion',
        totalTasks: (proposal! as any).milestones?.length || 1,
        budget: {
          lower: (proposal! as any).totalBid || 0,
          upper: (proposal! as any).totalBid || 0,
          currency: 'USD'
        }
      },
      source: 'proposal' as const,
      sourceId: proposalId
    };

    // Activate project with proper invoicing initialization
    const activationResult = await ProjectActivationService.activateProject(projectActivationRequest);

    // ... rest of existing logic (events, notifications, etc.) ...

    return NextResponse.json(ok({
      entities: {
        project: activationResult.project,
        proposal: updatedProposal,
        upfrontPayment: activationResult.upfrontPayment,
        milestoneSetup: activationResult.milestoneSetup
      },
      message: 'Proposal accepted and project activated with proper invoicing setup',
      notificationsQueued: true
    }));
  } catch (error) {
    // ... existing error handling ...
  }
}
```

## Phase 3: Update Gig Request Acceptance

### 3.1 Modify Gig Request Acceptance Endpoint

**File**: `src/app/api/gig-requests/[id]/accept/route.ts`

```typescript
// Add import
import { ProjectActivationService } from '../../../../../lib/projects/project-activation-service';

// Replace project creation logic around line 252 with:
const projectActivationRequest = {
  projectData: {
    projectId: newProjectId,
    title: gigRequest.title || gigData.title,
    description: gigData.description || `Project for ${gigRequest.title}`,
    freelancerId: gigRequest.freelancerId,
    commissionerId: gigRequest.commissionerId,
    totalBudget: (gigData as any).upperBudget || gigRequest.budget || 0,
    invoicingMethod: (gigData as any).executionMethod || 
                     (gigData as any).invoicingMethod || 
                     'completion',
    totalTasks: milestoneCount,
    budget: {
      lower: (gigData as any).lowerBudget || gigRequest.budget || 0,
      upper: (gigData as any).upperBudget || gigRequest.budget || 0,
      currency: 'USD'
    },
    // ... other project fields ...
  },
  source: 'gig_request' as const,
  sourceId: requestId
};

// Activate project with proper invoicing initialization
const activationResult = await ProjectActivationService.activateProject(projectActivationRequest);

// Update response to include activation results
return NextResponse.json({
  success: true,
  message: 'Gig request accepted and project activated with proper invoicing setup',
  projectId: newProjectId,
  request: gigRequest,
  upfrontPayment: activationResult.upfrontPayment,
  milestoneSetup: activationResult.milestoneSetup
});
```

## Phase 4: Update Gig Application Acceptance

### 4.1 Modify Gig Match/Application Acceptance

**File**: `src/app/api/gigs/match-freelancer/route.ts`

```typescript
// Add import
import { ProjectActivationService } from '../../../../../lib/projects/project-activation-service';

// Replace project creation logic around line 149 with:
const projectActivationRequest = {
  projectData: {
    ...acceptResult.project,
    status: 'ongoing',
    invoicingMethod: acceptResult.project.invoicingMethod || 'completion',
    totalBudget: acceptResult.project.totalBudget || acceptResult.project.budget?.upper || 0,
    totalTasks: acceptResult.project.totalTasks || 1
  },
  source: 'gig_application' as const,
  sourceId: applicationId
};

// Activate project with proper invoicing initialization
const activationResult = await ProjectActivationService.activateProject(projectActivationRequest);
```

## Phase 5: Error Handling & Rollback

### 5.1 Add Rollback Mechanisms

```typescript
export class ProjectActivationService {
  static async activateProject(request: ProjectActivationRequest): Promise<ProjectActivationResult> {
    let project;
    
    try {
      // 1. Create project
      project = await UnifiedStorageService.writeProject(projectData);
      
      // 2. Initialize invoicing
      if (projectData.invoicingMethod === 'completion') {
        const upfrontResult = await this.initializeCompletionInvoicing(projectData);
        return { project, upfrontPayment: upfrontResult };
      } else {
        const milestoneResult = await this.initializeMilestoneInvoicing(projectData);
        return { project, milestoneSetup: milestoneResult };
      }
    } catch (error) {
      // Rollback project creation if invoicing initialization fails
      if (project) {
        try {
          await UnifiedStorageService.deleteProject(project.projectId);
          console.log(`🔄 Rolled back project ${project.projectId} due to invoicing initialization failure`);
        } catch (rollbackError) {
          console.error('Failed to rollback project creation:', rollbackError);
        }
      }
      throw error;
    }
  }
}
```

## Phase 6: Validation & Testing

### 6.1 Add Validation Guards

```typescript
private static validateProjectData(projectData: any) {
  if (!projectData.invoicingMethod || !['completion', 'milestone'].includes(projectData.invoicingMethod)) {
    throw new Error('Invalid invoicing method');
  }
  
  if (!projectData.totalBudget || projectData.totalBudget <= 0) {
    throw new Error('Invalid total budget');
  }
  
  if (projectData.invoicingMethod === 'completion' && projectData.totalBudget < 100) {
    throw new Error('Completion-based projects require minimum budget of $100 for upfront payment');
  }
}
```

### 6.2 Testing Strategy

1. **Unit Tests**: Test ProjectActivationService with both invoicing methods
2. **Integration Tests**: Test proposal and gig request acceptance flows
3. **End-to-End Tests**: Verify complete user journeys from creation to payment

## Implementation Timeline

### Week 1: Core Service
- Create ProjectActivationService
- Add validation and error handling
- Unit tests for service

### Week 2: Integration
- Update proposal acceptance endpoint
- Update gig request acceptance endpoint
- Update gig application acceptance endpoint

### Week 3: Testing & Refinement
- Integration testing
- Error handling verification
- Performance optimization

### Week 4: Deployment & Monitoring
- Production deployment
- Monitor activation success rates
- User acceptance testing

## Success Metrics

1. **Functional**: 100% of completion-based projects execute upfront payments
2. **Consistency**: All project sources use identical invoicing logic
3. **Reliability**: Zero invoicing initialization failures
4. **User Experience**: Seamless project activation regardless of source

This implementation ensures that proposals, gig requests, and public gigs all use the same robust invoicing logic, eliminating the current gaps and providing a consistent user experience across all project creation flows.
