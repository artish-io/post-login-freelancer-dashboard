import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Commissioner Products API - Session:', session.user);
    
    const commissionerId = parseInt(session.user.id);
    console.log('Commissioner Products API - Commissioner ID:', commissionerId);

    // Read products data
    const productsPath = join(process.cwd(), 'data', 'storefront', 'products.json');
    const productsData = await readFile(productsPath, 'utf-8');
    const products = JSON.parse(productsData);

    console.log('Commissioner Products API - All products:', products.map((p: any) => ({ id: p.id, authorId: p.authorId })));

    // Filter products by the current user (commissioner)
    const userProducts = products.filter((product: any) => product.authorId === commissionerId);
    
    console.log(`Commissioner ${commissionerId} has ${userProducts.length} products`);

    // Transform products to match the expected format
    const transformedProducts = userProducts.map((product: any) => ({
      id: product.id,
      subtitle: product.title,
      categoryName: product.category || 'Uncategorized',
      status: product.status?.toLowerCase() || 'pending',
      amount: product.price || 0,
      unitsSold: product.unitsSold || 0,
      releaseDate: product.createdAt || new Date().toISOString()
    }));

    return NextResponse.json(transformedProducts);
  } catch (error) {
    console.error('Commissioner Products API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
