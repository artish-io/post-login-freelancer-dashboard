

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const APPLICATIONS_PATH = path.join(process.cwd(), 'data/gigs/gig-applications.json');

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      gigId,
      freelancerId,
      pitch,
      sampleLinks = [],
      skills = [],
      tools = []
    } = body;

    if (!gigId || !freelancerId || !pitch || !Array.isArray(sampleLinks)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const raw = await readFile(APPLICATIONS_PATH, 'utf-8');
    const applications = JSON.parse(raw);

    const newApplication = {
      id: applications.length + 1,
      gigId,
      freelancerId,
      pitch,
      sampleLinks,
      skills,
      tools,
      submittedAt: new Date().toISOString()
    };

    applications.push(newApplication);
    await writeFile(APPLICATIONS_PATH, JSON.stringify(applications, null, 2));

    return NextResponse.json({ success: true, applicationId: newApplication.id });
  } catch (error) {
    console.error('Failed to submit application:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}