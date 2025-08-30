/**
 * 🏢 ORGANIZATION PLACEHOLDER GENERATOR
 * 
 * Creates deterministic placeholder organizations for proposals without organization data.
 * Used when commissioners submit proposals with only email addresses.
 * 
 * Feature flag: ENABLE_PROPOSAL_ORG_PLACEHOLDERS
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';

// Feature flag - can be toggled off immediately if issues occur
function isFeatureEnabled(): boolean {
  return process.env.ENABLE_PROPOSAL_ORG_PLACEHOLDERS === 'true';
}

// Audit logging for organization placeholder creation
export function auditLog(event: string, data: any) {
  const timestamp = new Date().toISOString();
  console.log(`[ORG_PLACEHOLDER_AUDIT] ${timestamp} ${event}:`, JSON.stringify(data, null, 2));
}

export interface PlaceholderOrgOptions {
  commissionerId: number;
  sourceEmail: string;
  commissionerName?: string;
}

export interface PlaceholderOrgResult {
  success: boolean;
  organization?: any;
  error?: 'feature_disabled' | 'invalid_email' | 'creation_failed' | 'org_exists';
  orgId?: number;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Generate deterministic organization ID from email
 */
function generateOrgIdFromEmail(email: string): number {
  // Create deterministic hash from email
  const hash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  // Take first 8 characters and convert to number, ensure it's positive and reasonable
  const hashNum = parseInt(hash.substring(0, 8), 16);
  // Ensure it's in a safe range (1000-999999) to avoid conflicts with real org IDs
  return 1000 + (hashNum % 999000);
}

/**
 * Generate organization name from email
 */
function generateOrgNameFromEmail(email: string, commissionerName?: string): string {
  const emailPrefix = email.split('@')[0];
  const domain = email.split('@')[1];
  
  if (commissionerName) {
    return `${commissionerName}'s Organization`;
  }
  
  // Fallback to email-based name
  const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, '');
  const cleanDomain = domain.split('.')[0];
  return `${cleanPrefix.charAt(0).toUpperCase()}${cleanPrefix.slice(1)} (${cleanDomain})`;
}

/**
 * Check if organization already exists
 */
async function organizationExists(orgId: number): Promise<boolean> {
  try {
    const organizations = await UnifiedStorageService.getAllOrganizations();
    return organizations.some((org: any) => org.id === orgId);
  } catch (error) {
    auditLog('org_existence_check_failed', { orgId, error: String(error) });
    return false;
  }
}

/**
 * Create placeholder organization with atomic write
 */
export async function createPlaceholderOrganization(options: PlaceholderOrgOptions): Promise<PlaceholderOrgResult> {
  const featureEnabled = isFeatureEnabled();
  if (!featureEnabled) {
    auditLog('placeholder_org_creation_disabled', {
      commissionerId: options.commissionerId,
      featureFlag: featureEnabled
    });
    return { success: false, error: 'feature_disabled' };
  }

  // Validate email
  if (!options.sourceEmail || !isValidEmail(options.sourceEmail)) {
    auditLog('invalid_email_provided', {
      commissionerId: options.commissionerId,
      sourceEmail: options.sourceEmail
    });
    return { success: false, error: 'invalid_email' };
  }

  try {
    // Generate deterministic org ID
    const orgId = generateOrgIdFromEmail(options.sourceEmail);
    
    auditLog('placeholder_org_generation_attempt', {
      commissionerId: options.commissionerId,
      sourceEmail: options.sourceEmail,
      generatedOrgId: orgId
    });

    // Check if organization already exists
    const exists = await organizationExists(orgId);
    if (exists) {
      auditLog('placeholder_org_already_exists', {
        commissionerId: options.commissionerId,
        orgId,
        sourceEmail: options.sourceEmail
      });
      
      // Return existing organization
      const organizations = await UnifiedStorageService.getAllOrganizations();
      const existingOrg = organizations.find((org: any) => org.id === orgId);
      return { success: true, organization: existingOrg, orgId };
    }

    // Create placeholder organization with all required fields
    const orgName = generateOrgNameFromEmail(options.sourceEmail, options.commissionerName);
    const placeholderOrg = {
      id: orgId,
      name: orgName,
      email: options.sourceEmail,
      phone: '',
      address: '',
      logo: '',
      website: '',
      description: `Placeholder organization created for proposal submission`,
      industry: 'Other',
      size: '1-10',
      founded: new Date().getFullYear(),
      firstCommissionerId: options.commissionerId, // Required field for organization storage
      isPlaceholder: true,
      createdBy: options.commissionerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Atomic write to storage
    await UnifiedStorageService.writeOrganization(placeholderOrg);

    auditLog('organization_placeholder_created', {
      commissionerId: options.commissionerId,
      generatedOrgId: orgId,
      sourceEmail: options.sourceEmail,
      orgName,
      timestamp: new Date().toISOString()
    });

    return { 
      success: true, 
      organization: placeholderOrg,
      orgId 
    };

  } catch (error) {
    auditLog('placeholder_org_creation_failed', {
      commissionerId: options.commissionerId,
      sourceEmail: options.sourceEmail,
      error: String(error)
    });
    
    return { success: false, error: 'creation_failed' };
  }
}

/**
 * Get or create placeholder organization for proposal
 */
export async function getOrCreatePlaceholderOrg(options: PlaceholderOrgOptions): Promise<PlaceholderOrgResult> {
  try {
    // First try to get existing organization by deterministic ID
    const orgId = generateOrgIdFromEmail(options.sourceEmail);
    const organizations = await UnifiedStorageService.getAllOrganizations();
    const existingOrg = organizations.find((org: any) => org.id === orgId);
    
    if (existingOrg) {
      auditLog('placeholder_org_found_existing', {
        commissionerId: options.commissionerId,
        orgId,
        sourceEmail: options.sourceEmail
      });
      return { success: true, organization: existingOrg, orgId };
    }

    // Create new placeholder organization
    return await createPlaceholderOrganization(options);
    
  } catch (error) {
    auditLog('get_or_create_placeholder_failed', {
      commissionerId: options.commissionerId,
      sourceEmail: options.sourceEmail,
      error: String(error)
    });
    
    return { success: false, error: 'creation_failed' };
  }
}

/**
 * Clean up placeholder organizations (for staging/testing)
 */
export async function cleanupPlaceholderOrganizations(): Promise<{
  success: boolean;
  deletedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let deletedCount = 0;

  try {
    const organizations = await UnifiedStorageService.getAllOrganizations();
    const placeholderOrgs = organizations.filter((org: any) => org.isPlaceholder === true);

    auditLog('placeholder_cleanup_started', {
      totalOrgs: organizations.length,
      placeholderCount: placeholderOrgs.length
    });

    for (const org of placeholderOrgs) {
      try {
        await UnifiedStorageService.deleteOrganization(org.id);
        deletedCount++;
        auditLog('placeholder_org_deleted', { orgId: org.id, orgName: org.name });
      } catch (error) {
        const errorMsg = `Failed to delete org ${org.id}: ${error}`;
        errors.push(errorMsg);
        auditLog('placeholder_org_deletion_failed', { orgId: org.id, error: String(error) });
      }
    }

    auditLog('placeholder_cleanup_completed', {
      deletedCount,
      errorCount: errors.length
    });

    return { success: true, deletedCount, errors };

  } catch (error) {
    const errorMsg = `Cleanup failed: ${error}`;
    errors.push(errorMsg);
    auditLog('placeholder_cleanup_failed', { error: String(error) });
    
    return { success: false, deletedCount, errors };
  }
}
