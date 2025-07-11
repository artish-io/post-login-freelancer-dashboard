// src/lib/storefront/updateSummary.ts
import path from 'path';
import { writeFile } from 'fs/promises';
import type { StoreSummary } from '@/types/storefront';

const SUMMARY_PATH = path.join(process.cwd(), 'data', 'storefront', 'summary.json');

export async function updateSummary(data: StoreSummary) {
  await writeFile(SUMMARY_PATH, JSON.stringify(data, null, 2));
}