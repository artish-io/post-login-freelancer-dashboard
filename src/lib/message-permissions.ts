// src/lib/message-permissions.ts

import { readThreadMetadata, readAllThreads } from './messages-utils';

export interface MessagePermissionResult {
  canSend: boolean;
  reason?: string;
  threadStatus?: string;
}

/**
 * Check if a commissioner can send a message to a freelancer
 * Implements anti-spam rules:
 * - Can send if there's an active conversation (freelancer has replied)
 * - Can send if there's a valid project relationship
 * - Cannot send multiple cold messages without response
 */
export async function checkCommissionerMessagePermission(
  commissionerId: number,
  freelancerId: number
): Promise<MessagePermissionResult> {
  try {
    // Generate thread ID (always smaller ID first)
    const threadId = [commissionerId, freelancerId].sort((a, b) => a - b).join('-');
    
    // Check if thread exists and its status
    const threadMetadata = await readThreadMetadata(threadId);
    
    if (!threadMetadata) {
      // No thread exists - this would be a first message, which is allowed
      return { canSend: true };
    }

    // Check thread status
    const status = threadMetadata.metadata?.status;
    const initiatedBy = threadMetadata.metadata?.initiatedBy;

    // If thread is active (both parties have participated), allow messaging
    if (status === 'active') {
      return { canSend: true, threadStatus: 'active' };
    }

    // If thread is pending response and commissioner initiated it, block additional messages
    if (status === 'pending_response' && initiatedBy === commissionerId) {
      return { 
        canSend: false, 
        reason: "You've sent a message. You'll be able to continue the conversation once the freelancer replies.",
        threadStatus: 'pending_response'
      };
    }

    // If thread is pending response but freelancer initiated it, allow commissioner to respond
    if (status === 'pending_response' && initiatedBy === freelancerId) {
      return { canSend: true, threadStatus: 'pending_response' };
    }

    // Check for project relationship as an override
    const hasProjectRelationship = await checkProjectRelationship(commissionerId, freelancerId);
    if (hasProjectRelationship) {
      return { canSend: true, threadStatus: status };
    }

    // Default to allowing first message if no clear restriction
    return { canSend: true };

  } catch (error) {
    console.error('Error checking message permission:', error);
    // On error, default to allowing the message to avoid blocking legitimate communication
    return { canSend: true };
  }
}

/**
 * Check if there's a valid project relationship between commissioner and freelancer
 */
async function checkProjectRelationship(commissionerId: number, freelancerId: number): Promise<boolean> {
  try {
    // This function is called from the API route, so we can use file system access
    const { readAllProjects } = await import('./projects-utils');
    const projectsData = await readAllProjects();

    // Check if there's any project where this commissioner and freelancer worked together
    const hasProject = projectsData.some((project: any) =>
      project.commissionerId === commissionerId && project.freelancerId === freelancerId
    );

    return hasProject;
  } catch (error) {
    console.error('Error checking project relationship:', error);
    return false;
  }
}

/**
 * Check if there's an accepted gig relationship between commissioner and freelancer
 */
async function checkAcceptedGigRelationship(commissionerId: number, freelancerId: number): Promise<boolean> {
  try {
    // This function is called from the API route, so we can use file system access
    const fs = await import('fs/promises');
    const path = await import('path');

    // Read gig applications
    const applicationsPath = path.join(process.cwd(), 'data/gigs/gig-applications.json');
    const applicationsData = JSON.parse(await fs.readFile(applicationsPath, 'utf-8'));

    // Read gigs data using hierarchical storage
    const { readAllGigs } = await import('./gigs/hierarchical-storage');
    const gigsData = await readAllGigs();

    // Check if there's any accepted application from this freelancer to this commissioner's gigs
    const hasAcceptedGig = applicationsData.some((application: any) => {
      if (application.freelancerId !== freelancerId || application.status !== 'accepted') {
        return false;
      }

      // Find the gig and check if it belongs to this commissioner
      const gig = gigsData.find((g: any) => g.id === application.gigId);
      return gig && gig.commissionerId === commissionerId;
    });

    return hasAcceptedGig;
  } catch (error) {
    console.error('Error checking accepted gig relationship:', error);
    return false;
  }
}
