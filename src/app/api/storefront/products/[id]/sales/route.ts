import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: encodedId } = await params;
    const id = decodeURIComponent(encodedId);

    // Read both sales and product data
    const [salesRaw, productsRaw] = await Promise.all([
      readFile(UNIT_SALES_PATH, 'utf-8'),
      readFile(PRODUCTS_PATH, 'utf-8')
    ]);

    const sales = JSON.parse(salesRaw);
    const products = JSON.parse(productsRaw);

    // Find the product to get its price
    const product = products.find((p: any) => p.id === id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate units sold for this product
    const productSales = sales.filter((sale: any) => sale.productId === id);
    const unitsSold = productSales.length;
    const totalRevenue = productSales.reduce((sum: number, sale: any) => sum + sale.amount, 0);

    return NextResponse.json({
      productId: id,
      unitsSold,
      totalRevenue,
      price: product.price,
      salesHistory: productSales
    });
  } catch (error) {
    console.error('Failed to load product sales:', error);
    return NextResponse.json({ error: 'Failed to load product sales' }, { status: 500 });
  }
}
