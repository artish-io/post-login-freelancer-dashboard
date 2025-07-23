

'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';

type ProductRowProps = {
  id: string;
  subtitle: string;
  category: string;
  status: 'approved' | 'pending' | 'rejected';
  amount: number | null;
  unitsSold: number | null;
  releaseDate: string | null;
};

const statusColorMap: Record<ProductRowProps['status'], string> = {
  approved: 'bg-green-100 text-green-800 border border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  rejected: 'bg-red-100 text-red-800 border border-red-200',
};

export default function ProductRow({
  id,
  subtitle,
  category,
  status,
  amount,
  unitsSold,
  releaseDate,
}: ProductRowProps) {
  const router = useRouter();
  const pathname = usePathname();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '–';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '–';
    }
  };

  const handleRowClick = () => {
    // Encode the ID to handle special characters like #
    const encodedId = encodeURIComponent(id);

    // Determine the correct dashboard path based on current location
    if (pathname.includes('/commissioner-dashboard/')) {
      router.push(`/commissioner-dashboard/storefront/product-inventory/products/${encodedId}`);
    } else {
      router.push(`/freelancer-dashboard/storefront/product-inventory/products/${encodedId}`);
    }
  };

  return (
    <tr
      className="hover:bg-gray-50 hover:shadow-sm transition-all duration-200 cursor-pointer group"
      onClick={handleRowClick}
      title={`View details for ${subtitle}`}
    >
      <td className="px-3 sm:px-6 py-4">
        <div className="flex flex-col">
          <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{id}</div>
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-4">
        <div className="text-sm text-gray-900">{category}</div>
      </td>
      <td className="px-3 sm:px-6 py-4">
        <span className={clsx(
          'px-2 sm:px-3 py-1 rounded-full text-xs font-medium',
          statusColorMap[status]
        )}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </td>
      <td className="px-3 sm:px-6 py-4 text-right">
        <div className="text-sm font-medium text-gray-900">
          {amount !== null ? `$${amount}` : '–'}
        </div>
      </td>
      <td className="hidden md:table-cell px-6 py-4 text-right">
        <div className="text-sm text-gray-900">
          {unitsSold !== null ? unitsSold : '–'}
        </div>
      </td>
      <td className="hidden lg:table-cell px-6 py-4 text-right">
        <div className="text-sm text-gray-600">
          {formatDate(releaseDate)}
        </div>
      </td>
    </tr>
  );
}