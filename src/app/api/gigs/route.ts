import { NextResponse } from 'next/server';
import { readAllGigs, getPublicGigs } from '@/lib/gigs/hierarchical-storage';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get('category')?.toLowerCase();
  const rateMin = parseFloat(searchParams.get('rateMin') || '');
  const rateMax = parseFloat(searchParams.get('rateMax') || '');
  const tools = searchParams.getAll('tools');
  const search = searchParams.get('search')?.toLowerCase();

  try {
    // Get public gigs using hierarchical storage
    const gigs = await getPublicGigs();

    const filtered = gigs.filter((gig: any) => {
      // Gigs are already filtered to public ones by getPublicGigs()

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

    // Enrich gigs with default invoicing method for older gigs that don't have it
    const enrichedGigs = filtered.map((gig: any) => ({
      ...gig,
      invoicingMethod: gig.invoicingMethod || 'completion'
    }));

    return NextResponse.json(enrichedGigs);
  } catch (error) {
    console.error('Error reading gigs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
