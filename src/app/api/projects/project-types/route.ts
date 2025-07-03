import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data', 'project-types.json');

// GET: return all project categories + tags
export async function GET() {
  try {
    const raw = await readFile(FILE_PATH, 'utf-8');
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (err) {
    console.error('GET /project-types error:', err);
    return NextResponse.json({ error: 'Failed to read project types' }, { status: 500 });
  }
}

// POST: Add new tag to a category (or create category if missing)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, tag } = body;

    if (!category || !tag) {
      return NextResponse.json({ error: 'Missing category or tag' }, { status: 400 });
    }

    const raw = await readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);

    const updated = { ...data };

    if (!updated[category]) {
      updated[category] = [tag];
    } else if (!updated[category].includes(tag)) {
      updated[category].push(tag);
    }

    await writeFile(FILE_PATH, JSON.stringify(updated, null, 2));
    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error('POST /project-types error:', err);
    return NextResponse.json({ error: 'Failed to update project types' }, { status: 500 });
  }
}

// PATCH: Rename a tag or move it to a new category
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { oldCategory, oldTag, newCategory, newTag } = body;

    if (!oldCategory || !oldTag || !newCategory || !newTag) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const raw = await readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);

    const updated = { ...data };

    if (updated[oldCategory]) {
      updated[oldCategory] = updated[oldCategory].filter((t: string) => t !== oldTag);
    }

    if (!updated[newCategory]) {
      updated[newCategory] = [newTag];
    } else if (!updated[newCategory].includes(newTag)) {
      updated[newCategory].push(newTag);
    }

    await writeFile(FILE_PATH, JSON.stringify(updated, null, 2));
    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error('PATCH /project-types error:', err);
    return NextResponse.json({ error: 'Failed to patch project types' }, { status: 500 });
  }
}

// DELETE: Remove a tag from a category
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { category, tag } = body;

    if (!category || !tag) {
      return NextResponse.json({ error: 'Missing category or tag' }, { status: 400 });
    }

    const raw = await readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);

    const updated = { ...data };

    if (updated[category]) {
      updated[category] = updated[category].filter((t: string) => t !== tag);
    }

    await writeFile(FILE_PATH, JSON.stringify(updated, null, 2));
    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error('DELETE /project-types error:', err);
    return NextResponse.json({ error: 'Failed to delete project type' }, { status: 500 });
  }
}