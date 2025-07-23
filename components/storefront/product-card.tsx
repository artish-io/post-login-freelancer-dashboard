'use client';

import Image from 'next/image';
import Link from 'next/link';
import { StarIcon } from 'lucide-react';
import clsx from 'clsx';

type ProductCardProps = {
  id?: string;
  coverImage: string;
  title: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  rating: number | null;
  reviewCount: number;
  price: number;
};

export default function ProductCard({
  id,
  coverImage,
  title,
  author,
  rating,
  reviewCount,
  price,
}: ProductCardProps) {
  const content = (
    <div className="w-full rounded-2xl border border-zinc-200 p-4 bg-white shadow-sm hover:shadow-md transition">
      <div className="aspect-square rounded-xl overflow-hidden mb-4">
        <Image
          src={coverImage}
          alt={title}
          width={300}
          height={300}
          className="object-cover w-full h-full"
        />
      </div>

      <div className="text-sm md:text-base font-semibold text-zinc-900 leading-snug mb-2 line-clamp-2">
        {title}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full overflow-hidden">
          <Image
            src={author.avatarUrl}
            alt={author.name}
            width={24}
            height={24}
            className="object-cover w-full h-full"
          />
        </div>
        <p className="text-xs md:text-sm text-zinc-600 font-normal">{author.name}</p>
      </div>

      <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-600 font-medium mb-4">
        <StarIcon className="w-3.5 h-3.5 md:w-4 md:h-4 fill-yellow-500 text-yellow-500" />
        {rating ? (
          <span>
            {rating.toFixed(1)} ({reviewCount})
          </span>
        ) : (
          <span>No Ratings</span>
        )}
      </div>

      <div className="w-full text-center border border-zinc-300 rounded-full py-2 text-sm md:text-base font-semibold text-zinc-900">
        ${price}
      </div>
    </div>
  );

  if (id) {
    return (
      <Link href={`/artish-storefront/products/${encodeURIComponent(id)}`}>
        {content}
      </Link>
    );
  }

  return content;
}