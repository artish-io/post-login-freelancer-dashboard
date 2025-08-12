import { NextRequest, NextResponse } from 'next/server';
import { readGig, updateGig } from '@/lib/gigs/hierarchical-storage';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { UnifiedTaskService } from '@/lib/services/unified-task-service';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

/**
 * TEST ENDPOINT: Direct freelancer matching for milestone invoicing tests
 * 
 * This endpoint bypasses the application requirement and directly matches
 * a freelancer to a gig for testing purposes.
 * 
 * ⚠️ WARNING: This endpoint should only be used for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gigId, freelancerId, commissionerId } = body;

    console.log('🧪 TEST: Direct freelancer matching:', { gigId, freelancerId, commissionerId });

    // Validate required fields
    if (!gigId || !freelancerId || !commissionerId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: gigId, freelancerId, commissionerId'
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

    // Verify the commissioner owns this gig
    if (gig.commissionerId !== Number(commissionerId)) {
      return NextResponse.json({
        success: false,
        error: 'Commissioner does not own this gig'
      }, { status: 403 });
    }

    // Generate unique project ID
    const projectId = Date.now() + Math.floor(Math.random() * 10000);

    // Create project using UnifiedStorageService
    const projectData = {
      projectId: projectId,
      gigId: Number(gigId),
      commissionerId: Number(commissionerId),
      freelancerId: Number(freelancerId),
      title: gig.title,
      description: gig.description,
      budget: {
        lower: gig.lowerBudget || gig.budget,
        upper: gig.upperBudget || gig.budget,
        currency: 'USD'
      },
      status: 'ongoing',
      invoicingMethod: gig.invoicingMethod || gig.executionMethod || 'completion',
      executionMethod: gig.executionMethod || 'completion',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: gig.organizationId || 1,
      typeTags: gig.tags || []
    };

    try {
      await UnifiedStorageService.saveProject(projectData);
      console.log('✅ Project created:', projectId);

      // Also update the consolidated projects.json file for test compatibility
      try {
        const projectsJsonPath = path.join(process.cwd(), 'data/projects.json');
        const projectsData = await readFile(projectsJsonPath, 'utf-8');
        const projects = JSON.parse(projectsData);

        // Add the new project to the consolidated list
        const consolidatedProject = {
          projectId: projectData.projectId,
          title: projectData.title,
          description: projectData.description,
          organizationId: projectData.organizationId,
          typeTags: projectData.typeTags,
          commissionerId: projectData.commissionerId,
          freelancerId: projectData.freelancerId,
          status: projectData.status,
          invoicingMethod: projectData.invoicingMethod,
          createdAt: projectData.createdAt,
          budget: projectData.budget
        };

        projects.push(consolidatedProject);
        await writeFile(projectsJsonPath, JSON.stringify(projects, null, 2));
        console.log('✅ Updated consolidated projects.json');
      } catch (consolidationError) {
        console.warn('Failed to update consolidated projects.json:', consolidationError);
        // Don't fail the main operation for this
      }

    } catch (projectError) {
      console.error('Failed to create project:', projectError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create project',
        details: projectError instanceof Error ? projectError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Create project tasks based on invoicing method
    const tasks = [];
    let taskCount = 3; // Default for completion invoicing

    // For milestone invoicing, create tasks based on milestones
    if (gig.invoicingMethod === 'milestone' && gig.milestones && gig.milestones.length > 0) {
      taskCount = gig.milestones.length;
      
      for (let i = 0; i < gig.milestones.length; i++) {
        const milestone = gig.milestones[i];
        const taskData = {
          title: milestone.title,
          description: milestone.description,
          dueDate: milestone.endDate,
          order: i + 1,
          milestoneId: milestone.id
        };

        try {
          const task = await UnifiedTaskService.createTask(projectId, taskData);
          if (task) {
            tasks.push(task);
            console.log(`✅ Created milestone task: ${task.title}`);
          }
        } catch (taskError) {
          console.warn(`Failed to create milestone task ${i + 1}:`, taskError);
        }
      }
    } else {
      // Create default tasks for completion invoicing
      for (let i = 1; i <= taskCount; i++) {
        const taskData = {
          title: `Task ${i}`,
          description: `Task ${i} for ${gig.title}`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
    }

    // Update gig status to unavailable
    try {
      await updateGig(Number(gigId), {
        status: 'Unavailable'
      });
      console.log('✅ Gig status updated to Unavailable');
    } catch (updateError) {
      console.warn('Failed to update gig status:', updateError);
      // Don't fail the entire operation for this
    }

    console.log('✅ TEST: Direct freelancer matching successful:', {
      projectId: projectId,
      taskCount: tasks.length,
      invoicingMethod: projectData.invoicingMethod
    });

    return NextResponse.json({
      success: true,
      message: 'Freelancer matched successfully',
      entities: {
        project: {
          projectId: projectData.projectId,
          title: projectData.title,
          status: projectData.status,
          freelancerId: projectData.freelancerId,
          commissionerId: projectData.commissionerId,
          invoicingMethod: projectData.invoicingMethod
        },
        tasks: tasks.map(task => ({
          id: task.taskId,
          title: task.title,
          status: task.status,
          projectId: task.projectId,
          milestoneId: task.milestoneId
        }))
      }
    });

  } catch (error) {
    console.error('❌ TEST: Error in direct freelancer matching:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
