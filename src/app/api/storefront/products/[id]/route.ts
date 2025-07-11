

import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: encodedId } = await params;
    // Decode the ID to handle special characters like #
    const id = decodeURIComponent(encodedId);

    const raw = await readFile(PRODUCTS_PATH, 'utf-8');
    const products = JSON.parse(raw);
    const product = products.find((p: any) => p.id === id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Failed to load product:', error);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: encodedId } = await params;
    const id = decodeURIComponent(encodedId);
    const updates = await req.json();

    const raw = await readFile(PRODUCTS_PATH, 'utf-8');
    const products = JSON.parse(raw);
    const productIndex = products.findIndex((p: any) => p.id === id);

    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Log the update for debugging
    console.log('📝 Updating product:', id, 'with fields:', Object.keys(updates));
    console.log('📝 Update values:', updates);

    // Update the product with the provided fields
    const originalProduct = { ...products[productIndex] };
    products[productIndex] = { ...products[productIndex], ...updates };

    // Log what changed
    const changedFields = Object.keys(updates).filter(key =>
      originalProduct[key] !== products[productIndex][key]
    );
    console.log('✅ Changed fields:', changedFields);

    await writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2));

    return NextResponse.json({
      success: true,
      product: products[productIndex],
      updatedFields: changedFields
    });
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: encodedId } = await params;
    const id = decodeURIComponent(encodedId);

    const raw = await readFile(PRODUCTS_PATH, 'utf-8');
    const products = JSON.parse(raw);
    const productIndex = products.findIndex((p: any) => p.id === id);

    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Remove the product from the array
    const deletedProduct = products.splice(productIndex, 1)[0];

    await writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      deletedProduct
    });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}