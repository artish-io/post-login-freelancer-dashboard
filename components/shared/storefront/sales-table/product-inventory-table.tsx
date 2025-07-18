

'use client';

import React from 'react';
import ProductRow from './product-row';

type ProductSummary = {
  id: string;
  subtitle: string;
  categoryName: string;
  status: 'approved' | 'pending' | 'rejected';
  amount: number | null;
  unitsSold: number | null;
  releaseDate: string | null;
};

type ProductInventoryTableProps = {
  products: ProductSummary[];
};

export default function ProductInventoryTable({ products }: ProductInventoryTableProps) {
  if (products.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-lg">No products found.</p>
        <p className="text-gray-400 text-sm mt-2">Start by listing your first product!</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Product ID</th>
              <th className="px-3 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Product Category</th>
              <th className="px-3 sm:px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-3 sm:px-6 py-4 text-right text-sm font-semibold text-gray-600">Amount</th>
              <th className="hidden md:table-cell px-6 py-4 text-right text-sm font-semibold text-gray-600">Unit Sold</th>
              <th className="hidden lg:table-cell px-6 py-4 text-right text-sm font-semibold text-gray-600">Release Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {products.map((product) => (
              <ProductRow
                key={product.id}
                id={product.id}
                subtitle={product.subtitle}
                category={product.categoryName}
                status={product.status}
                amount={product.amount}
                unitsSold={product.unitsSold}
                releaseDate={product.releaseDate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}