import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCustomProjectId } from '@/lib/project-id-utils';

const CACHE_PATH = path.join(process.cwd(), 'data', 'proposals', 'proposal-preview-cache.json');
const PROPOSALS_PATH = path.join(process.cwd(), 'data', 'proposals', 'proposals.json');
const PROJECTS_PATH = path.join(process.cwd(), 'data', 'projects.json');

type Milestone = {
  title: string;
  amount?: number;
};

type DraftUpdate = {
  projectId?: string;
  maxHours?: number;
  paymentCycle?: string;
  depositRate?: string;
  totalBid?: number;
  milestones?: Milestone[];
  milestoneTotal?: number;
  upfrontValue?: number;
  [key: string]: any;
};

// GET
export async function GET() {
  try {
    const raw = await readFile(CACHE_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}

// POST
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body: DraftUpdate = await req.json();

    if (!session?.user?.name) {
      return NextResponse.json({ error: 'User session missing name' }, { status: 401 });
    }

    // Load existing preview cache
    let existing = {};
    try {
      const raw = await readFile(CACHE_PATH, 'utf-8');
      existing = JSON.parse(raw);
    } catch {}

    // Merge updates
    let updatedDraft: DraftUpdate = {
      ...existing,
      ...body,
      maxHours:
        typeof body.maxHours === 'number'
          ? body.maxHours
          : typeof body.maxHours === 'string'
          ? Number(body.maxHours) || 0
          : (existing as any).maxHours ?? 0,
    };

    // Generate projectId if not already set
    if (!updatedDraft.projectId) {
      const uniqueId = await generateUniqueProjectId(session.user.name);
      updatedDraft.projectId = uniqueId;
    }

    // Only for Fixed Amount logic
    if (
      updatedDraft.paymentCycle === 'Fixed Amount' &&
      Array.isArray(updatedDraft.milestones) &&
      typeof updatedDraft.depositRate === 'string' &&
      typeof updatedDraft.totalBid === 'number'
    ) {
      const depositPercent = Number(updatedDraft.depositRate) || 0;
      const milestoneSum = updatedDraft.milestones.reduce(
        (acc, m) => acc + (Number(m.amount) || 0),
        0
      );

      updatedDraft.milestoneTotal = milestoneSum;
      updatedDraft.upfrontValue = Math.round((updatedDraft.totalBid * depositPercent) / 100);
    }

    console.log('💾 Saving draft:', updatedDraft);
    await writeFile(CACHE_PATH, JSON.stringify(updatedDraft, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to save draft:', err);
    return NextResponse.json({ error: 'Failed to save proposal draft' }, { status: 500 });
  }
}

// DELETE
export async function DELETE() {
  try {
    await unlink(CACHE_PATH);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'No draft to delete' }, { status: 404 });
  }
}

// Helper
async function generateUniqueProjectId(userName: string): Promise<string> {
  const existingIds = new Set<string>();

  try {
    const projectsRaw = await readFile(PROJECTS_PATH, 'utf-8');
    const proposalsRaw = await readFile(PROPOSALS_PATH, 'utf-8');

    JSON.parse(projectsRaw).forEach((p: any) => existingIds.add(p.projectId));
    JSON.parse(proposalsRaw).forEach((p: any) => existingIds.add(p.projectId));
  } catch (err) {
    console.warn('⚠️ Could not fully load existing IDs:', err);
  }

  let id;
  let attempts = 0;
  do {
    id = generateCustomProjectId(userName);
    attempts++;
  } while (existingIds.has(id) && attempts < 10);

  return id;
}