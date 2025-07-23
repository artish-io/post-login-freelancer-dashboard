import { readFile } from 'fs/promises';
import { join } from 'path';
import PublicProductView from '@/components/storefront/public-product-view';

async function fetchProduct(id: string) {
  console.log('fetchProduct called with ID:', id);
  try {
    const productsPath = join(process.cwd(), 'data', 'storefront', 'products.json');
    const usersPath = join(process.cwd(), 'data', 'users.json');
    const unitSalesPath = join(process.cwd(), 'data', 'storefront', 'unit-sales.json');

    const [productsRaw, usersRaw, salesRaw] = await Promise.all([
      readFile(productsPath, 'utf-8'),
      readFile(usersPath, 'utf-8'),
      readFile(unitSalesPath, 'utf-8')
    ]);

    const products = JSON.parse(productsRaw);
    const users = JSON.parse(usersRaw);
    const sales = JSON.parse(salesRaw);

    // Try to find product with both formats: with and without #
    let rawProduct = products.find((p: any) => p.id === id);
    if (!rawProduct) {
      // If not found, try with # prefix
      rawProduct = products.find((p: any) => p.id === `#${id}`);
    }
    if (!rawProduct) {
      // If still not found, try without # prefix (in case id already has #)
      const cleanId = id.replace(/^#/, '');
      rawProduct = products.find((p: any) => p.id === cleanId || p.id === `#${cleanId}`);
    }

    if (!rawProduct) {
      console.error(`Product not found for ID: ${id}. Available products:`, products.map((p: any) => p.id));
      throw new Error('Product not found');
    }

    // Find the vendor/author information
    const vendor = users.find((u: any) => u.id === rawProduct.authorId);

    // Calculate real units sold from sales data
    // Use the actual product ID from the found product
    const productSales = sales.filter((sale: any) => sale.productId === rawProduct.id);
    const unitsSold = productSales.length;

    // Transform to match component expectations
    const product = {
      id: rawProduct.id,
      title: rawProduct.title,
      heroUrl: rawProduct.coverImage || '/images/placeholder-product.jpg',
      description: rawProduct.description,
      fileUrl: rawProduct.downloadLink || null,
      onlineUrl: null,
      unitsSold: unitsSold, // Real data from sales
      vendorId: rawProduct.authorId || 'mock-vendor-id',
      productDetails: rawProduct.productDetails || null,
      price: rawProduct.price || 0,
      status: rawProduct.status, // Include product status
      vendor: {
        name: vendor?.name || 'Product Creator',
        avatar: vendor?.avatar || '/images/default-avatar.jpg'
      }
    };

    return product;
  } catch (error) {
    console.error('Failed to fetch product:', error);
    throw new Error('Failed to fetch product');
  }
}

export default async function PublicProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: encodedId } = await params;
  // Decode the ID to handle special characters like # (handle double encoding)
  let id = decodeURIComponent(encodedId);
  // If it's still URL encoded, decode again
  if (id.includes('%')) {
    id = decodeURIComponent(id);
  }
  console.log('Public Product page - Encoded ID:', encodedId, 'Decoded ID:', id);

  const product = await fetchProduct(id);
  console.log('Product found:', product.id, product.title);

  // Only show approved products to public users
  if (product.status !== 'Approved') {
    return (
      <div className="max-w-screen-lg mx-auto px-6 py-12 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-yellow-800 mb-4">Product Not Available</h1>
          <p className="text-yellow-700 mb-4">
            This product is currently not available for viewing.
          </p>
          <a
            href="/artish-storefront"
            className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Store
          </a>
        </div>
      </div>
    );
  }

  return <PublicProductView product={product} />;
}
