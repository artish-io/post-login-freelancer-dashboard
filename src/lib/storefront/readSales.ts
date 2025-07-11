// src/lib/storefront/readSales.ts
import path from 'path';
import { readFile } from 'fs/promises';
import type { ProductSale } from '@/types/storefront';

const SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function readSales(): Promise<ProductSale[]> {
  const raw = await readFile(SALES_PATH, 'utf-8');
  return JSON.parse(raw);
}