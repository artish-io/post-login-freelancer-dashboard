'use client';

import PurchasedProductsGrid from '../../../../../components/shared/storefront/purchases/purchased-products-grid';
import StoreDataNavigation from '../../../../../components/shared/storefront/store-data-navigation';
export default function CommissionerPurchasesPage() {

  return (
    <section className="flex flex-col gap-6 px-6 py-6">
        {/* Header */}
        <StoreDataNavigation currentPage="purchases" dashboardType="commissioner" />

        {/* Purchases grid */}
        <PurchasedProductsGrid />

        {/* Simple Prev / Next pagination placeholder (expand later) */}
        {/* Pagination logic could mirror the product-inventory page when data is large */}
    </section>
  );
}