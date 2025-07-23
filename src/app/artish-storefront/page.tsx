'use client';

import SearchBar from '../../../components/storefront/search-bar';
import CategoryExplorer from '../../../components/storefront/category-explorer';
import ProductCard from '../../../components/storefront/product-card';
import Navbar1 from '../../../components/navbar1';
import Footer from '../../../components/footer';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import FreelancerTopNavbar from '../../../components/freelancer-dashboard/top-navbar';
import CommissionerTopNavbar from '../../../components/commissioner-dashboard/top-navbar';



type Product = {
  id: string;
  subtitle: string;
  categoryName: string;
  status: string;
  amount: number;
  unitsSold: number;
  releaseDate: string;
  authorId?: number;
  coverImage?: string;
  rating?: number | null;
  reviewCount?: number;
  author?: {
    name: string;
    avatarUrl: string;
  };
};

export default function ArtishStorefrontPage() {
  const { data: session, status } = useSession();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [artishPicks, setArtishPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine which navbar to show based on user session
  const isAuthenticated = status === 'authenticated' && session?.user;
  const userType = session?.user?.userType;

  // Fetch products with author data
  useEffect(() => {
    async function fetchProducts() {
      try {
        const [productsRes, usersRes] = await Promise.all([
          fetch('/api/storefront/products'),
          fetch('/api/users')
        ]);

        if (!productsRes.ok || !usersRes.ok) throw new Error('Failed to fetch data');

        const products = await productsRes.json();
        const users = await usersRes.json();

        // Enhance products with author data
        const enhancedProducts = products.map((product: any) => {
          const author = users.find((user: any) => user.id === product.authorId);
          return {
            ...product,
            author: {
              name: author?.name || 'Unknown Author',
              avatarUrl: author?.avatar || '/avatars/default.svg'
            }
          };
        });

        setFeatured(enhancedProducts.slice(0, 4));
        setArtishPicks(enhancedProducts.slice(4, 8));
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Show loading while fetching data
  if (loading) {
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

      <main className="px-6 md:px-12 max-w-screen-xl mx-auto pt-28 pb-24">
        {/* Header and Search */}
        <div className="mb-10">
          <h1 className="sr-only">Artish Digital Store</h1>
          <SearchBar />
        </div>

      {/* Curated for You */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6">Curated for you</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {featured.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              coverImage={product.coverImage || `/images/products/${product.id}.webp`}
              title={product.subtitle}
              author={product.author || { name: 'Unknown Author', avatarUrl: '/avatars/default.svg' }}
              rating={product.rating || null}
              reviewCount={product.reviewCount || 0}
              price={product.amount}
            />
          ))}
        </div>
      </section>

      {/* ARTISH Picks */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6">ARTISH Picks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {artishPicks.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              coverImage={product.coverImage || `/images/products/${product.id}.webp`}
              title={product.subtitle}
              author={product.author || { name: 'Unknown Author', avatarUrl: '/avatars/default.svg' }}
              rating={product.rating || null}
              reviewCount={product.reviewCount || 0}
              price={product.amount}
            />
          ))}
        </div>
      </section>

        {/* Explore by Category */}
        <CategoryExplorer />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}