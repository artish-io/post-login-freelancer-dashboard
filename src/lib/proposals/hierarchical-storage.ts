import { promises as fs } from 'fs';
import path from 'path';
import { customAlphabet } from 'nanoid';

// Simple ID generation for proposals
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

/**
 * Generate a simple proposal ID in format: PROP-XXXXXXXX
 * Example: PROP-A1B2C3D4
 */
export function generateProposalId(): string {
  return `PROP-${nanoid()}`;
}

/**
 * Generate a unique proposal ID that doesn't conflict with existing ones
 */
export async function generateUniqueProposalId(): Promise<string> {
  const existingIds = new Set<string>();

  try {
    // Get all existing proposal IDs from the index
    const indexPath = getProposalMetadataPath();

    if (await fs.access(indexPath).then(() => true).catch(() => false)) {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);

      for (const proposalId of Object.keys(index)) {
        existingIds.add(proposalId);
      }
    }
  } catch (error) {
    // If we can't read existing IDs, just generate a new one
    console.warn('Could not read existing proposal IDs:', error);
  }

  // Generate IDs until we find a unique one (very unlikely to need more than 1 attempt)
  let id: string;
  let attempts = 0;
  do {
    id = generateProposalId();
    attempts++;
  } while (existingIds.has(id) && attempts < 10);

  return id;
}

export interface Proposal {
  id: string;
  title: string;
  summary: string;
  logoUrl?: string;
  typeTags: string[];
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    amount: number;
  }>;
  paymentCycle?: string;
  rate?: number;
  projectId: string;
  totalBid: number;
  customStartDate?: string | null;
  endDate: string;
  maxHours?: number | string;
  depositRate?: string;
  expectedDurationDays?: number;
  executionMethod?: 'completion' | 'milestone';
  startType?: 'Immediately' | 'Custom';
  contact?: any;
  upfrontAmount?: number;
  milestoneTotal?: number;
  isAmountValid?: boolean;
  upfrontValue?: number;
  upfrontPercentage?: number;
  amountPerMilestone?: number;
  proposalTitle?: string;
  description?: string;
  budget?: number;
  commissionerId?: number;
  createdAt: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  hiddenFor: number[];
  sentAt?: string;
}

/**
 * Get the hierarchical path for a proposal based on its creation date
 */
function getProposalPath(proposalId: string, createdAt: string): string {
  const date = new Date(createdAt);
  const year = date.getFullYear();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate().toString().padStart(2, '0');
  
  return path.join(
    process.cwd(),
    'data',
    'proposals',
    year.toString(),
    month,
    day,
    proposalId,
    'proposal.json'
  );
}

/**
 * Get the metadata index path for proposals
 */
function getProposalMetadataPath(): string {
  return path.join(process.cwd(), 'data', 'proposals', 'proposals-index.json');
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Save a proposal to hierarchical storage
 */
export async function saveProposal(proposal: Proposal): Promise<void> {
  const proposalPath = getProposalPath(proposal.id, proposal.createdAt);
  const proposalDir = path.dirname(proposalPath);
  
  // Ensure directory exists
  await ensureDirectoryExists(proposalDir);
  
  // Save the proposal
  await fs.writeFile(proposalPath, JSON.stringify(proposal, null, 2));
  
  // Update metadata index
  await updateProposalIndex(proposal.id, proposal.createdAt);
}

/**
 * Read a proposal from hierarchical storage
 */
export async function readProposal(proposalId: string): Promise<Proposal | null> {
  try {
    // First, get the creation date from the index
    const indexPath = getProposalMetadataPath();
    
    if (!await fs.access(indexPath).then(() => true).catch(() => false)) {
      return null;
    }
    
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    const createdAt = index[proposalId];
    if (!createdAt) {
      return null;
    }
    
    // Read the proposal file
    const proposalPath = getProposalPath(proposalId, createdAt);
    const proposalData = await fs.readFile(proposalPath, 'utf-8');
    return JSON.parse(proposalData);
  } catch (error) {
    console.error(`Error reading proposal ${proposalId}:`, error);
    return null;
  }
}

/**
 * Update the proposal metadata index
 */
async function updateProposalIndex(proposalId: string, createdAt: string): Promise<void> {
  const indexPath = getProposalMetadataPath();
  const indexDir = path.dirname(indexPath);
  
  await ensureDirectoryExists(indexDir);
  
  let index: Record<string, string> = {};
  
  try {
    if (await fs.access(indexPath).then(() => true).catch(() => false)) {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexData);
    }
  } catch (error) {
    // Index doesn't exist or is corrupted, start fresh
    index = {};
  }
  
  index[proposalId] = createdAt;
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Read all proposals from hierarchical storage
 */
export async function readAllProposals(): Promise<Proposal[]> {
  const proposals: Proposal[] = [];

  try {
    // Read the proposals index to get all proposal locations
    const indexPath = getProposalMetadataPath();

    if (!await fs.access(indexPath).then(() => true).catch(() => false)) {
      return [];
    }

    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);

    // Read each proposal
    for (const [proposalId, createdAt] of Object.entries(index)) {
      const proposal = await readProposal(proposalId);

      if (proposal) {
        proposals.push(proposal);
      }
    }

    // Sort proposals by creation date (newest first)
    return proposals.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error reading all proposals:', error);
    return [];
  }
}

/**
 * Update a proposal in hierarchical storage
 */
export async function updateProposal(proposalId: string, updates: Partial<Proposal>): Promise<void> {
  const existingProposal = await readProposal(proposalId);

  if (!existingProposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  const updatedProposal = { ...existingProposal, ...updates };
  await saveProposal(updatedProposal);
}

/**
 * Delete a proposal from hierarchical storage
 */
export async function deleteProposal(proposalId: string): Promise<void> {
  try {
    // Get the creation date from the index
    const indexPath = getProposalMetadataPath();

    if (!await fs.access(indexPath).then(() => true).catch(() => false)) {
      return;
    }

    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);

    const createdAt = index[proposalId];
    if (!createdAt) {
      return;
    }

    // Delete the proposal file
    const proposalPath = getProposalPath(proposalId, createdAt);
    await fs.unlink(proposalPath);

    // Remove from index
    delete index[proposalId];
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    // Try to clean up empty directories
    const proposalDir = path.dirname(proposalPath);
    try {
      await fs.rmdir(proposalDir);
    } catch {
      // Directory not empty, ignore
    }
  } catch (error) {
    console.error(`Error deleting proposal ${proposalId}:`, error);
  }
}

/**
 * Get proposals by commissioner ID
 */
export async function getProposalsByCommissioner(commissionerId: number): Promise<Proposal[]> {
  const allProposals = await readAllProposals();
  return allProposals.filter(proposal => proposal.commissionerId === commissionerId);
}

/**
 * Get proposals by status
 */
export async function getProposalsByStatus(status: Proposal['status']): Promise<Proposal[]> {
  const allProposals = await readAllProposals();
  return allProposals.filter(proposal => proposal.status === status);
}

/**
 * Convert legacy proposals array to hierarchical storage
 * This function is used for migration from the old flat JSON structure
 */
export async function migrateLegacyProposals(legacyProposals: Proposal[]): Promise<void> {
  console.log(`Migrating ${legacyProposals.length} proposals to hierarchical storage...`);

  for (const proposal of legacyProposals) {
    try {
      await saveProposal(proposal);
      console.log(`Migrated proposal ${proposal.id}`);
    } catch (error) {
      console.error(`Failed to migrate proposal ${proposal.id}:`, error);
    }
  }

  console.log('Proposal migration completed');
}
