

'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type TopProduct = {
  name: string;
  percentage: number;
};

export default function TopProductsBarChart() {
  const [products, setProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const res = await fetch('/api/storefront/top-products');
        const json = await res.json();
        if (Array.isArray(json)) {
          setProducts(json);
        }
      } catch (error) {
        console.error('Failed to fetch top products:', error);
      }
    };

    fetchTopProducts();
  }, []);

  return (
    <div>
      <ul className="space-y-3">
        {products.map((product, index) => (
          <li key={index}>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-gray-700 font-medium">{product.name}</span>
              <span className="text-gray-600 font-semibold">{product.percentage}%</span>
            </div>
            <div className="w-full bg-pink-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  'bg-pink-700'
                )}
                style={{ width: `${product.percentage}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}