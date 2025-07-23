'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCart } from '../../../../components/storefront/cart-context';
import Navbar1 from '../../../../components/navbar1';
import FreelancerTopNavbar from '../../../../components/freelancer-dashboard/top-navbar';
import CommissionerTopNavbar from '../../../../components/commissioner-dashboard/top-navbar';
import Footer from '../../../../components/footer';
import CheckoutCartItems from '../../../../components/storefront/checkout-cart-items';
import CheckoutPaymentForm from '../../../../components/storefront/checkout-payment-form';
import RelatedProducts from '../../../../components/storefront/related-products';

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const { items, getTotalPrice } = useCart();
  
  // Determine which navbar to show based on user session
  const isAuthenticated = status === 'authenticated' && session?.user;
  const userType = session?.user?.userType;

  // If cart is empty, show empty state
  if (items.length === 0) {
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

        <main className="max-w-screen-xl mx-auto px-6 md:px-12 pt-28 pb-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Add some products to get started!</p>
            <a
              href="/artish-storefront"
              className="inline-block bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Continue Shopping
            </a>
          </div>
        </main>

        <Footer />
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

      <main className="max-w-screen-xl mx-auto px-6 md:px-12 pt-28 pb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <a
            href="/artish-storefront"
            className="bg-white text-black border-2 border-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Cart Items */}
          <div>
            <CheckoutCartItems />
          </div>

          {/* Right Column - Payment Form */}
          <div>
            <CheckoutPaymentForm />
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts />
        </div>
      </main>

      <Footer />
    </div>
  );
}
