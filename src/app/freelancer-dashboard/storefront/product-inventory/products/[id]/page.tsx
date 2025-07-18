

// NOTE: this is a Server Component
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import BuyerView from '../../../../../../../components/shared/storefront/sales-table/product-details/buyer-view';
import VendorView from '../../../../../../../components/shared/storefront/sales-table/product-details/vendor-view';

// Get session for server component
async function getSession() {
  return await getServerSession(authOptions);
}

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

async function fetchPurchases(userId: string) {
  try {
    const purchasesPath = join(process.cwd(), 'data', 'storefront', 'purchases.json');
    const raw = await readFile(purchasesPath, 'utf-8');
    const purchases = JSON.parse(raw);
    return purchases.filter((p: any) => `${p.userId}` === `${userId}`);
  } catch (error) {
    console.error('Failed to fetch purchases:', error);
    return [];
  }
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: encodedId } = await params;
  // Decode the ID to handle special characters like #
  const id = decodeURIComponent(encodedId);
  console.log('Product page - Encoded ID:', encodedId, 'Decoded ID:', id);

  const session = await getSession(); // returns null if not logged in
  console.log('Session:', session);

  const product = await fetchProduct(id);
  console.log('Product found:', product.id, product.title);

  // default flags
  let isVendor = false;
  let isBuyer = false;

  if (session) {
    isVendor = product.vendorId === session.user.id;
    console.log('Is vendor?', isVendor, 'Product vendorId:', product.vendorId, 'Session user id:', session.user.id);

    const purchases = await fetchPurchases(session.user.id.toString());
    console.log('User purchases:', purchases.map((p: any) => p.productId));
    isBuyer = purchases.some((p: any) => p.productId === product.id);
    console.log('Is buyer?', isBuyer);
  }

  // If product is not approved and user is not the vendor, show restricted access
  if (product.status !== 'Approved' && !isVendor) {
    return (
      <div className="max-w-screen-lg mx-auto px-6 py-12 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-yellow-800 mb-4">Product Not Available</h1>
          <p className="text-yellow-700 mb-4">
            This product is currently {product.status?.toLowerCase()} and not available for viewing.
          </p>
          <a
            href="/freelancer-dashboard/storefront/product-inventory"
            className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Products
          </a>
        </div>
      </div>
    );
  }

  return isVendor ? (
    <VendorView product={product} />
  ) : (
    <BuyerView product={product} isBuyer={isBuyer} userId={session?.user?.id ? parseInt(session.user.id) : undefined} />
  );
}