'use client';

import Image from 'next/image';
import { useCart } from './cart-context';

export default function CheckoutCartItems() {
  const { items, removeFromCart, getTotalPrice } = useCart();

  const subtotal = getTotalPrice();
  const total = subtotal; // Add tax/shipping logic here if needed

  return (
    <div className="space-y-6">
      {/* Cart Items */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-2xl p-4">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={item.coverImage}
                  alt={item.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                  {item.title}
                </h3>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src={item.author.avatarUrl}
                      alt={item.author.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm text-gray-600">{item.author.name}</span>
                </div>
              </div>

              {/* Price and Remove */}
              <div className="flex flex-col items-end justify-between">
                <span className="text-xl font-semibold text-gray-900">
                  ${item.price}
                </span>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subtotal */}
      <div className="border border-gray-200 rounded-2xl p-4">
        <div className="flex justify-between items-center text-lg">
          <span className="text-gray-700">Subtotal</span>
          <span className="font-semibold">${subtotal}</span>
        </div>
      </div>

      {/* Total */}
      <div className="border-2 border-gray-900 rounded-2xl p-4">
        <div className="flex justify-between items-center text-xl">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-gray-900">${total}</span>
        </div>
      </div>
    </div>
  );
}
