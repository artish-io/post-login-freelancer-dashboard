import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const workSamplesPath = path.join(process.cwd(), 'data', 'profiles', 'work-samples.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, coverImage, link, skills, tools, year } = body;

    // Validate required fields
    if (!userId || !title || !coverImage || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Read existing work samples
    let workSamples = [];
    try {
      const data = fs.readFileSync(workSamplesPath, 'utf-8');
      workSamples = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, start with empty array
      workSamples = [];
    }

    // Generate unique ID
    const timestamp = Date.now();
    const newId = `ws-${userId}-${timestamp}`;

    // Create new work sample
    const newWorkSample = {
      id: newId,
      userId: parseInt(userId),
      title,
      image: coverImage,
      skill: skills[0] || '', // Take first skill for compatibility
      tool: tools[0] || '', // Take first tool for compatibility
      year: parseInt(year),
      url: link || ''
    };

    // Add to array
    workSamples.push(newWorkSample);

    // Write back to file
    fs.writeFileSync(workSamplesPath, JSON.stringify(workSamples, null, 2));

    return NextResponse.json({ 
      success: true, 
      workSample: newWorkSample 
    });

  } catch (error) {
    console.error('Error adding work sample:', error);
    return NextResponse.json(
      { error: 'Failed to add work sample' },
      { status: 500 }
    );
  }
}
