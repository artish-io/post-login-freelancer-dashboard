// src/lib/proposals/enriched-metadata.ts

import { readFile } from 'fs/promises';
import path from 'path';
import { Proposal } from './hierarchical-storage';

export interface EnrichedProposalMetadata {
  // Basic proposal info
  proposalId: string;
  title: string;
  summary: string;
  budget: number;
  executionMethod: 'completion' | 'milestone';
  timeline: string;
  
  // Freelancer info
  freelancer: {
    id: number;
    name: string;
    email: string;
    avatar: string;
    bio?: string;
    rating?: number;
    skills?: string[];
    portfolio?: string[];
  };
  
  // Commissioner/Organization info
  commissioner: {
    id: number;
    name: string;
    email: string;
    organizationName?: string;
    organizationId?: number;
  };
  
  // Financial breakdown
  financial: {
    totalBid: number;
    currency: string;
    upfrontAmount?: number;
    upfrontPercentage?: number;
    milestoneCount?: number;
    amountPerMilestone?: number;
  };
  
  // Timeline details
  timeline_details: {
    startDate: string;
    endDate?: string;
    estimatedDuration: string;
    startType: 'Immediately' | 'Custom';
  };
  
  // Proposal metadata
  metadata: {
    sentAt: string;
    status: 'sent' | 'accepted' | 'rejected';
    typeTags: string[];
    logoUrl?: string;
    milestones: Array<{
      title: string;
      description: string;
      amount: number;
      startDate: string;
      endDate: string;
    }>;
  };
  
  // Email-specific data
  email: {
    subject: string;
    previewText: string;
    actionUrl: string;
    expiresAt?: string;
  };
}

/**
 * Generate enriched proposal metadata for email notifications
 */
export async function generateEnrichedProposalMetadata(
  proposal: Proposal,
  baseUrl: string = 'https://artish.app'
): Promise<EnrichedProposalMetadata> {
  // Load user data from hierarchical storage
  const { getAllUsers } = await import('../storage/unified-storage-service');
  const users = await getAllUsers();

  // Find freelancer and commissioner
  const freelancer = users.find((u: any) => u.id === (proposal as any).freelancerId);
  const commissioner = users.find((u: any) => u.id === proposal.commissionerId);

  if (!freelancer || !commissioner) {
    throw new Error('Freelancer or commissioner not found');
  }
  
  // Calculate timeline
  const startDate = proposal.customStartDate || new Date().toISOString();
  const endDate = proposal.endDate;
  const estimatedDuration = calculateDuration(startDate, endDate);
  
  // Generate email subject and preview
  const subject = `New Proposal: ${proposal.title} from ${freelancer.name}`;
  const previewText = `${freelancer.name} has sent you a proposal for "${proposal.title}" with a budget of $${proposal.totalBid?.toLocaleString() || 'TBD'}`;
  
  // Create action URL for commissioners without accounts
  const actionUrl = `${baseUrl}/commissioner-dashboard/projects-and-invoices/recieved-proposals/${proposal.id}`;
  
  return {
    proposalId: proposal.id,
    title: proposal.title,
    summary: proposal.summary,
    budget: proposal.totalBid || 0,
    executionMethod: proposal.executionMethod || 'completion',
    timeline: estimatedDuration,
    
    freelancer: {
      id: freelancer.id,
      name: freelancer.name,
      email: freelancer.email,
      avatar: freelancer.avatar || '/avatars/default.png',
      bio: freelancer.bio,
      rating: freelancer.rating,
      skills: freelancer.skills || [],
      portfolio: freelancer.portfolio || []
    },
    
    commissioner: {
      id: commissioner.id,
      name: commissioner.name,
      email: commissioner.email,
      organizationName: commissioner.organizationName,
      organizationId: commissioner.organizationId
    },
    
    financial: {
      totalBid: proposal.totalBid || 0,
      currency: 'USD',
      upfrontAmount: proposal.upfrontAmount,
      upfrontPercentage: proposal.upfrontPercentage,
      milestoneCount: proposal.milestones?.length || 0,
      amountPerMilestone: proposal.amountPerMilestone
    },
    
    timeline_details: {
      startDate: startDate,
      endDate: endDate,
      estimatedDuration: estimatedDuration,
      startType: proposal.startType || 'Immediately'
    },
    
    metadata: {
      sentAt: proposal.sentAt || proposal.createdAt,
      status: proposal.status as any,
      typeTags: proposal.typeTags || [],
      logoUrl: proposal.logoUrl,
      milestones: proposal.milestones || []
    },
    
    email: {
      subject: subject,
      previewText: previewText,
      actionUrl: actionUrl,
      expiresAt: calculateExpirationDate(proposal.sentAt || proposal.createdAt)
    }
  };
}

/**
 * Calculate duration between two dates
 */
function calculateDuration(startDate: string, endDate?: string): string {
  if (!endDate) return 'Duration not specified';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months`;
  return `${Math.ceil(diffDays / 365)} years`;
}

/**
 * Calculate proposal expiration date (30 days from sent date)
 */
function calculateExpirationDate(sentAt: string): string {
  const sentDate = new Date(sentAt);
  const expirationDate = new Date(sentDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  return expirationDate.toISOString();
}

/**
 * Save enriched proposal metadata for email system
 */
export async function saveEnrichedProposalMetadata(
  proposalId: string,
  metadata: EnrichedProposalMetadata
): Promise<void> {
  const metadataPath = path.join(
    process.cwd(),
    'data',
    'proposals',
    'enriched-metadata',
    `${proposalId}.json`
  );
  
  // Ensure directory exists
  const { mkdir, writeFile } = await import('fs/promises');
  const dir = path.dirname(metadataPath);
  await mkdir(dir, { recursive: true });
  
  // Save metadata
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Read enriched proposal metadata
 */
export async function readEnrichedProposalMetadata(
  proposalId: string
): Promise<EnrichedProposalMetadata | null> {
  try {
    const metadataPath = path.join(
      process.cwd(),
      'data',
      'proposals',
      'enriched-metadata',
      `${proposalId}.json`
    );
    
    const data = await readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Generate email-ready proposal summary for external notifications
 */
export function generateEmailSummary(metadata: EnrichedProposalMetadata): {
  html: string;
  text: string;
} {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Proposal: ${metadata.title}</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Proposal Details</h3>
        <p><strong>From:</strong> ${metadata.freelancer.name}</p>
        <p><strong>Budget:</strong> $${metadata.financial.totalBid.toLocaleString()}</p>
        <p><strong>Timeline:</strong> ${metadata.timeline}</p>
        <p><strong>Execution Method:</strong> ${metadata.executionMethod === 'completion' ? 'Completion-based' : 'Milestone-based'}</p>
      </div>
      
      <div style="margin: 20px 0;">
        <h3>Project Summary</h3>
        <p>${metadata.summary}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${metadata.email.actionUrl}" 
           style="background: #eb1966; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Proposal
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        This proposal expires on ${new Date(metadata.email.expiresAt!).toLocaleDateString()}.
      </p>
    </div>
  `;
  
  const text = `
New Proposal: ${metadata.title}

From: ${metadata.freelancer.name}
Budget: $${metadata.financial.totalBid.toLocaleString()}
Timeline: ${metadata.timeline}
Execution Method: ${metadata.executionMethod === 'completion' ? 'Completion-based' : 'Milestone-based'}

Project Summary:
${metadata.summary}

View Proposal: ${metadata.email.actionUrl}

This proposal expires on ${new Date(metadata.email.expiresAt!).toLocaleDateString()}.
  `;
  
  return { html: html.trim(), text: text.trim() };
}
