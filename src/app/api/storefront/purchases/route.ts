// src/app/api/storefront/purchases/route.ts

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import { getAllUsers } from '@/lib/storage/unified-storage-service';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'purchases.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  try {
    // Read all required data files
    const [purchasesRaw, productsRaw, users] = await Promise.all([
      readFile(FILE_PATH, 'utf-8'),
      readFile(PRODUCTS_PATH, 'utf-8'),
      getAllUsers()
    ]);

    const purchases = JSON.parse(purchasesRaw);
    const products = JSON.parse(productsRaw);

    // Filter purchases by userId if provided
    const filteredPurchases = userId
      ? purchases.filter((p: any) => `${p.userId}` === `${userId}`)
      : purchases;

    // Enrich purchases with product and author information
    const enrichedPurchases = filteredPurchases.map((purchase: any) => {
      const product = products.find((p: any) => p.id === purchase.productId);
      const author = product ? users.find((u: any) => u.id === product.authorId) : null;

      return {
        id: purchase.productId, // Use productId for navigation, not purchase.id
        title: product?.title || 'Unknown Product',
        image: product?.coverImage || '/images/placeholder-product.jpg',
        author: {
          name: author?.name || 'Unknown Author',
          avatar: author?.avatar || '/images/default-avatar.jpg'
        },
        purchaseDate: purchase.purchaseDate,
        amount: purchase.amount,
        status: purchase.status,
        downloadUrl: purchase.downloadUrl,
        licenseKey: purchase.licenseKey,
        purchaseId: purchase.id // Keep purchase ID for reference if needed
      };
    });

    return NextResponse.json(enrichedPurchases);
  } catch (err) {
    console.error('Failed to load purchases:', err);
    return NextResponse.json({ error: 'Failed to load purchases' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const newPurchase = await req.json();

    // basic sanity checks
    if (!newPurchase?.userId || !newPurchase?.productId) {
      return NextResponse.json(
        { error: 'userId and productId are required' },
        { status: 400 }
      );
    }

    // read existing purchases
    const raw = await readFile(FILE_PATH, 'utf-8');
    const purchases = JSON.parse(raw);

    // simple unique id generator
    const nextId =
      Math.max(0, ...purchases.map((p: any) => Number(p.id) || 0)) + 1;

    const licenseKey = newPurchase.licenseKey ?? `ART-${randomBytes(4).toString('hex').toUpperCase()}`;

    purchases.push({
      id: nextId,
      status: 'delivered',
      purchaseDate: new Date().toISOString().slice(0, 10),
      licenseKey,
      ...newPurchase,
    });

    await writeFile(FILE_PATH, JSON.stringify(purchases, null, 2));

    return NextResponse.json({ success: true, id: nextId });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    );
  }
}