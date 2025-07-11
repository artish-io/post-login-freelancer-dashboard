

'use client';

import { useEffect, useState } from 'react';
import PurchasedCard from './purchased-card';

type Product = {
  id: string; // Now contains the productId (e.g., "#101004")
  title: string;
  image: string;
  author: {
    name: string;
    avatar: string;
  };
};

export default function PurchasedProductsGrid() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchPurchases() {
      try {
        const res = await fetch('/api/storefront/purchases');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Failed to load purchases:', err);
      }
    }

    fetchPurchases();
  }, []);

  if (!products.length) {
    return <p className="text-sm text-center text-gray-500 mt-10">No purchased products found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
      {products.map((product) => (
        <PurchasedCard
          key={product.id}
          productId={product.id}
          title={product.title}
          thumbnail={product.image}
          vendor={product.author}
        />
      ))}
    </div>
  );
}