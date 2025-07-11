

'use client';

import Image from 'next/image';
import SmoothLink from '../../../ui/smooth-link';
import clsx from 'clsx';

type Props = {
  productId: string; // raw “#4016” or numeric
  title: string;
  thumbnail: string;
  vendor: {
    name: string;
    avatar: string;
  };
};

export default function PurchasedCard({ productId, title, thumbnail, vendor }: Props) {
  // Ensure productId is properly encoded for URL
  const cleanId = productId.toString().replace(/#/, '');
  const href = `/freelancer-dashboard/storefront/product-inventory/products/${encodeURIComponent(cleanId)}`;

  console.log('PurchasedCard - productId:', productId, 'cleanId:', cleanId, 'href:', href);

  return (
    <SmoothLink
      href={href}
      className={clsx(
        'flex flex-col items-center',
        'w-[300px] md:w-[340px]',
        'transition-transform hover:-translate-y-1'
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-full pt-[100%] rounded-[24px] overflow-hidden">
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 340px, 100vw"
          priority
        />
      </div>

      {/* Title */}
      <h3 className="mt-4 text-center text-lg font-semibold leading-tight">{title}</h3>

      {/* Vendor pill */}
      <div className="w-full mt-3">
        <div className="flex items-center justify-center gap-2 bg-[#2B2323] text-white rounded-full px-4 py-1.5">
          <Image
            src={vendor?.avatar || '/images/default-avatar.jpg'}
            alt={vendor?.name || 'Unknown Author'}
            width={24}
            height={24}
            className="rounded-full shrink-0"
          />
          <span className="text-sm truncate">{vendor?.name || 'Unknown Author'}</span>
        </div>
      </div>
    </SmoothLink>
  );
}