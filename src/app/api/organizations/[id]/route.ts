import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const filePath = path.join(process.cwd(), 'data', 'organizations.json');

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await readFile(filePath, 'utf-8');
    const organizations = JSON.parse(data);

    const organization = organizations.find(
      (org: any) => String(org.id) === params.id
    );

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Failed to read organizations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}