import { NextRequest, NextResponse } from 'next/server';
import { readGig } from '@/lib/gigs/hierarchical-storage';
import { readFile } from 'fs/promises';
import path from 'path';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { UnifiedTaskService } from '@/lib/services/unified-task-service';
import { updateGigInIndex } from '@/lib/storage/gigs-index';

const APPLICATIONS_PATH = path.join(process.cwd(), 'data/gigs/gig-applications.json');

/**
 * TEST ENDPOINT: Match freelancer to gig (bypasses authentication for testing)
 * This endpoint is identical to /api/gigs/match-freelancer but without authentication
 * 
 * ⚠️ WARNING: This endpoint should only be used for testing and should be removed in production
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, gigId, freelancerId } = body;

    console.log('🧪 TEST: Matching freelancer to gig:', { applicationId, gigId, freelancerId });

    // Validate required fields
    if (!applicationId || !gigId || !freelancerId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: applicationId, gigId, freelancerId'
      }, { status: 400 });
    }

    // Read the gig
    const gig = await readGig(Number(gigId));
    if (!gig) {
      return NextResponse.json({
        success: false,
        error: 'Gig not found'
      }, { status: 404 });
    }

    // Check if gig is available
    if (gig.status !== 'Available') {
      return NextResponse.json({
        success: false,
        error: 'Gig is not available for matching'
      }, { status: 400 });
    }

    // Read the application
    const applicationsData = await readFile(APPLICATIONS_PATH, 'utf-8');
    const applications = JSON.parse(applicationsData);
    const application = applications.find((app: any) => app.id === Number(applicationId));

    if (!application) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 });
    }

    // Verify application belongs to the freelancer and gig
    if (application.freelancerId !== Number(freelancerId) || application.gigId !== Number(gigId)) {
      return NextResponse.json({
        success: false,
        error: 'Application does not match freelancer or gig'
      }, { status: 400 });
    }

    // Generate unique project ID
    const projectId = Date.now() + Math.floor(Math.random() * 10000);

    // Create project using UnifiedStorageService
    const projectData = {
      projectId: projectId,
      gigId: Number(gigId),
      commissionerId: gig.commissionerId,
      freelancerId: Number(freelancerId),
      title: gig.title,
      description: gig.description,
      budget: {
        lower: gig.lowerBudget || gig.budget,
        upper: gig.upperBudget || gig.budget
      },
      status: 'ongoing',
      invoicingMethod: gig.executionMethod || 'completion',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await UnifiedStorageService.saveProject(projectData);
    } catch (projectError) {
      console.error('Failed to create project:', projectError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create project',
        details: projectError instanceof Error ? projectError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Create project tasks (default 3 tasks for completion invoicing)
    const taskCount = 3;
    const tasks = [];

    for (let i = 1; i <= taskCount; i++) {
      const taskData = {
        title: `Task ${i}`,
        description: `Task ${i} for ${gig.title}`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        order: i
      };

      try {
        const task = await UnifiedTaskService.createTask(projectId, taskData);
        if (task) {
          tasks.push(task);
        }
      } catch (taskError) {
        console.warn(`Failed to create task ${i}:`, taskError);
      }
    }

    // Update gig status to unavailable
    try {
      await updateGigInIndex(Number(gigId), {
        status: 'Unavailable',
        matchedFreelancerId: Number(freelancerId),
        matchedAt: new Date().toISOString()
      });
    } catch (updateError) {
      console.warn('Failed to update gig status:', updateError);
      // Don't fail the entire operation for this
    }

    console.log('✅ TEST: Freelancer matching successful:', {
      projectId: projectId,
      taskCount: tasks.length
    });

    return NextResponse.json({
      success: true,
      message: 'Freelancer matched successfully',
      entities: {
        project: projectData,
        tasks: tasks,
        application: application
      }
    });

  } catch (error) {
    console.error('❌ TEST: Error in freelancer matching:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
