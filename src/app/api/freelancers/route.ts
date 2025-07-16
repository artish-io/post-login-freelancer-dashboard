import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'freelancers.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const freelancers = JSON.parse(fileContents);
    
    return NextResponse.json(freelancers);
  } catch (error) {
    console.error('Error reading freelancers.json:', error);
    return NextResponse.json(
      { error: 'Failed to load freelancers' },
      { status: 500 }
    );
  }
}
