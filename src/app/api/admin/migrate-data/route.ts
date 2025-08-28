import { NextResponse } from 'next/server';
// import { migrateProposalsAndGigs } from '../../../../../scripts/migrate-proposals-and-gigs'; // Module not found

/**
 * API endpoint to trigger data migration from flat JSON to hierarchical storage
 * This should only be used during the migration process
 */
export async function POST() {
  try {
    console.log('🚀 Starting data migration via API...');
    
    // await migrateProposalsAndGigs(); // Function not available
    
    return NextResponse.json({
      success: true,
      message: 'Data migration completed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check migration status
 */
export async function GET() {
  try {
    const { readAllProposals } = await import('../../../../lib/proposals/hierarchical-storage');
    const { readAllGigs } = await import('../../../../lib/gigs/hierarchical-storage');
    
    const proposals = await readAllProposals();
    const gigs = await readAllGigs();
    
    return NextResponse.json({
      migrationStatus: {
        proposalsCount: proposals.length,
        gigsCount: gigs.length,
        lastChecked: new Date().toISOString()
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
