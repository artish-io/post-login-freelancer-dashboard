import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, copyFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    // Read submissions
    const submissionsPath = join(process.cwd(), 'public', 'storefront-submissions', 'submissions.json');
    const submissionsData = await readFile(submissionsPath, 'utf-8');
    const submissions = JSON.parse(submissionsData);

    // Find the submission
    const submissionIndex = submissions.findIndex((sub: any) => sub.id === submissionId);
    if (submissionIndex === -1) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const submission = submissions[submissionIndex];

    // Create approved product
    const approvedProduct = {
      ...submission,
      approvedAt: new Date().toISOString(),
      status: 'approved',
      price: 0, // Default price, can be updated later
      downloads: 0,
      rating: 0,
      reviews: []
    };

    // Move file if it exists
    if (submission.fileName) {
      const sourcePath = join(process.cwd(), 'public', 'storefront-submissions', 'files', submission.fileName);
      const destPath = join(process.cwd(), 'public', 'storefront', 'approved', 'files', submission.fileName);
      
      // Ensure destination directory exists
      const { mkdir } = await import('fs/promises');
      const destDir = join(process.cwd(), 'public', 'storefront', 'approved', 'files');
      await mkdir(destDir, { recursive: true });
      
      try {
        await copyFile(sourcePath, destPath);
      } catch (error) {
        console.warn('Failed to copy file:', error);
      }
    }

    // Read approved products
    const approvedPath = join(process.cwd(), 'public', 'storefront', 'approved', 'products.json');
    let approvedProducts = [];
    
    try {
      const existingData = await readFile(approvedPath, 'utf-8');
      approvedProducts = JSON.parse(existingData);
    } catch (error) {
      approvedProducts = [];
    }

    // Add to approved products
    approvedProducts.push(approvedProduct);

    // Update submission status
    submissions[submissionIndex].status = 'approved';
    submissions[submissionIndex].approvedAt = new Date().toISOString();

    // Write both files
    await writeFile(approvedPath, JSON.stringify(approvedProducts, null, 2));
    await writeFile(submissionsPath, JSON.stringify(submissions, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Product approved successfully',
      productId: approvedProduct.id
    });

  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve product' },
      { status: 500 }
    );
  }
}
