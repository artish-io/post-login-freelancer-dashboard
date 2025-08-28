/**
 * Project-Gig Consistency Guard System
 * 
 * Ensures that when projects are created, corresponding gigs/gig-requests
 * are properly marked as unavailable to prevent double-booking and maintain
 * data consistency across the system.
 */

import { readGig, updateGig } from '../gigs/hierarchical-storage';
import { readAllGigRequests, updateGigRequestStatus } from '../gigs/gig-request-storage';
import { UnifiedStorageService } from '../storage/unified-storage-service';

export interface GuardResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface ProjectCreationContext {
  projectId: string;
  gigId?: number;
  gigRequestId?: number;
  freelancerId: number;
  commissionerId: number;
  title: string;
}

/**
 * Main guard function that ensures gig/gig-request becomes unavailable
 * when a project is created from it
 */
export async function enforceProjectGigConsistency(
  context: ProjectCreationContext
): Promise<GuardResult> {
  const { projectId, gigId, gigRequestId, title } = context;

  try {
    console.log(`🛡️ [GUARD] Enforcing project-gig consistency for project ${projectId}`);

    // Step 1: Verify project exists
    const projectExists = await verifyProjectExists(projectId);
    if (!projectExists.success) {
      return {
        success: false,
        message: `Project ${projectId} does not exist - cannot enforce gig consistency`,
        details: projectExists.details
      };
    }

    // Step 2: Handle gig status update (if gigId provided)
    if (gigId) {
      const gigResult = await updateGigToUnavailable(gigId, projectId);
      if (!gigResult.success) {
        return gigResult;
      }
    }

    // Step 3: Handle gig request status update (if gigRequestId provided)
    if (gigRequestId) {
      const requestResult = await updateGigRequestToAccepted(gigRequestId, projectId);
      if (!requestResult.success) {
        return requestResult;
      }
    }

    // Step 4: Verify no other active projects exist for the same gig
    if (gigId) {
      const duplicateCheck = await checkForDuplicateProjects(gigId, projectId);
      if (!duplicateCheck.success) {
        return duplicateCheck;
      }
    }

    console.log(`✅ [GUARD] Project-gig consistency enforced successfully for project ${projectId}`);
    return {
      success: true,
      message: `Project-gig consistency enforced for project ${projectId}`,
      details: { projectId, gigId, gigRequestId, title }
    };

  } catch (error: any) {
    console.error(`❌ [GUARD] Failed to enforce project-gig consistency:`, error);
    return {
      success: false,
      message: `Guard enforcement failed: ${error.message}`,
      details: { error: error.message, context }
    };
  }
}

/**
 * Verify that the project actually exists in storage
 */
async function verifyProjectExists(projectId: string): Promise<GuardResult> {
  try {
    const projects = await UnifiedStorageService.listProjects();
    const project = projects.find(p => p.projectId === projectId);

    if (!project) {
      return {
        success: false,
        message: `Project ${projectId} not found in storage`,
        details: { projectId, availableProjects: projects.map(p => p.projectId) }
      };
    }

    return {
      success: true,
      message: `Project ${projectId} verified to exist`,
      details: { project: { id: project.projectId, title: project.title, status: project.status } }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to verify project existence: ${error.message}`,
      details: { error: error.message, projectId }
    };
  }
}

/**
 * Update gig status to 'Unavailable' with verification
 */
async function updateGigToUnavailable(gigId: number, projectId: string): Promise<GuardResult> {
  try {
    // First, verify gig exists
    const gig = await readGig(gigId);
    if (!gig) {
      return {
        success: false,
        message: `Gig ${gigId} not found - cannot update status`,
        details: { gigId, projectId }
      };
    }

    // Check if gig is already unavailable
    if (gig.status === 'Unavailable') {
      console.log(`⚠️ [GUARD] Gig ${gigId} already marked as Unavailable`);
      return {
        success: true,
        message: `Gig ${gigId} already marked as Unavailable`,
        details: { gigId, currentStatus: gig.status, projectId }
      };
    }

    // Update gig status
    await updateGig(gigId, {
      status: 'Unavailable',
      // lastModified: new Date().toISOString(), // Property not in Gig type
      // linkedProjectId: projectId // Property not in Gig type
    } as any);

    console.log(`✅ [GUARD] Gig ${gigId} marked as Unavailable for project ${projectId}`);
    return {
      success: true,
      message: `Gig ${gigId} successfully marked as Unavailable`,
      details: { gigId, previousStatus: gig.status, newStatus: 'Unavailable', projectId }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update gig ${gigId} status: ${error.message}`,
      details: { error: error.message, gigId, projectId }
    };
  }
}

