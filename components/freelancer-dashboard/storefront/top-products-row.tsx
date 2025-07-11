

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
    async function fetchTopProducts() {
      try {
        const res = await fetch('/api/storefront/top-products');
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch top products:', error);
      }
    }

    fetchTopProducts();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">Most Sold Items</h2>
      <div className="flex flex-col gap-3">
        {products.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm font-medium text-gray-800">
              <span>{item.name}</span>
              <span>{item.percentage}%</span>
            </div>
            <div className="w-full h-2 bg-pink-100 rounded-full mt-1">
              <div
                className={clsx(
                  'h-full rounded-full bg-pink-700 transition-all duration-300 ease-in-out'
                )}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}