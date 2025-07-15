

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const APPLICATIONS_PATH = path.join(process.cwd(), 'data/gigs/gig-applications.json');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gigId = searchParams.get('gigId');
    const freelancerId = searchParams.get('freelancerId');

    const raw = await readFile(APPLICATIONS_PATH, 'utf-8');
    const applications = JSON.parse(raw);

    let filteredApplications = applications;

    if (gigId) {
      filteredApplications = filteredApplications.filter((app: any) =>
        app.gigId === parseInt(gigId)
      );
    }

    if (freelancerId) {
      filteredApplications = filteredApplications.filter((app: any) =>
        app.freelancerId === parseInt(freelancerId)
      );
    }

    return NextResponse.json({ applications: filteredApplications });
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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