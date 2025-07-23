'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from './cart-context';

export default function CartIcon() {
  const { getTotalItems } = useCart();
  const itemCount = getTotalItems();

  return (
    <Link href="/artish-storefront/checkout" className="relative">
      <div className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <ShoppingBag className="w-6 h-6 text-gray-700" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium" style={{ backgroundColor: '#eb1966' }}>
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </div>
    </Link>
  );
}
