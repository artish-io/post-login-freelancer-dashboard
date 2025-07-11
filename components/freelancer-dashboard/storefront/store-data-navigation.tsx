'use client';

import SmoothLink from '../../ui/smooth-link';

type StoreDataNavigationProps = {
  currentPage: 'sales' | 'purchases';
};

export default function StoreDataNavigation({ currentPage }: StoreDataNavigationProps) {
  return (
    <header>
      <h1 className="text-3xl font-bold mb-4">Store Data</h1>
      <nav className="flex gap-6 text-lg font-semibold">
        {currentPage === 'sales' ? (
          <span className="text-black border-b-2 border-black pb-1">Sales</span>
        ) : (
          <SmoothLink
            href="/freelancer-dashboard/storefront/product-inventory"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sales
          </SmoothLink>
        )}

        {currentPage === 'purchases' ? (
          <span className="text-black border-b-2 border-black pb-1">Purchases</span>
        ) : (
          <SmoothLink
            href="/freelancer-dashboard/storefront/purchases"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Purchases
          </SmoothLink>
        )}
      </nav>
    </header>
  );
}
