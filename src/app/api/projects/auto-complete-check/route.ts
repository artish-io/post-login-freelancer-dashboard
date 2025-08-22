import { NextResponse } from 'next/server';
import { 
  checkProjectCompletionEligibility,
  checkAndAutoCompleteProject,
  batchAutoCompleteProjects 
} from '@/lib/project-completion/auto-completion-service';

/**
 * Project Auto-Completion Check API
 * 
 * GET: Check if a project is eligible for auto-completion
 * POST: Trigger auto-completion for a project
 * PUT: Batch auto-completion for multiple projects
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (typeof projectId !== 'string' || projectId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Invalid projectId parameter'
      }, { status: 400 });
    }

    console.log(`🔍 Checking completion eligibility for project ${projectId}...`);

    const eligibilityCheck = await checkProjectCompletionEligibility(projectId);

    return NextResponse.json({
      success: true,
      projectId: projectId,
      eligibility: eligibilityCheck,
      message: eligibilityCheck.shouldComplete 
        ? 'Project is eligible for auto-completion'
        : `Project not eligible: ${eligibilityCheck.reason}`
    });

  } catch (error) {
    console.error('❌ Error checking project completion eligibility:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check project completion eligibility',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    if (typeof projectId !== 'string' || projectId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Invalid projectId in request body'
      }, { status: 400 });
    }

    console.log(`🚀 Triggering auto-completion for project ${projectId}...`);

    const completionResult = await checkAndAutoCompleteProject(projectId);
    
    return NextResponse.json({
      success: true,
      completion: completionResult,
      message: completionResult.statusChanged 
        ? `Project ${projectId} auto-completed successfully`
        : `Project ${projectId} not completed: ${completionResult.message}`
    });

  } catch (error) {
    console.error('❌ Error triggering project auto-completion:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger project auto-completion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { projectIds } = await request.json();

    if (!projectIds || !Array.isArray(projectIds)) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid projectIds array in request body'
      }, { status: 400 });
    }

    console.log(`🚀 Triggering batch auto-completion for ${projectIds.length} projects...`);
    
    const completionResults = await batchAutoCompleteProjects(projectIds.map(Number));
    
    const completedCount = completionResults.filter(r => r.statusChanged).length;
    const errorCount = completionResults.filter(r => r.message.includes('Error')).length;
    
    return NextResponse.json({
      success: true,
      batch: {
        totalProjects: projectIds.length,
        completedProjects: completedCount,
        errorCount: errorCount,
        results: completionResults
      },
      message: `Batch completion: ${completedCount} projects completed, ${errorCount} errors`
    });

  } catch (error) {
    console.error('❌ Error in batch project auto-completion:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to execute batch project auto-completion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
