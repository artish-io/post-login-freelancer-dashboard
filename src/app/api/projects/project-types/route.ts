import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// Use gig-categories.json as universal source of truth
const CATEGORIES_PATH = path.join(process.cwd(), 'data', 'gigs', 'gig-categories.json');
const LEGACY_FILE_PATH = path.join(process.cwd(), 'data', 'project-types.json');

// GET: return all project categories + tags from universal source
export async function GET() {
  try {
    const raw = await readFile(CATEGORIES_PATH, 'utf-8');
    const categories = JSON.parse(raw);

    // Transform gig-categories.json structure to match expected project-types format
    const projectTypes: Record<string, string[]> = {};

    categories.forEach((category: any) => {
      const categoryName = category.label;
      const subcategoryNames = category.subcategories.map((sub: any) => sub.name);
      projectTypes[categoryName] = subcategoryNames;
    });

    return NextResponse.json(projectTypes);
  } catch (err) {
    console.error('GET /project-types error:', err);
    return NextResponse.json({ error: 'Failed to read project types' }, { status: 500 });
  }
}

// POST: Add new tag to a category (or create category if missing) in universal source
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, tag } = body;

    if (!category || !tag) {
      return NextResponse.json({ error: 'Missing category or tag' }, { status: 400 });
    }

    const raw = await readFile(CATEGORIES_PATH, 'utf-8');
    const categories = JSON.parse(raw);

    // Find existing category or create new one
    let existingCategory = categories.find((cat: any) => cat.label === category);

    if (!existingCategory) {
      // Create new category
      const newCategoryId = Math.max(...categories.map((c: any) => c.id), 0) + 1;
      existingCategory = {
        id: newCategoryId,
        label: category,
        subcategories: []
      };
      categories.push(existingCategory);
    }

    // Add subcategory if it doesn't exist
    const subcategoryExists = existingCategory.subcategories.some((sub: any) => sub.name === tag);
    if (!subcategoryExists) {
      const newSubcategoryId = existingCategory.subcategories.length > 0
        ? Math.max(...existingCategory.subcategories.map((s: any) => s.id), 0) + 1
        : 1;

      existingCategory.subcategories.push({
        id: newSubcategoryId,
        name: tag
      });
    }

    await writeFile(CATEGORIES_PATH, JSON.stringify(categories, null, 2));
    return NextResponse.json({ success: true, message: 'Tag added to universal source' });
  } catch (err) {
    console.error('POST /project-types error:', err);
    return NextResponse.json({ error: 'Failed to update project types' }, { status: 500 });
  }
}

// PATCH: Rename a tag or move it to a new category in universal source
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { oldCategory, oldTag, newCategory, newTag } = body;

    if (!oldCategory || !oldTag || !newCategory || !newTag) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const raw = await readFile(CATEGORIES_PATH, 'utf-8');
    const categories = JSON.parse(raw);

    // Find old category and remove the subcategory
    const oldCat = categories.find((cat: any) => cat.label === oldCategory);
    if (oldCat) {
      oldCat.subcategories = oldCat.subcategories.filter((sub: any) => sub.name !== oldTag);
    }

    // Find or create new category and add the subcategory
    let newCat = categories.find((cat: any) => cat.label === newCategory);
    if (!newCat) {
      const newCategoryId = Math.max(...categories.map((c: any) => c.id), 0) + 1;
      newCat = {
        id: newCategoryId,
        label: newCategory,
        subcategories: []
      };
      categories.push(newCat);
    }

    // Add subcategory if it doesn't exist
    const subcategoryExists = newCat.subcategories.some((sub: any) => sub.name === newTag);
    if (!subcategoryExists) {
      const newSubcategoryId = newCat.subcategories.length > 0
        ? Math.max(...newCat.subcategories.map((s: any) => s.id), 0) + 1
        : 1;

      newCat.subcategories.push({
        id: newSubcategoryId,
        name: newTag
      });
    }

    await writeFile(CATEGORIES_PATH, JSON.stringify(categories, null, 2));
    return NextResponse.json({ success: true, message: 'Tag moved in universal source' });
  } catch (err) {
    console.error('PATCH /project-types error:', err);
    return NextResponse.json({ error: 'Failed to patch project types' }, { status: 500 });
  }
}

// DELETE: Remove a tag from a category in universal source
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { category, tag } = body;

    if (!category || !tag) {
      return NextResponse.json({ error: 'Missing category or tag' }, { status: 400 });
    }

    const raw = await readFile(CATEGORIES_PATH, 'utf-8');
    const categories = JSON.parse(raw);

    // Find category and remove the subcategory
    const existingCategory = categories.find((cat: any) => cat.label === category);
    if (existingCategory) {
      existingCategory.subcategories = existingCategory.subcategories.filter((sub: any) => sub.name !== tag);
    }

    await writeFile(CATEGORIES_PATH, JSON.stringify(categories, null, 2));
    return NextResponse.json({ success: true, message: 'Tag deleted from universal source' });
  } catch (err) {
    console.error('DELETE /project-types error:', err);
    return NextResponse.json({ error: 'Failed to delete project type' }, { status: 500 });
  }
}