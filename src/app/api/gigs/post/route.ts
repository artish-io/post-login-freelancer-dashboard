import { NextResponse } from 'next/server';
import { ensureDir, writeJsonAtomic } from '../../../../lib/fs-json';
import { format } from 'date-fns';
import { loadGigsIndex, saveGigsIndex, findRecentDuplicate, updateGigInIndex } from '../../../../lib/storage/gigs-index';
import { getNextId } from '../../../../lib/ids';
import { validateGigInput, type GigInput } from '../../../../lib/validate/gigs';

// Response types
type ApiError = {
  success: false;
  code: 'INVALID_INPUT' | 'STORAGE_IO_ERROR';
  message: string;
  details?: unknown;
};

type ApiSuccess = {
  success: true;
  gigId: number;
  message: string;
};

/**
 * Create a gig object from validated input
 */
function createGigFromInput(gigId: number, input: GigInput, createdAt: string): GigObject {
  return {
    id: gigId,
    title: input.title,
    organizationId: input.organizationData?.id || 0, // Will be handled separately
    commissionerId: input.commissionerId,
    category: input.category || 'general',
    subcategory: input.subcategory || '',
    tags: input.skills || input.tags || [],
    hourlyRateMin: Math.round((input.lowerBudget || input.budget) / (input.estimatedHours || 40)),
    hourlyRateMax: Math.round((input.upperBudget || input.budget) / (input.estimatedHours || 40)),
    description: input.description || '',
    deliveryTimeWeeks: input.deliveryTimeWeeks || 4,
    estimatedHours: input.estimatedHours || 40,
    status: 'Available' as const,
    toolsRequired: input.tools || [],
    executionMethod: input.executionMethod,
    invoicingMethod: input.invoicingMethod || input.executionMethod, // Use invoicingMethod if provided, fallback to executionMethod
    milestones: input.milestones,
    startType: input.startType,
    customStartDate: input.customStartDate,
    endDate: input.endDate,
    lowerBudget: input.lowerBudget || input.budget,
    upperBudget: input.upperBudget || input.budget,
    postedDate: createdAt.split('T')[0],
    notes: `Budget: $${input.budget.toLocaleString()}`,
    isPublic: input.isPublic !== false,
    isTargetedRequest: input.isTargetedRequest || false,
    targetFreelancerId: input.targetFreelancerId || null
  };
}

interface GigObject {
  id: number;
  title: string;
  organizationId: number;
  commissionerId: number;
  category: string;
  subcategory: string;
  tags: string[];
  hourlyRateMin: number;
  hourlyRateMax: number;
  description: string;
  deliveryTimeWeeks: number;
  estimatedHours: number;
  status: 'Available' | 'Unavailable' | 'Closed';
  toolsRequired: string[];
  executionMethod: 'completion' | 'milestone';
  invoicingMethod: 'completion' | 'milestone';
  milestones?: Array<{
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
  }>;
  startType?: 'Immediately' | 'Custom';
  customStartDate?: string;
  endDate?: string;
  lowerBudget: number;
  upperBudget: number;
  postedDate: string;
  notes: string;
  isPublic: boolean;
  isTargetedRequest: boolean;
  targetFreelancerId?: number | null;
}

export async function POST(req: Request): Promise<NextResponse<ApiSuccess | ApiError>> {
  try {
    // Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const validation = validateGigInput(body);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        code: 'INVALID_INPUT',
        message: validation.error!
      }, { status: 400 });
    }

    const gigData = validation.gigData!;
    const createdAt = gigData.createdAt ?? new Date().toISOString();

    // Generate hierarchical path components
    const createdDate = new Date(createdAt);
    const year = format(createdDate, 'yyyy');
    const month = format(createdDate, 'MM');
    const day = format(createdDate, 'dd');

    // Load index and check for recent duplicates (idempotency)
    const index = await loadGigsIndex();
    const duplicateId = findRecentDuplicate(
      gigData.commissionerId,
      gigData.title,
      createdAt,
      index,
      60 // 60 second window
    );

    if (duplicateId) {
      return NextResponse.json({
        success: true,
        gigId: duplicateId,
        message: 'Gig created successfully'
      });
    }

    // Generate new gig ID
    const gigId = await getNextId('gig');

    // Create hierarchical directory structure
    const hierarchicalPath = `${year}/${month}/${day}/${gigId}`;
    const gigDir = `data/gigs/${hierarchicalPath}`;
    await ensureDir(gigDir);

    // Create gig object
    const gig = createGigFromInput(gigId, gigData, createdAt);

    // Write gig to hierarchical storage
    await writeJsonAtomic(`${gigDir}/gig.json`, gig);

    // Update gigs index
    await updateGigInIndex(
      gigId,
      gig.title,
      gig.commissionerId,
      createdAt,
      hierarchicalPath
    );

    return NextResponse.json({
      success: true,
      gigId,
      message: 'Gig created successfully'
    });

  } catch (err: any) {
    console.error('Error creating gig:', err);
    return NextResponse.json({
      success: false,
      code: 'STORAGE_IO_ERROR',
      message: err?.message ?? 'Unknown error occurred while creating gig'
    }, { status: 500 });
  }
}
