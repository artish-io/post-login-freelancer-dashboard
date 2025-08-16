/**
 * Project Creation Guard Middleware
 * 
 * Middleware that can be applied to any project creation endpoint to ensure
 * proper gig/gig-request status updates and data consistency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enforceProjectGigConsistency, rollbackProjectGigConsistency, ProjectCreationContext } from '../guards/project-gig-consistency-guard';

export interface ProjectCreationResult {
  success: boolean;
  projectId?: string;
  message: string;
  data?: any;
  error?: string;
}

export interface GuardedProjectCreationOptions {
  enableRollback?: boolean;
  skipGuardOnFailure?: boolean;
  logLevel?: 'minimal' | 'detailed';
}

/**
 * Wrapper function that adds consistency guards to project creation operations
 */
export async function withProjectCreationGuard<T>(
  projectCreationFn: () => Promise<ProjectCreationResult>,
  context: ProjectCreationContext,
  options: GuardedProjectCreationOptions = {}
): Promise<ProjectCreationResult> {
  
  const { enableRollback = true, skipGuardOnFailure = false, logLevel = 'detailed' } = options;
  
  if (logLevel === 'detailed') {
    console.log(`🛡️ [GUARD] Starting guarded project creation for: ${context.title}`);
  }

  let projectCreated = false;
  let projectResult: ProjectCreationResult | null = null;

  try {
    // Step 1: Execute the project creation function
    if (logLevel === 'detailed') {
      console.log(`🔄 [GUARD] Executing project creation function...`);
    }
    
    projectResult = await projectCreationFn();
    
    if (!projectResult.success) {
      if (logLevel === 'detailed') {
        console.log(`❌ [GUARD] Project creation failed: ${projectResult.message}`);
      }
      return projectResult;
    }

    projectCreated = true;
    
    if (logLevel === 'detailed') {
      console.log(`✅ [GUARD] Project created successfully: ${projectResult.projectId}`);
    }

    // Step 2: Enforce consistency guards
    if (context.gigId || context.gigRequestId) {
      if (logLevel === 'detailed') {
        console.log(`🛡️ [GUARD] Enforcing consistency for project ${projectResult.projectId}...`);
      }

      const guardContext: ProjectCreationContext = {
        ...context,
        projectId: projectResult.projectId!
      };

      const guardResult = await enforceProjectGigConsistency(guardContext);

      if (!guardResult.success) {
        console.error(`❌ [GUARD] Consistency enforcement failed: ${guardResult.message}`);

        if (enableRollback) {
          console.log(`🔄 [GUARD] Attempting rollback...`);
          
          try {
            await rollbackProjectGigConsistency(guardContext);
            console.log(`✅ [GUARD] Rollback completed successfully`);
          } catch (rollbackError: any) {
            console.error(`❌ [GUARD] Rollback failed: ${rollbackError.message}`);
          }
        }

        if (skipGuardOnFailure) {
          console.log(`⚠️ [GUARD] Continuing despite guard failure (skipGuardOnFailure=true)`);
          return {
            ...projectResult,
            message: `${projectResult.message} (Warning: Guard failed but project created)`
          };
        } else {
          return {
            success: false,
            message: `Project creation failed guard validation: ${guardResult.message}`,
            error: guardResult.message,
            data: guardResult.details
          };
        }
      }

      if (logLevel === 'detailed') {
        console.log(`✅ [GUARD] Consistency enforcement completed successfully`);
      }
    } else {
      if (logLevel === 'detailed') {
        console.log(`ℹ️ [GUARD] No gig/gig-request associated - skipping consistency enforcement`);
      }
    }

    // Step 3: Return successful result
    return projectResult;

  } catch (error: any) {
    console.error(`❌ [GUARD] Unexpected error during guarded project creation:`, error);

    // Attempt rollback if project was created
    if (projectCreated && enableRollback && (context.gigId || context.gigRequestId)) {
      console.log(`🔄 [GUARD] Attempting emergency rollback due to unexpected error...`);
      
      try {
        const guardContext: ProjectCreationContext = {
          ...context,
          projectId: projectResult?.projectId || 'unknown'
        };
        
        await rollbackProjectGigConsistency(guardContext);
        console.log(`✅ [GUARD] Emergency rollback completed`);
      } catch (rollbackError: any) {
        console.error(`❌ [GUARD] Emergency rollback failed: ${rollbackError.message}`);
      }
    }

    return {
      success: false,
      message: `Project creation failed with unexpected error: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Express-style middleware for Next.js API routes
 */
export function createProjectCreationMiddleware(options: GuardedProjectCreationOptions = {}) {
  return async function projectCreationMiddleware(
    req: NextRequest,
    context: ProjectCreationContext,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    
    const { logLevel = 'minimal' } = options;
    
    if (logLevel === 'detailed') {
      console.log(`🛡️ [MIDDLEWARE] Project creation middleware activated`);
    }

    try {
      // Execute the main handler
      const response = await next();
      
      // Check if the response indicates success
      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok && responseData.success) {
        // Apply guards after successful project creation
        if (context.gigId || context.gigRequestId) {
          const guardContext: ProjectCreationContext = {
            ...context,
            projectId: responseData.projectId || responseData.data?.projectId
          };

          const guardResult = await enforceProjectGigConsistency(guardContext);
          
          if (!guardResult.success) {
            console.error(`❌ [MIDDLEWARE] Post-creation guard failed: ${guardResult.message}`);
            
            return NextResponse.json({
              success: false,
              message: `Project created but guard failed: ${guardResult.message}`,
              details: guardResult.details
            }, { status: 500 });
          }
        }
      }

      return response;

    } catch (error: any) {
      console.error(`❌ [MIDDLEWARE] Project creation middleware error:`, error);
      
      return NextResponse.json({
        success: false,
        message: `Middleware error: ${error.message}`
      }, { status: 500 });
    }
  };
}

/**
 * Utility function to extract project creation context from request
 */
export function extractProjectCreationContext(requestData: any): Partial<ProjectCreationContext> {
  return {
    gigId: requestData.gigId,
    gigRequestId: requestData.gigRequestId,
    freelancerId: requestData.freelancerId,
    commissionerId: requestData.commissionerId,
    title: requestData.title
  };
}

/**
 * Validation function to ensure context has required fields
 */
export function validateProjectCreationContext(context: Partial<ProjectCreationContext>): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = ['freelancerId', 'commissionerId', 'title'];
  const missingFields = requiredFields.filter(field => !context[field as keyof ProjectCreationContext]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Helper function for API routes to easily add guards
 */
export async function guardedProjectCreation(
  projectCreationLogic: () => Promise<any>,
  context: ProjectCreationContext,
  options: GuardedProjectCreationOptions = {}
): Promise<NextResponse> {
  
  const result = await withProjectCreationGuard(
    async () => {
      try {
        const projectData = await projectCreationLogic();
        return {
          success: true,
          projectId: projectData.projectId || projectData.id,
          message: 'Project created successfully',
          data: projectData
        };
      } catch (error: any) {
        return {
          success: false,
          message: error.message,
          error: error.message
        };
      }
    },
    context,
    options
  );

  if (result.success) {
    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      message: result.message,
      data: result.data
    });
  } else {
    return NextResponse.json({
      success: false,
      message: result.message,
      error: result.error,
      details: result.data
    }, { status: 500 });
  }
}
