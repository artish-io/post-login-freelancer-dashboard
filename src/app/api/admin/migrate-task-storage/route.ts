import { NextResponse } from 'next/server';
import { 
  analyzeTaskStorageInconsistencies, 
  migrateTaskStorageLocations,
  validateTaskStorageConsistency 
} from '@/lib/project-tasks/data-migration';

/**
 * Admin endpoint to analyze and fix task storage inconsistencies
 * 
 * GET: Analyze inconsistencies without making changes
 * POST: Run the migration to fix inconsistencies
 * PUT: Validate consistency after migration
 */

export async function GET() {
  try {
    console.log('🔍 Starting task storage analysis...');
    
    const analysis = await analyzeTaskStorageInconsistencies();
    
    return NextResponse.json({
      success: true,
      message: 'Task storage analysis completed',
      analysis: {
        totalTasks: analysis.totalTasks,
        inconsistencies: analysis.inconsistencies.length,
        errors: analysis.errors.length,
        details: {
          inconsistentTasks: analysis.inconsistencies,
          errors: analysis.errors
        }
      }
    });

  } catch (error) {
    console.error('❌ Error during task storage analysis:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze task storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🚀 Starting task storage migration...');
    
    const migration = await migrateTaskStorageLocations();
    
    return NextResponse.json({
      success: true,
      message: 'Task storage migration completed',
      migration: {
        totalTasks: migration.totalTasks,
        migratedTasks: migration.migratedTasks,
        errors: migration.errors.length,
        details: {
          errors: migration.errors
        }
      }
    });

  } catch (error) {
    console.error('❌ Error during task storage migration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to migrate task storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT() {
  try {
    console.log('✅ Validating task storage consistency...');
    
    const validation = await validateTaskStorageConsistency();
    
    return NextResponse.json({
      success: true,
      message: 'Task storage validation completed',
      validation: {
        isConsistent: validation.isConsistent,
        issues: validation.issues
      }
    });

  } catch (error) {
    console.error('❌ Error during task storage validation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate task storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
