

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const CHART_DATA_PATH = path.join(process.cwd(), 'data', 'storefront', 'revenue-chart.json');

export async function GET(req: Request) {
  try {
    const url = new URL(req.url || '');
    const range = url.searchParams.get('range') || 'week';

    const fileContent = await readFile(CHART_DATA_PATH, 'utf-8');
    const chartData = JSON.parse(fileContent);

    if (!Array.isArray(chartData)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 500 });
    }

    const filtered = chartData.filter(item => item.range === range);
    return NextResponse.json(filtered[0] || { current: [], previous: [] });
  } catch (error) {
    console.error('[GET /api/storefront/revenue-chart] Error:', error);
    return NextResponse.json({ error: 'Failed to load chart data' }, { status: 500 });
  }
}