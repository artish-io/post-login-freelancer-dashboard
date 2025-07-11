import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const PRODUCTS_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: encodedId } = await params;
    const id = decodeURIComponent(encodedId);
    const body = await req.json();
    const { buyerId, purchaseDate } = body;

    // Read current sales and product data
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

    // Check if product is approved for purchase
    if (product.status !== 'Approved') {
      return NextResponse.json({
        error: 'Product not available for purchase',
        reason: `Product status is ${product.status}. Only approved products can be purchased.`
      }, { status: 403 });
    }

    // Check if product has download link (required for purchase)
    if (!product.downloadLink) {
      return NextResponse.json({
        error: 'Product not available for purchase',
        reason: 'Product does not have downloadable content available.'
      }, { status: 403 });
    }

    // Create new sale entry
    const newSale = {
      productId: id,
      date: purchaseDate || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      amount: product.price,
      buyerId: buyerId || 'anonymous'
    };

    // Add the new sale
    sales.push(newSale);

    // Write back to file
    await writeFile(UNIT_SALES_PATH, JSON.stringify(sales, null, 2));

    // Calculate updated stats
    const productSales = sales.filter((sale: any) => sale.productId === id);
    const unitsSold = productSales.length;
    const totalRevenue = productSales.reduce((sum: number, sale: any) => sum + sale.amount, 0);

    return NextResponse.json({
      success: true,
      message: 'Purchase recorded successfully',
      sale: newSale,
      productStats: {
        productId: id,
        unitsSold,
        totalRevenue,
        price: product.price
      }
    });
  } catch (error) {
    console.error('Failed to record purchase:', error);
    return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
  }
}
