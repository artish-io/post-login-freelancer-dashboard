import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';

const APPLICATIONS_DIR = path.join(process.cwd(), 'data', 'gig-applications');

// Ensure the applications directory exists
async function ensureDirectoryExists(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('Failed to create directory:', error);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gigId = params.id;
  if (!gigId) {
    return NextResponse.json({ error: 'Gig ID is required.' }, { status: 400 });
  }

  try {
    const body = await req.json();

    const application = {
      gigId,
      submittedAt: new Date().toISOString(),
      ...body,
    };

    await ensureDirectoryExists(APPLICATIONS_DIR);

    const filePath = path.join(APPLICATIONS_DIR, `${gigId}.json`);

    // Read existing applications
    let applications = [];
    try {
      const existing = await readFile(filePath, 'utf-8');
      applications = JSON.parse(existing);
    } catch {
      applications = [];
    }

    applications.push(application);

    await writeFile(filePath, JSON.stringify(applications, null, 2), 'utf-8');

    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch (error) {
    console.error('Failed to submit application:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
