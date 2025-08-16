/**
 * Data Consistency Validator
 * 
 * Validates and reports inconsistencies between projects, gigs, and gig requests.
 * Can be run periodically or on-demand to ensure system integrity.
 */

import { readAllGigs } from '../gigs/hierarchical-storage';
import { readAllGigRequests } from '../gigs/gig-request-storage';
import { readAllGigApplications } from '../gigs/gig-applications-storage';
import { UnifiedStorageService } from '../storage/unified-storage-service';

export interface ValidationResult {
  isValid: boolean;
  summary: {
    totalProjects: number;
    totalGigs: number;
    totalGigRequests: number;
    totalApplications: number;
    inconsistencies: number;
  };
  inconsistencies: Inconsistency[];
  recommendations: string[];
}

export interface Inconsistency {
  type: 'AVAILABLE_GIG_WITH_PROJECT' | 'UNAVAILABLE_GIG_WITHOUT_PROJECT' | 'ACCEPTED_APPLICATION_WITHOUT_PROJECT' | 'PENDING_REQUEST_WITH_PROJECT' | 'DUPLICATE_PROJECTS_FOR_GIG';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedEntities: {
    projectId?: string;
    gigId?: number;
    gigRequestId?: number;
    applicationId?: number;
  };
  suggestedFix: string;
}

/**
 * Main validation function that checks all data consistency rules
 */
export async function validateDataConsistency(): Promise<ValidationResult> {
  console.log('🔍 [VALIDATOR] Starting data consistency validation...');

  try {
    // Load all data
    const [projects, gigs, gigRequests, applications] = await Promise.all([
      UnifiedStorageService.listProjects(),
      readAllGigs(),
      readAllGigRequests(),
      readAllGigApplications()
    ]);

    console.log(`📊 [VALIDATOR] Loaded data: ${projects.length} projects, ${gigs.length} gigs, ${gigRequests.length} gig requests, ${applications.length} applications`);

    const inconsistencies: Inconsistency[] = [];

    // Rule 1: Available gigs should not have active projects
    inconsistencies.push(...await checkAvailableGigsWithProjects(gigs, projects));

    // Rule 2: Unavailable gigs should have corresponding active projects
    inconsistencies.push(...await checkUnavailableGigsWithoutProjects(gigs, projects));

    // Rule 3: Accepted applications should have corresponding projects
    inconsistencies.push(...await checkAcceptedApplicationsWithoutProjects(applications, projects));

    // Rule 4: Pending gig requests should not have projects
    inconsistencies.push(...await checkPendingRequestsWithProjects(gigRequests, projects));

    // Rule 5: No duplicate active projects for the same gig
    inconsistencies.push(...await checkDuplicateProjectsForGigs(projects));

    const isValid = inconsistencies.length === 0;
    const recommendations = generateRecommendations(inconsistencies);

    const result: ValidationResult = {
      isValid,
      summary: {
        totalProjects: projects.length,
        totalGigs: gigs.length,
        totalGigRequests: gigRequests.length,
        totalApplications: applications.length,
        inconsistencies: inconsistencies.length
      },
      inconsistencies,
      recommendations
    };

    if (isValid) {
      console.log('✅ [VALIDATOR] Data consistency validation passed - no inconsistencies found');
    } else {
      console.log(`⚠️ [VALIDATOR] Data consistency validation found ${inconsistencies.length} inconsistencies`);
    }

    return result;

  } catch (error: any) {
    console.error('❌ [VALIDATOR] Data consistency validation failed:', error);
    throw new Error(`Validation failed: ${error.message}`);
  }
}

/**
 * Check for gigs marked as Available that have active projects
 */
async function checkAvailableGigsWithProjects(gigs: any[], projects: any[]): Promise<Inconsistency[]> {
  const inconsistencies: Inconsistency[] = [];

  for (const gig of gigs) {
    if (gig.status === 'Available') {
      const relatedProjects = projects.filter(p => 
        p.gigId === gig.id && 
        (p.status === 'ongoing' || p.status === 'paused')
      );

      if (relatedProjects.length > 0) {
        inconsistencies.push({
          type: 'AVAILABLE_GIG_WITH_PROJECT',
          severity: 'HIGH',
          description: `Gig ${gig.id} ("${gig.title}") is marked as Available but has ${relatedProjects.length} active project(s)`,
          affectedEntities: {
            gigId: gig.id,
            projectId: relatedProjects[0].projectId
          },
          suggestedFix: `Update gig ${gig.id} status to 'Unavailable'`
        });
      }
    }
  }

  return inconsistencies;
}

/**
 * Check for gigs marked as Unavailable that don't have active projects
 */
