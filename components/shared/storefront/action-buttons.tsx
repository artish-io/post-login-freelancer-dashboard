'use client';

import { useState } from 'react';
import { PlusIcon, TargetIcon } from 'lucide-react';
import Link from 'next/link';
import ListNewProductModal from './list-new-product-modal';

type ActionButtonsProps = {
  dashboardType: 'freelancer' | 'commissioner';
};

export default function StorefrontActionButtons({ dashboardType }: ActionButtonsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const basePath = dashboardType === 'freelancer' 
    ? '/freelancer-dashboard/storefront' 
    : '/commissioner-dashboard/storefront';

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Sales & Purchases Button */}
        <Link
          href={`${basePath}/product-inventory`}
          className="w-full bg-black text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          <TargetIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Your Sales & Purchases</span>
        </Link>

        {/* List New Product Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-white border border-[#eb1966] text-[#eb1966] py-3 px-4 rounded-xl flex items-center gap-3 hover:bg-[#fff0f6] transition"
        >
          <div className="flex items-center justify-center w-6 h-6 border border-[#eb1966] rounded-md">
            <PlusIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold">List a new product</span>
            <span className="text-xs text-gray-500 leading-tight">
              Set up a new product category for sale on the ARTISH store
            </span>
          </div>
        </button>
      </div>

      {/* Modal */}
      <ListNewProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
