

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronDownIcon, TrendingUpIcon, CalendarIcon, DollarSignIcon, TypeIcon } from 'lucide-react';
import ProductInventoryTable from '../../../../../components/shared/storefront/sales-table/product-inventory-table';
import StoreDataNavigation from '../../../../../components/shared/storefront/store-data-navigation';
import clsx from 'clsx';

type ProductSummary = {
  id: string;
  subtitle: string;
  categoryName: string;
  status: 'approved' | 'pending' | 'rejected';
  amount: number | null;
  unitsSold: number | null;
  releaseDate: string | null;
};

const PER_PAGE = 5; // matches Figma‑like pagination (1,2,3 …)

export default function ProductInventoryPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  /* basic filter state */
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'best-selling' | 'date' | 'price' | 'name'>('date');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const searchParams = useSearchParams();
  const pageParam = Number(searchParams.get('page') || '1');
  const [page, setPage] = useState(Math.max(1, pageParam));

  const router = useRouter();

  /* helper function for sort labels */
  const getSortLabel = (sortValue: string) => {
    switch (sortValue) {
      case 'best-selling': return 'Best Selling';
      case 'date': return 'Release Date';
      case 'price': return 'Price';
      case 'name': return 'Name';
      default: return 'Sort By';
    }
  };

  /* fetch products on mount */
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/storefront/products');
        const data: ProductSummary[] = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  /* derived, filtered + sorted list */
  const filtered = products
    .filter((p) => (statusFilter === 'all' ? true : p.status === statusFilter))
    .sort((a, b) => {
      switch (sortBy) {
        case 'best-selling':
          return (b.unitsSold ?? 0) - (a.unitsSold ?? 0);
        case 'date':
          return new Date(b.releaseDate ?? '').getTime() - new Date(a.releaseDate ?? '').getTime();
        case 'price':
          return (b.amount ?? 0) - (a.amount ?? 0);
        case 'name':
          return a.subtitle.localeCompare(b.subtitle);
        default:
          return 0;
      }
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* keep URL in sync */
  const setPageAndPush = (newPage: number) => {
    setPage(newPage);
    router.push(`?page=${newPage}`);
  };

  return (
    <section className="flex flex-col gap-6 px-6 py-6">
      {/* Page header */}
      <StoreDataNavigation currentPage="sales" dashboardType="freelancer" />

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex gap-4">
          {/* Approval Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="border border-gray-300 rounded-full px-4 py-2 text-sm bg-white hover:bg-gray-50 transition flex items-center gap-2"
            >
              <span>{statusFilter === 'all' ? 'Approval Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showStatusDropdown && (
              <>
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'rejected', label: 'Rejected' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value as any);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
              </>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="border border-gray-300 rounded-full px-4 py-2 text-sm bg-white hover:bg-gray-50 transition flex items-center gap-2"
            >
              <span>{getSortLabel(sortBy)}</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && (
              <>
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                  {[
                    { value: 'best-selling', label: 'Best Selling', icon: TrendingUpIcon },
                    { value: 'date', label: 'Release Date', icon: CalendarIcon },
                    { value: 'price', label: 'Price', icon: DollarSignIcon },
                    { value: 'name', label: 'Name', icon: TypeIcon }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value as any);
                        setShowSortDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                    >
                      <option.icon className="w-4 h-4 text-gray-400" />
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
              </>
            )}
          </div>
        </div>

        {/* Payment Settings */}
        <button
          aria-label="Payment Settings"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition"
        >
          <i className="ri-bank-card-line" />
          Payment Settings
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <ProductInventoryTable products={paginated} />
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-6 text-sm">
        <button
          onClick={() => setPageAndPush(Math.max(1, page - 1))}
          disabled={page === 1}
          className={clsx('text-gray-500', page === 1 && 'opacity-50 cursor-not-allowed')}
        >
          Previous
        </button>

        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPageAndPush(i + 1)}
            className={clsx(
              'w-6 h-6 flex items-center justify-center rounded-full',
              page === i + 1 ? 'bg-pink-700 text-white' : 'bg-gray-200 text-gray-600'
            )}
          >
            {i + 1}
          </button>
        ))}

        <button
          onClick={() => setPageAndPush(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={clsx('text-gray-500', page === totalPages && 'opacity-50 cursor-not-allowed')}
        >
          Next
        </button>
      </div>
    </section>
  );
}