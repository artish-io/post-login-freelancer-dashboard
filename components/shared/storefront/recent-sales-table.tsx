'use client';

import { useEffect, useState } from 'react';
import SaleRow from './sale-row';

type Sale = {
  productId: string;
  productName: string;
  buyerName: string;
  date: string;
  price?: string;
  status: 'Delivered' | 'Pending' | 'Refunded';
};

export default function RecentSalesTable() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchSales() {
      try {
        const res = await fetch('/api/storefront/recent-sales');
        const data = await res.json();
        console.log('Recent sales API response:', data);

        if (data.error) {
          console.error('API error:', data.error);
          setError(true);
          return;
        }

        setSales(
          data.map((sale: any) => ({
            ...sale,
            price: getRandomPrice(sale.productId), // Optional: simulate price
            status: sale.status || 'Delivered',
          }))
        );
      } catch (err) {
        console.error('Fetch error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, []);

  function getRandomPrice(productId: string) {
    const priceMap: Record<string, string> = {
      '349019': '$15',
      '60015': '$25',
      '40016': '$25',
      '49017': '$10',
      '98018': '$10',
    };
    return priceMap[productId] || '$15';
  }

  if (loading) return <div className="text-sm text-gray-500 mt-4">Loading recent sales...</div>;
  if (error) return <div className="text-sm text-red-500 mt-4">Failed to load sales.</div>;

  const displayedSales = expanded ? sales : sales.slice(0, 3);

  return (
    <div className="w-full bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>

      {sales.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No recent sales found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4 text-xs text-gray-500 pb-2 border-b border-gray-300 font-medium">
            <div>Product ID</div>
            <div>Customer Name</div>
            <div>Price</div>
            <div>Order Date</div>
            <div>Status</div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {displayedSales.map((sale) => (
              <SaleRow
                key={`${sale.productId}-${sale.date}`}
                productId={sale.productId}
                title={sale.productName}
                customerName={sale.buyerName}
                price={sale.price || '$15'}
                orderDate={sale.date}
                status={sale.status}
              />
            ))}
          </div>
        </>
      )}
      {sales.length > 3 && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="bg-pink-100 text-pink-600 rounded-full p-2 flex items-center justify-center focus:outline-none"
            aria-label={expanded ? 'Collapse sales list' : 'Expand sales list'}
          >
            {expanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}