/**
 * Update gig request status to 'accepted' with verification
 */
async function updateGigRequestToAccepted(gigRequestId: number, projectId: string): Promise<GuardResult> {
  try {
    // First, verify gig request exists
    const allGigRequests = await readAllGigRequests();
    const gigRequest = allGigRequests.find(req => req.id === gigRequestId);
    if (!gigRequest) {
      return {
        success: false,
        message: `Gig request ${gigRequestId} not found - cannot update status`,
        details: { gigRequestId, projectId }
      };
    }

    // Check if already accepted
    if (gigRequest.status === 'accepted' || gigRequest.status === 'Accepted') {
      console.log(`⚠️ [GUARD] Gig request ${gigRequestId} already accepted`);
      return {
        success: true,
        message: `Gig request ${gigRequestId} already accepted`,
        details: { gigRequestId, currentStatus: gigRequest.status, projectId }
      };
    }

    // Update gig request status
    await updateGigRequestStatus(gigRequestId, {
      status: 'accepted',
      // acceptedAt: new Date().toISOString(), // Property not in GigRequest type
      // linkedProjectId: projectId // Property not in GigRequest type
    } as any);

    console.log(`✅ [GUARD] Gig request ${gigRequestId} marked as accepted for project ${projectId}`);
    return {
      success: true,
      message: `Gig request ${gigRequestId} successfully marked as accepted`,
      details: { gigRequestId, previousStatus: gigRequest.status, newStatus: 'accepted', projectId }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to update gig request ${gigRequestId} status: ${error.message}`,
      details: { error: error.message, gigRequestId, projectId }
    };
  }
}

/**
 * Check for duplicate projects linked to the same gig
 */
async function checkForDuplicateProjects(gigId: number, currentProjectId: string): Promise<GuardResult> {
  try {
    const projects = await UnifiedStorageService.listProjects();
    const duplicateProjects = projects.filter(p => 
      p.gigId === gigId && 
      p.projectId !== currentProjectId &&
      p.status === 'ongoing'
    );

    if (duplicateProjects.length > 0) {
      return {
        success: false,
        message: `Duplicate active projects found for gig ${gigId}`,
        details: { 
          gigId, 
          currentProjectId, 
          duplicateProjects: duplicateProjects.map(p => ({ id: p.projectId, status: p.status }))
        }
      };
    }

    return {
      success: true,
      message: `No duplicate projects found for gig ${gigId}`,
      details: { gigId, currentProjectId }
    };

  } catch (error: any) {
    return {
      success: false,
      message: `Failed to check for duplicate projects: ${error.message}`,
      details: { error: error.message, gigId, currentProjectId }
    };
  }
}

/**
 * Rollback function to revert gig/gig-request status if project creation fails
 */
export async function rollbackProjectGigConsistency(
  context: ProjectCreationContext
): Promise<GuardResult> {
  const { projectId, gigId, gigRequestId } = context;

  try {
    console.log(`🔄 [GUARD] Rolling back project-gig consistency for failed project ${projectId}`);

    // Rollback gig status
    if (gigId) {
      await updateGig(gigId, {
        status: 'Available',
        // lastModified: new Date().toISOString(), // Property not in Gig type
        // linkedProjectId: undefined // Property not in Gig type
      } as any);
      console.log(`🔄 [GUARD] Gig ${gigId} status rolled back to Available`);
    }

    // Rollback gig request status
    if (gigRequestId) {
      await updateGigRequestStatus(gigRequestId, {
        status: 'pending',
        // acceptedAt: undefined, // Property not in GigRequest type
        // linkedProjectId: undefined // Property not in GigRequest type
      } as any);
      console.log(`🔄 [GUARD] Gig request ${gigRequestId} status rolled back to pending`);
    }

    return {
      success: true,
      message: `Successfully rolled back project-gig consistency for project ${projectId}`,
      details: { projectId, gigId, gigRequestId }
    };

  } catch (error: any) {
    console.error(`❌ [GUARD] Failed to rollback project-gig consistency:`, error);
    return {
      success: false,
      message: `Rollback failed: ${error.message}`,
      details: { error: error.message, context }
    };
  }
}
