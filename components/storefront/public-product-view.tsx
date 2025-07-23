'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar1 from '../navbar1';
import Footer from '../footer';
import FreelancerTopNavbar from '../freelancer-dashboard/top-navbar';
import CommissionerTopNavbar from '../commissioner-dashboard/top-navbar';
import { useCart } from './cart-context';

type Product = {
  id: string;
  title: string;
  heroUrl: string;
  description: string;
  fileUrl: string | null;
  onlineUrl: string | null;
  status?: string;
  price?: number;
  productDetails?: string | null;
  vendor: {
    name: string;
    avatar: string;
  };
};

type PublicProductViewProps = {
  product: Product;
};

export default function PublicProductView({ product }: PublicProductViewProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isApproved = product.status === 'Approved';
  const hasDownloadLink = !!product.fileUrl;

  // Check if user is the vendor or has purchased this product
  const isVendor = session?.user && product.vendor.name === session?.user?.name;
  const showVendorActions = isVendor && status === 'authenticated';

  // Determine which navbar to show based on user session
  const isAuthenticated = status === 'authenticated' && session?.user;
  const userType = session?.user?.userType;

  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price || 0,
      coverImage: product.heroUrl,
      author: {
        name: product.vendor.name,
        avatarUrl: product.vendor.avatar,
      },
    });

    // Always navigate to checkout for digital products
    // Whether it's a new item or already in cart
    router.push('/artish-storefront/checkout');
  };

  const handleCheckout = () => {
    // Add to cart first, then redirect to checkout
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price || 0,
      coverImage: product.heroUrl,
      author: {
        name: product.vendor.name,
        avatarUrl: product.vendor.avatar,
      },
    });
    router.push('/artish-storefront/checkout');
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Session-aware */}
      {isAuthenticated && userType === 'freelancer' ? (
        <FreelancerTopNavbar />
      ) : isAuthenticated && userType === 'commissioner' ? (
        <CommissionerTopNavbar />
      ) : (
        <Navbar1 />
      )}

      {/* Main Content */}
      <main className="max-w-screen-lg mx-auto px-4 pt-28 pb-8">
        {/* Hero banner */}
        <div className="w-full h-[360px] relative rounded-md overflow-hidden border border-gray-200 mb-8">
          <Image
            src={product.heroUrl}
            alt={product.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-8">{product.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Left column (description) */}
          <div className="lg:col-span-3 space-y-4">
            {product.description.split('\n').map((p, i) => (
              <p key={i} className="text-sm leading-6 text-gray-800">
                {p}
              </p>
            ))}

            {/* Product Details */}
            {product.productDetails && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Details</h3>
                <p className="text-base leading-7 text-gray-800">{product.productDetails}</p>
              </div>
            )}
          </div>

          {/* Right column (actions) */}
          <aside className="space-y-4">
            {/* Price */}
            <div className="text-3xl font-bold text-gray-900">
              ${product.price || 0}
            </div>

            {/* Vendor info */}
            <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
              <Image
                src={product.vendor.avatar}
                alt={product.vendor.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="font-semibold text-sm">{product.vendor.name}</span>
            </div>

            {/* Action buttons */}
            {showVendorActions ? (
              <Link
                href={`/freelancer-dashboard/storefront/product-inventory/products/${encodeURIComponent(product.id)}`}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-sm hover:bg-blue-700 transition text-center block"
              >
                Manage Product
              </Link>
            ) : isApproved && hasDownloadLink ? (
              <div className="space-y-3">
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold text-sm hover:bg-gray-800 transition"
                >
                  Add to Cart
                </button>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-white text-black border-2 border-black py-3 px-6 rounded-lg font-semibold text-sm hover:bg-gray-50 transition"
                >
                  Checkout
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-semibold text-sm cursor-not-allowed"
              >
                Not Available
              </button>
            )}

            {/* Additional info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Instant download after purchase</p>
              <p>• 30-day money-back guarantee</p>
              <p>• Customer support included</p>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
