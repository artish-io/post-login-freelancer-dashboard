import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const GIGS_PATH = path.join(process.cwd(), 'data', 'gigs', 'gigs.json');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get('category')?.toLowerCase();
  const rateMin = parseFloat(searchParams.get('rateMin') || '');
  const rateMax = parseFloat(searchParams.get('rateMax') || '');
  const tools = searchParams.getAll('tools');
  const search = searchParams.get('search')?.toLowerCase();

  try {
    const gigsRaw = fs.readFileSync(GIGS_PATH, 'utf-8');
    const gigs = JSON.parse(gigsRaw);

    const filtered = gigs.filter((gig: any) => {
      const matchesCategory = category ? gig.category.toLowerCase() === category : true;

      const matchesRateMin = !isNaN(rateMin) ? gig.hourlyRateMax >= rateMin : true;
      const matchesRateMax = !isNaN(rateMax) ? gig.hourlyRateMin <= rateMax : true;

      const matchesTools = tools.length > 0
        ? tools.every(tool =>
            gig.toolsRequired?.some((t: string) =>
              t.toLowerCase() === tool.toLowerCase()
            )
          )
        : true;

      const matchesSearch = search
        ? gig.title.toLowerCase().includes(search) ||
          gig.tags?.some((tag: string) => tag.toLowerCase().includes(search)) ||
          gig.description?.toLowerCase().includes(search)
        : true;

      return (
        matchesCategory &&
        matchesRateMin &&
        matchesRateMax &&
        matchesTools &&
        matchesSearch
      );
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error reading gigs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
