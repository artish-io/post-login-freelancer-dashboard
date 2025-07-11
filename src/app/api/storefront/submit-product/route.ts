import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const productName = formData.get('productName') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    const file = formData.get('file') as File | null;

    if (!productName || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create submission object
    const submission = {
      id: Date.now().toString(),
      productName,
      description,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      fileName: file?.name || null,
      fileSize: file?.size || null,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };

    // Save file if provided
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Ensure directory exists
      const uploadsDir = join(process.cwd(), 'public', 'storefront-submissions', 'files');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }
      
      const filePath = join(uploadsDir, `${submission.id}_${file.name}`);
      await writeFile(filePath, buffer);
      
      submission.fileName = `${submission.id}_${file.name}`;
    }

    // Read existing submissions
    const submissionsPath = join(process.cwd(), 'public', 'storefront-submissions', 'submissions.json');
    let submissions = [];
    
    try {
      const existingData = await readFile(submissionsPath, 'utf-8');
      submissions = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      submissions = [];
    }

    // Add new submission
    submissions.push(submission);

    // Write back to file
    await writeFile(submissionsPath, JSON.stringify(submissions, null, 2));

    return NextResponse.json({ 
      success: true, 
      submissionId: submission.id,
      message: 'Product submitted successfully for review'
    });

  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit product' },
      { status: 500 }
    );
  }
}