async function checkUnavailableGigsWithoutProjects(gigs: any[], projects: any[]): Promise<Inconsistency[]> {
  const inconsistencies: Inconsistency[] = [];

  for (const gig of gigs) {
    if (gig.status === 'Unavailable') {
      const relatedProjects = projects.filter(p => 
        p.gigId === gig.id && 
        (p.status === 'ongoing' || p.status === 'paused')
      );

      if (relatedProjects.length === 0) {
        inconsistencies.push({
          type: 'UNAVAILABLE_GIG_WITHOUT_PROJECT',
          severity: 'MEDIUM',
          description: `Gig ${gig.id} ("${gig.title}") is marked as Unavailable but has no active projects`,
          affectedEntities: {
            gigId: gig.id
          },
          suggestedFix: `Update gig ${gig.id} status to 'Available' or verify if project was completed/cancelled`
        });
      }
    }
  }

  return inconsistencies;
}

/**
 * Check for accepted applications that don't have corresponding projects
 */
async function checkAcceptedApplicationsWithoutProjects(applications: any[], projects: any[]): Promise<Inconsistency[]> {
  const inconsistencies: Inconsistency[] = [];

  for (const application of applications) {
    if (application.status === 'accepted') {
      const relatedProjects = projects.filter(p => 
        p.gigId === application.gigId && 
        p.freelancerId === application.freelancerId &&
        (p.status === 'ongoing' || p.status === 'paused' || p.status === 'completed')
      );

      if (relatedProjects.length === 0) {
        inconsistencies.push({
          type: 'ACCEPTED_APPLICATION_WITHOUT_PROJECT',
          severity: 'HIGH',
          description: `Application ${application.id} for gig ${application.gigId} is accepted but has no corresponding project`,
          affectedEntities: {
            applicationId: application.id,
            gigId: application.gigId
          },
          suggestedFix: `Create project for application ${application.id} or revert application status to 'pending'`
        });
      }
    }
  }

  return inconsistencies;
}

/**
 * Check for pending gig requests that have projects (should be accepted)
 */
async function checkPendingRequestsWithProjects(gigRequests: any[], projects: any[]): Promise<Inconsistency[]> {
  const inconsistencies: Inconsistency[] = [];

  for (const request of gigRequests) {
    if (request.status === 'pending' || request.status === 'Pending') {
      const relatedProjects = projects.filter(p => 
        p.freelancerId === request.freelancerId &&
        p.commissionerId === request.commissionerId &&
        p.title === request.title &&
        (p.status === 'ongoing' || p.status === 'paused')
      );

      if (relatedProjects.length > 0) {
        inconsistencies.push({
          type: 'PENDING_REQUEST_WITH_PROJECT',
          severity: 'MEDIUM',
          description: `Gig request ${request.id} ("${request.title}") is pending but has corresponding project ${relatedProjects[0].projectId}`,
          affectedEntities: {
            gigRequestId: request.id,
            projectId: relatedProjects[0].projectId
          },
          suggestedFix: `Update gig request ${request.id} status to 'accepted'`
        });
      }
    }
  }

  return inconsistencies;
}

/**
 * Check for duplicate active projects linked to the same gig
 */
async function checkDuplicateProjectsForGigs(projects: any[]): Promise<Inconsistency[]> {
  const inconsistencies: Inconsistency[] = [];
  const gigProjectMap = new Map<number, any[]>();

  // Group projects by gigId
  for (const project of projects) {
    if (project.gigId && (project.status === 'ongoing' || project.status === 'paused')) {
      if (!gigProjectMap.has(project.gigId)) {
        gigProjectMap.set(project.gigId, []);
      }
      gigProjectMap.get(project.gigId)!.push(project);
    }
  }

  // Check for duplicates
  for (const [gigId, projectList] of gigProjectMap.entries()) {
    if (projectList.length > 1) {
      inconsistencies.push({
        type: 'DUPLICATE_PROJECTS_FOR_GIG',
        severity: 'HIGH',
        description: `Gig ${gigId} has ${projectList.length} active projects: ${projectList.map(p => p.projectId).join(', ')}`,
        affectedEntities: {
          gigId,
          projectId: projectList[0].projectId
        },
        suggestedFix: `Review projects for gig ${gigId} and ensure only one is active`
      });
    }
  }

  return inconsistencies;
}

/**
 * Generate actionable recommendations based on inconsistencies
 */
function generateRecommendations(inconsistencies: Inconsistency[]): string[] {
  const recommendations: string[] = [];

  const highSeverityCount = inconsistencies.filter(i => i.severity === 'HIGH').length;
  const mediumSeverityCount = inconsistencies.filter(i => i.severity === 'MEDIUM').length;

  if (highSeverityCount > 0) {
    recommendations.push(`🚨 Address ${highSeverityCount} HIGH severity inconsistencies immediately - these affect core business logic`);
  }

  if (mediumSeverityCount > 0) {
    recommendations.push(`⚠️ Review ${mediumSeverityCount} MEDIUM severity inconsistencies - these may cause user confusion`);
  }

  if (inconsistencies.length === 0) {
    recommendations.push('✅ System data consistency is healthy - no action required');
  } else {
    recommendations.push('🔧 Run the data consistency fixer script to automatically resolve common issues');
    recommendations.push('📊 Schedule regular consistency checks to prevent future issues');
  }

  return recommendations;
}

/**
 * Quick health check that returns a simple boolean
 */
export async function isSystemHealthy(): Promise<boolean> {
  try {
    const result = await validateDataConsistency();
    return result.isValid;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
