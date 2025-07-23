import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';

const FILE_PATH = path.join(process.cwd(), 'data', 'storefront', 'products.json');
const CATEGORY_PATH = path.join(process.cwd(), 'data', 'storefront', 'categories.json');
const UNIT_SALES_PATH = path.join(process.cwd(), 'data', 'storefront', 'unit-sales.json');
const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search')?.toLowerCase() || '';
    const categoryFilter = searchParams.get('category')?.toLowerCase() || '';

    const [productsRaw, categoriesRaw, salesRaw, usersRaw] = await Promise.all([
      readFile(FILE_PATH, 'utf-8'),
      readFile(CATEGORY_PATH, 'utf-8'),
      readFile(UNIT_SALES_PATH, 'utf-8'),
      readFile(USERS_PATH, 'utf-8'),
    ]);

    const products = JSON.parse(productsRaw);
    const categories = JSON.parse(categoriesRaw);
    const sales = JSON.parse(salesRaw);
    const users = JSON.parse(usersRaw);

    const filtered = products.filter((p: any) => {
      const matchesSearch = p.title.toLowerCase().includes(search);
      const matchesCategory =
        !categoryFilter || p.category.toLowerCase() === categoryFilter;
      const isApproved = p.status === 'Approved'; // Only show approved products
      return matchesSearch && matchesCategory && isApproved;
    });

    const transformed = filtered.map((p: any) => {
      const category = categories.find((c: any) => c.id === p.category || c.name === p.category);
      const productSales = sales.filter((sale: any) => sale.productId === p.id);
      const unitsSold = productSales.length;

      // Find author information
      const author = users.find((u: any) => u.id === p.authorId);

      // Calculate rating based on reviews (mock calculation)
      const reviewCount = p.reviews ? p.reviews.length : 0;
      const rating = reviewCount > 0 ? (3.5 + Math.random() * 1.5) : null; // Random rating between 3.5-5.0

      return {
        id: p.id,
        title: p.title, // Use title instead of subtitle for consistency
        subtitle: p.title,
        categoryName: category?.name || p.category,
        status: p.status.toLowerCase(),
        price: p.price, // Use price instead of amount for consistency
        amount: p.price,
        unitsSold,
        releaseDate: new Date().toISOString(),
        authorId: p.authorId,
        coverImage: p.coverImage,
        rating: rating,
        reviewCount: reviewCount,
        author: {
          name: author?.name || 'Product Creator',
          avatarUrl: author?.avatar || '/images/default-avatar.jpg'
        }
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}