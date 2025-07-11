

'use client';

import PurchasedProductsGrid from '../../../../../components/freelancer-dashboard/storefront/purchases/purchased-products-grid';
import StoreDataNavigation from '../../../../../components/freelancer-dashboard/storefront/store-data-navigation';
import { useRouter } from 'next/navigation';

export default function PurchasesPage() {
  const router = useRouter();

  return (
    <section className="flex flex-col gap-6 px-6 py-6">
      {/* Header */}
      <StoreDataNavigation currentPage="purchases" />

      {/* Purchases grid */}
      <PurchasedProductsGrid />

      {/* Simple Prev / Next pagination placeholder (expand later) */}
      {/* Pagination logic could mirror the product-inventory page when data is large */}
    </section>
  );
}