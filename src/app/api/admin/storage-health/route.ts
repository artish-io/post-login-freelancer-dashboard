import { NextResponse } from 'next/server';
import { 
  getLegacyAccessLog, 
  getLegacyAccessStats, 
  validateStorageUsage,
  clearLegacyAccessLog 
} from '@/lib/storage/legacy-prevention';

/**
 * Admin endpoint for monitoring storage health and legacy usage
 * 
 * GET: Get storage health report
 * POST: Clear legacy access log
 * PUT: Run storage validation
 */

export async function GET() {
  try {
    const [stats, validation] = await Promise.all([
      getLegacyAccessStats(),
      validateStorageUsage()
    ]);
    
    const recentLog = getLegacyAccessLog().slice(-10); // Last 10 entries
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      validation,
      recentAccesses: recentLog,
      healthScore: calculateHealthScore(stats, validation)
    });
    
  } catch (error) {
    console.error('Error getting storage health:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get storage health',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    clearLegacyAccessLog();
    
    return NextResponse.json({
      success: true,
      message: 'Legacy access log cleared',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error clearing legacy access log:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear legacy access log',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const validation = await validateStorageUsage();
    
    return NextResponse.json({
      success: true,
      message: 'Storage validation completed',
      timestamp: new Date().toISOString(),
      validation,
      isHealthy: validation.isValid
    });
    
  } catch (error) {
    console.error('Error validating storage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Calculate overall storage health score (0-100)
 */
function calculateHealthScore(stats: any, validation: any): number {
  let score = 100;
  
  // Deduct points for legacy accesses
  if (stats.totalAccesses > 0) {
    score -= Math.min(50, stats.totalAccesses * 5); // Max 50 point deduction
  }
  
  // Deduct points for recent accesses (more severe)
  if (stats.recentAccesses > 0) {
    score -= Math.min(30, stats.recentAccesses * 10); // Max 30 point deduction
  }
  
  // Deduct points for validation issues
  if (validation.issues.length > 0) {
    score -= Math.min(20, validation.issues.length * 5); // Max 20 point deduction
  }
  
  return Math.max(0, score);
}
