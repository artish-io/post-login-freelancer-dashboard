import { NextResponse } from 'next/server';
import { UnifiedStorageService } from '@/lib/storage/unified-storage-service';
import { readGig } from '@/lib/gigs/hierarchical-storage';
import { ok, err, ErrorCodes } from '@/lib/http/envelope';

/**
 * API endpoint to back-fill existing projects with date separation fields
 * This migrates projects that don't have the new date separation structure
 */
export async function POST(req: Request) {
  try {
    console.log('🔄 Starting project date migration...');
    
    // Get all existing projects
    const allProjects = await UnifiedStorageService.listProjects();
    console.log(`📊 Found ${allProjects.length} total projects`);
    
    // Filter projects that need migration (missing new date fields)
    const projectsToMigrate = allProjects.filter(project => 
      !project.gigPostedDate || !project.projectActivatedAt || !project.originalDuration
    );
    
    console.log(`🔄 ${projectsToMigrate.length} projects need date separation migration`);
    
    if (projectsToMigrate.length === 0) {
      return NextResponse.json(ok({
        message: 'No projects need migration',
        migratedCount: 0,
        totalProjects: allProjects.length
      }));
    }
    
    const migrationResults = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const project of projectsToMigrate) {
      try {
        console.log(`🔄 Migrating project ${project.projectId}...`);
        
        // 🛡️ DURATION GUARD: Calculate date separation fields
        const projectActivatedAt = project.createdAt || new Date().toISOString();
        let gigPostedDate = projectActivatedAt; // Default fallback
        let originalDuration = {
          deliveryTimeWeeks: project.deliveryTimeWeeks || 1,
          estimatedHours: project.estimatedHours || 40,
          originalStartDate: undefined as string | undefined,
          originalEndDate: project.dueDate
        };
        
        // Try to get original gig data if gigId exists
        if (project.gigId) {
          try {
            const gigData = await readGig(project.gigId);
            if (gigData) {
              gigPostedDate = gigData.postedDate || gigPostedDate;
              originalDuration = {
                deliveryTimeWeeks: gigData.deliveryTimeWeeks || project.deliveryTimeWeeks || 1,
                estimatedHours: (gigData as any).estimatedHours || project.estimatedHours || 40,
                originalStartDate: (gigData as any).startType === 'Custom' ? (gigData as any).customStartDate : undefined,
                originalEndDate: (gigData as any).endDate || project.dueDate
              };
              console.log(`  ✅ Found gig data for project ${project.projectId}`);
            }
          } catch (gigError) {
            console.log(`  ⚠️ Could not find gig ${project.gigId} for project ${project.projectId}, using defaults`);
          }
        }
        
        // Calculate proper due date from activation if we have duration info
        let newDueDate = project.dueDate;
        if (originalDuration.deliveryTimeWeeks && originalDuration.deliveryTimeWeeks > 0) {
          const activationDate = new Date(projectActivatedAt);
          const calculatedDueDate = new Date(activationDate.getTime() + originalDuration.deliveryTimeWeeks * 7 * 24 * 60 * 60 * 1000);
          newDueDate = calculatedDueDate.toISOString().split('T')[0] + 'T04:00:00.000Z';
          console.log(`  📅 Recalculated due date from ${project.dueDate} to ${newDueDate}`);
        }
        
        // Create updated project with date separation
        const updatedProject = {
          ...project,
          dueDate: newDueDate,
          
          // 🛡️ DURATION GUARD: Add date separation fields
          gigPostedDate,
          projectActivatedAt,
          originalDuration,
          
          // Ensure legacy fields are preserved
          deliveryTimeWeeks: originalDuration.deliveryTimeWeeks,
          estimatedHours: originalDuration.estimatedHours,
          
          // Update modification timestamp
          updatedAt: new Date().toISOString()
        };
        
        // Save the updated project
        await UnifiedStorageService.writeProject(updatedProject);
        
        migrationResults.push({
          projectId: project.projectId,
          status: 'success',
          changes: {
            gigPostedDate,
            projectActivatedAt,
            originalDuration,
            dueDateChanged: newDueDate !== project.dueDate,
            oldDueDate: project.dueDate,
            newDueDate
          }
        });
        
        successCount++;
        console.log(`  ✅ Successfully migrated project ${project.projectId}`);
        
      } catch (projectError: any) {
        console.error(`  ❌ Failed to migrate project ${project.projectId}:`, projectError);
        migrationResults.push({
          projectId: project.projectId,
          status: 'error',
          error: projectError.message
        });
        errorCount++;
      }
    }
    
    console.log(`✅ Migration completed: ${successCount} successful, ${errorCount} failed`);
    
    return NextResponse.json(ok({
      message: `Migration completed: ${successCount} projects migrated successfully, ${errorCount} failed`,
      migratedCount: successCount,
      errorCount,
      totalProjects: allProjects.length,
      results: migrationResults
    }));
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, `Migration failed: ${error.message}`, 500),
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check migration status
 */
export async function GET() {
  try {
    const allProjects = await UnifiedStorageService.listProjects();
    
    const projectsWithNewFields = allProjects.filter(project => 
      project.gigPostedDate && project.projectActivatedAt && project.originalDuration
    );
    
    const projectsNeedingMigration = allProjects.filter(project => 
      !project.gigPostedDate || !project.projectActivatedAt || !project.originalDuration
    );
    
    return NextResponse.json(ok({
      totalProjects: allProjects.length,
      projectsWithNewFields: projectsWithNewFields.length,
      projectsNeedingMigration: projectsNeedingMigration.length,
      migrationNeeded: projectsNeedingMigration.length > 0,
      projectsNeedingMigrationList: projectsNeedingMigration.map(p => ({
        projectId: p.projectId,
        createdAt: p.createdAt,
        dueDate: p.dueDate,
        hasGigId: !!p.gigId
      }))
    }));
    
  } catch (error: any) {
    return NextResponse.json(
      err(ErrorCodes.INTERNAL_ERROR, `Failed to check migration status: ${error.message}`, 500),
      { status: 500 }
    );
  }
}
