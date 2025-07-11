

'use client';

import clsx from 'clsx';

type Props = {
  productId: string;
  title: string;
  customerName: string;
  price: string;
  orderDate: string;
  status: 'Delivered' | 'Pending' | 'Refunded';
};

export default function SaleRow({
  productId,
  title,
  customerName,
  price,
  orderDate,
  status,
}: Props) {
  return (
    <div className="grid grid-cols-5 gap-4 items-center text-xs text-gray-800 py-3 border-t border-gray-200">
      <div className="flex flex-col">
        <span className="font-medium text-gray-900 text-xs">#{productId}</span>
        <span className="text-xs text-gray-500 leading-tight mt-0.5">{title}</span>
      </div>
      <div className="text-gray-700 text-xs">{customerName}</div>
      <div className="text-gray-900 font-medium text-xs">{price}</div>
      <div className="text-gray-500 text-xs">{orderDate}</div>
      <div>
        <span
          className={clsx(
            'text-xs font-semibold px-2 py-1 rounded-full',
            status === 'Delivered' && 'bg-green-100 text-green-700',
            status === 'Pending' && 'bg-yellow-100 text-yellow-700',
            status === 'Refunded' && 'bg-red-100 text-red-700'
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}