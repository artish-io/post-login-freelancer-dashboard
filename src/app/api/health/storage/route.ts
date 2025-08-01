import { NextResponse } from 'next/server';
import { quickHealthCheck } from '../../../../lib/startup-checks';
import { validateHierarchicalStorage } from '../../../../lib/storage-migration-guard';

/**
 * Storage Health Check API
 * 
 * This endpoint provides real-time information about the storage structure
 * health and can help diagnose issues before they cause application failures.
 */
export async function GET() {
  try {
    const healthCheck = await quickHealthCheck();
    const validation = await validateHierarchicalStorage();
    
    const response = {
      timestamp: new Date().toISOString(),
      healthy: healthCheck.healthy,
      storage: {
        hierarchical: {
          valid: validation.isValid,
          issues: validation.issues,
          recommendations: validation.recommendations
        }
      },
      summary: healthCheck.healthy 
        ? 'Storage structure is healthy' 
        : `${healthCheck.issues.length} issue(s) detected`
    };
    
    const status = healthCheck.healthy ? 200 : 500;
    
    return NextResponse.json(response, { status });
    
  } catch (error) {
    console.error('Storage health check failed:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      healthy: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
