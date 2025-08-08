import { NextResponse } from 'next/server';
import { runComprehensiveValidation } from '@/lib/data-validation/validation-service';

/**
 * Data Validation API Endpoint
 * 
 * GET: Run comprehensive data validation and return report
 * POST: Run validation with specific filters or options
 */

export async function GET() {
  try {
    console.log('🔍 Starting comprehensive data validation via API...');
    
    const validationReport = await runComprehensiveValidation();
    
    return NextResponse.json({
      success: true,
      message: 'Data validation completed',
      report: validationReport,
      recommendations: generateRecommendations(validationReport)
    });

  } catch (error) {
    console.error('❌ Error during data validation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run data validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { 
      categories = [],
      severities = [],
      entityTypes = [],
      includeDetails = true 
    } = await request.json();

    console.log('🔍 Starting filtered data validation via API...');
    
    const fullReport = await runComprehensiveValidation();
    
    // Filter issues based on request parameters
    let filteredIssues = fullReport.issues;
    
    if (categories.length > 0) {
      filteredIssues = filteredIssues.filter(issue => 
        categories.includes(issue.category)
      );
    }
    
    if (severities.length > 0) {
      filteredIssues = filteredIssues.filter(issue => 
        severities.includes(issue.severity)
      );
    }
    
    if (entityTypes.length > 0) {
      filteredIssues = filteredIssues.filter(issue => 
        entityTypes.includes(issue.entityType)
      );
    }

    // Remove details if not requested
    if (!includeDetails) {
      filteredIssues = filteredIssues.map(issue => ({
        ...issue,
        details: undefined
      }));
    }

    const filteredReport = {
      ...fullReport,
      issues: filteredIssues,
      totalIssues: filteredIssues.length,
      criticalIssues: filteredIssues.filter(i => i.severity === 'critical').length,
      highIssues: filteredIssues.filter(i => i.severity === 'high').length,
      mediumIssues: filteredIssues.filter(i => i.severity === 'medium').length,
      lowIssues: filteredIssues.filter(i => i.severity === 'low').length
    };
    
    return NextResponse.json({
      success: true,
      message: 'Filtered data validation completed',
      filters: { categories, severities, entityTypes, includeDetails },
      report: filteredReport,
      recommendations: generateRecommendations(filteredReport)
    });

  } catch (error) {
    console.error('❌ Error during filtered data validation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run filtered data validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate recommendations based on validation report
 */
function generateRecommendations(report: any): string[] {
  const recommendations: string[] = [];
  
  if (report.criticalIssues > 0) {
    recommendations.push(`🚨 URGENT: Fix ${report.criticalIssues} critical issues immediately`);
  }
  
  if (report.highIssues > 0) {
    recommendations.push(`⚠️ HIGH PRIORITY: Address ${report.highIssues} high-severity issues`);
  }
  
  // Check for specific issue patterns
  const storageIssues = report.issues.filter((i: any) => i.category === 'storage_consistency');
  if (storageIssues.length > 0) {
    recommendations.push(`🗄️ Run task storage migration to fix ${storageIssues.length} storage inconsistencies`);
  }
  
  const orphanedTasks = report.issues.filter((i: any) => 
    i.category === 'data_integrity' && i.issue.includes('orphaned')
  );
  if (orphanedTasks.length > 0) {
    recommendations.push(`🔗 Clean up ${orphanedTasks.length} orphaned tasks`);
  }
  
  const missingFields = report.issues.filter((i: any) => 
    i.issue.toLowerCase().includes('missing')
  );
  if (missingFields.length > 0) {
    recommendations.push(`📝 Complete missing data fields for ${missingFields.length} entities`);
  }
  
  const invoiceIssues = report.issues.filter((i: any) => i.category === 'invoice');
  if (invoiceIssues.length > 0) {
    recommendations.push(`💰 Review and fix ${invoiceIssues.length} invoice-related issues`);
  }
  
  if (report.totalIssues === 0) {
    recommendations.push('✅ All data validation checks passed - system is healthy!');
  } else if (report.criticalIssues === 0 && report.highIssues === 0) {
    recommendations.push('✅ No critical issues found - system is stable with minor improvements needed');
  }
  
  // Add general recommendations
  if (report.totalIssues > 0) {
    recommendations.push('📊 Consider setting up automated validation checks');
    recommendations.push('🔄 Run validation regularly to catch issues early');
    recommendations.push('📋 Use the migration tools to fix storage inconsistencies');
  }
  
  return recommendations;
}
