'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Category = {
  id: string;
  name: string;
  description: string;
};

// Map category IDs to logo filenames
const getCategoryLogo = (categoryId: string): string => {
  const logoMap: Record<string, string> = {
    'software-development': 'software-development.png',
    'design': 'design.png',
    'events-live-shows': 'events and live shows.png',
    'photography': 'photography.png',
    'finance-business': 'finance and business.png',
    'writing-publishing': 'writing and publishing.png',
    'film-video': 'film and video.png',
    'ebooks-courses': 'ebooks and courses.png',
    'education': 'education.png',
    'comics-graphic-novels': 'comics and graphic novels.png',
    'music-audio': 'music and audio.png',
    'fitness-wellness': 'fitness and wellness.png',
    'gaming': 'gaming.png',
    'others': 'others.png'
  };

  return logoMap[categoryId] || 'ICON.png';
};

export default function CategoryExplorer() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      const res = await fetch('/api/storefront/categories');
      const data = await res.json();
      setCategories(data);
    }

    fetchCategories();
  }, []);

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold text-zinc-900 mb-6">
        Explore by Category
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <Link
            href={`/storefront/category/${cat.id}`}
            key={cat.id}
            className="flex items-start gap-4 p-4 border border-zinc-300 rounded-2xl hover:shadow-sm transition bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
              <Image
                src={`/storefront-category-logos/${getCategoryLogo(cat.id)}`}
                alt={cat.name}
                width={28}
                height={28}
              />
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-900 leading-tight mb-1">
                {cat.name}
              </h3>
              <p className="text-sm text-zinc-600">{cat.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}