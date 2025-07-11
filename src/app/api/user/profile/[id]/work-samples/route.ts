

import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';

const workSamplesPath = path.join(
  process.cwd(),
  'data',
  'profiles',
  'work-samples.json'
);

// (Keep GET handler unchanged if present)

export async function POST(
  req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  try {
    const form = await req.formData();

    // -------- Extract fields --------
    const title = form.get('title')?.toString();
    const skill = form.get('skill')?.toString();
    const tool = form.get('tool')?.toString();
    const year = Number(form.get('year'));
    const url = form.get('url')?.toString();

    const file = form.get('image') as File | null;

    if (!title || !skill || !tool || !year || !url || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // -------- Prepare upload path --------
    const uploadsDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'work-samples',
      id
    );

    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExt = path.extname(file.name) || '.jpg';
    const fileName = `${Date.now()}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    // -------- Save the file --------
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    const relativeImagePath = `/uploads/work-samples/${id}/${fileName}`;

    // -------- Append to JSON store --------
    const raw = await readFile(workSamplesPath, 'utf-8');
    const samples = JSON.parse(raw);

    const newSample = {
      id: `ws-${id}-${Date.now()}`,
      userId: Number(id),
      title,
      skill,
      tool,
      year,
      url,
      image: relativeImagePath
    };

    samples.push(newSample);
    await writeFile(
      workSamplesPath,
      JSON.stringify(samples, null, 2),
      'utf-8'
    );

    return NextResponse.json(newSample, { status: 201 });
  } catch (error) {
    console.error('POST work samples error:', error);
    return NextResponse.json(
      { error: 'Failed to save work sample' },
      { status: 500 }
    );
  }
}