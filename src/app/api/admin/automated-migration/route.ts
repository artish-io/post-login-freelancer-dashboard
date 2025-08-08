import { NextResponse } from 'next/server';
import { runComprehensiveValidation } from '@/lib/data-validation/validation-service';
import { runAutomatedMigration } from '@/lib/data-migration/automated-migration-service';

/**
 * Automated Migration API Endpoint
 * 
 * GET: Preview what would be fixed by automated migration
 * POST: Run automated migration to fix validation issues
 * PUT: Run migration with specific filters and options
 */

export async function GET() {
  try {
    console.log('🔍 Running validation to preview automated migration...');
    
    const validationReport = await runComprehensiveValidation();
    
    // Run dry run to see what would be fixed
    const dryRunResult = await runAutomatedMigration(validationReport.issues, {
      dryRun: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Migration preview completed',
      validation: {
        totalIssues: validationReport.totalIssues,
        criticalIssues: validationReport.criticalIssues,
        highIssues: validationReport.highIssues
      },
      preview: {
        totalIssues: dryRunResult.totalIssues,
        fixableIssues: dryRunResult.results.filter(r => r.action !== 'manual_review_required').length,
        manualReviewRequired: dryRunResult.results.filter(r => r.action === 'manual_review_required').length,
        summary: dryRunResult.summary,
        actions: dryRunResult.results.map(r => ({
          issueId: r.issueId,
          action: r.action,
          wouldFix: r.details.wouldFix || r.action
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error during migration preview:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to preview automated migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { 
      dryRun = false,
      categories = [],
      maxFixes = 50,
      confirmCritical = false
    } = await request.json();

    console.log(`🔧 Running automated migration (dryRun: ${dryRun})...`);
    
    // Get current validation issues
    const validationReport = await runComprehensiveValidation();
    
    // Safety check for critical issues
    if (!confirmCritical && validationReport.criticalIssues > 0 && !dryRun) {
      return NextResponse.json({
        success: false,
        error: 'Critical issues detected',
        message: 'Set confirmCritical=true to proceed with fixing critical issues',
        criticalIssues: validationReport.criticalIssues,
        criticalIssuesList: validationReport.issues
          .filter(i => i.severity === 'critical')
          .map(i => ({ entityType: i.entityType, entityId: i.entityId, issue: i.issue }))
      }, { status: 400 });
    }
    
    // Run migration
    const migrationResult = await runAutomatedMigration(validationReport.issues, {
      dryRun,
      categories,
      maxFixes
    });
    
    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run migration completed' : 'Automated migration completed',
      options: { dryRun, categories, maxFixes, confirmCritical },
      migration: migrationResult,
      recommendations: generateMigrationRecommendations(migrationResult)
    });

  } catch (error) {
    console.error('❌ Error during automated migration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run automated migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { 
      issueIds = [],
      dryRun = false,
      batchOperations = true
    } = await request.json();

    if (issueIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No issue IDs provided'
      }, { status: 400 });
    }

    console.log(`🎯 Running targeted migration for ${issueIds.length} specific issues...`);
    
    // Get current validation issues
    const validationReport = await runComprehensiveValidation();
    
    // Filter to only the specified issues
    const targetIssues = validationReport.issues.filter(issue => {
      const issueId = `${issue.entityType}-${issue.entityId}`;
      return issueIds.includes(issueId);
    });

    if (targetIssues.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No matching issues found for provided IDs',
        providedIds: issueIds
      }, { status: 404 });
    }
    
    // Run migration on targeted issues
    const migrationResult = await runAutomatedMigration(targetIssues, {
      dryRun,
      maxFixes: targetIssues.length
    });
    
    return NextResponse.json({
      success: true,
      message: `Targeted migration completed for ${targetIssues.length} issues`,
      options: { issueIds, dryRun, batchOperations },
      migration: migrationResult,
      recommendations: generateMigrationRecommendations(migrationResult)
    });

  } catch (error) {
    console.error('❌ Error during targeted migration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run targeted migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate recommendations based on migration results
 */
function generateMigrationRecommendations(migrationResult: any): string[] {
  const recommendations: string[] = [];
  
  if (migrationResult.fixedIssues > 0) {
    recommendations.push(`✅ Successfully fixed ${migrationResult.fixedIssues} issues automatically`);
  }
  
  if (migrationResult.failedIssues > 0) {
    recommendations.push(`⚠️ ${migrationResult.failedIssues} issues could not be fixed automatically`);
  }
  
  const manualReviewCount = migrationResult.results.filter((r: any) => 
    r.action === 'manual_review_required' || r.action === 'manual_decision_required'
  ).length;
  
  if (manualReviewCount > 0) {
    recommendations.push(`👥 ${manualReviewCount} issues require manual review`);
  }
  
  const storageIssues = migrationResult.summary.storageInconsistencies;
  if (storageIssues > 0) {
    recommendations.push(`🗄️ Run task storage migration to fix ${storageIssues} storage issues`);
  }
  
  if (migrationResult.fixedIssues === migrationResult.totalIssues) {
    recommendations.push('🎉 All issues were fixed automatically!');
  } else if (migrationResult.fixedIssues > 0) {
    recommendations.push('🔄 Run validation again to check for remaining issues');
  }
  
  // Add specific recommendations based on failed fixes
  const failedResults = migrationResult.results.filter((r: any) => !r.success);
  const orphanedTasks = failedResults.filter((r: any) => 
    r.details?.issue?.includes?.('orphaned') || r.error?.includes?.('orphaned')
  );
  
  if (orphanedTasks.length > 0) {
    recommendations.push(`🔗 Review ${orphanedTasks.length} orphaned tasks - decide to delete or reassign`);
  }
  
  const invoiceIssues = failedResults.filter((r: any) => 
    r.issueId?.includes('invoice')
  );
  
  if (invoiceIssues.length > 0) {
    recommendations.push(`💰 Review ${invoiceIssues.length} invoice issues manually for data integrity`);
  }
  
  return recommendations;
}
