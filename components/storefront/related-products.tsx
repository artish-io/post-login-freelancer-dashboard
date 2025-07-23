'use client';

import { useEffect, useState } from 'react';
import ProductCard from './product-card';

type Product = {
  id: string;
  title: string;
  coverImage: string;
  price: number;
  rating?: number;
  reviewCount?: number;
  author: {
    name: string;
    avatarUrl: string;
  };
};

export default function RelatedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelatedProducts() {
      try {
        const response = await fetch('/api/storefront/products');
        if (response.ok) {
          const data = await response.json();
          console.log('API Response:', data); // Debug log
          // Show first 3 products as related products
          setProducts(data.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedProducts();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Related products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Related products</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            title={product.title || 'Untitled Product'}
            coverImage={product.coverImage || '/images/placeholder-product.jpg'}
            price={product.price || 0}
            rating={product.rating || null}
            reviewCount={product.reviewCount || 0}
            author={{
              name: product.author?.name || 'Unknown Creator',
              avatarUrl: product.author?.avatarUrl || '/images/default-avatar.jpg'
            }}
          />
        ))}
      </div>
    </div>
  );
}
