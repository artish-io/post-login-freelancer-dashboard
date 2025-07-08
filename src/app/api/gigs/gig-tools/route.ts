

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const TOOLS_PATH = path.join(process.cwd(), 'data/gigs/gig-tools.json');

export async function GET() {
  try {
    const raw = await readFile(TOOLS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load tools:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, name, icon } = body;

    if (!category || !name || !icon) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const raw = await readFile(TOOLS_PATH, 'utf-8');
    const toolsData = JSON.parse(raw);

    const categoryIndex = toolsData.findIndex((entry: any) => entry.category === category);
    if (categoryIndex === -1) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const exists = toolsData[categoryIndex].tools.some(
      (tool: any) => tool.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return NextResponse.json({ error: 'Tool already exists' }, { status: 409 });
    }

    toolsData[categoryIndex].tools.push({ name, icon });

    await writeFile(TOOLS_PATH, JSON.stringify(toolsData, null, 2));

    return NextResponse.json({ success: true, tool: { name, icon } });
  } catch (error) {
    console.error('Failed to write tool:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}