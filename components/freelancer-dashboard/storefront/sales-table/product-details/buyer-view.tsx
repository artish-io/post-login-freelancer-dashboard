

'use client';

import Image from 'next/image';
import RatingStars from '../../../../ui/rating-stars';

type Product = {
  id: string;
  title: string;
  heroUrl: string;
  description: string;
  fileUrl: string | null;
  onlineUrl: string | null;
  status?: string;
  price?: number;
  productDetails?: string | null;
  vendor: {
    name: string;
    avatar: string;
  };
};

type BuyerViewProps = {
  product: Product;
  isBuyer: boolean; // true = user has already purchased
  userId?: number; // current user ID for ratings
};

export default function BuyerView({ product, isBuyer, userId }: BuyerViewProps) {
  const isApproved = product.status === 'Approved';
  const isPending = product.status === 'Pending';
  const isRejected = product.status === 'Rejected';
  const hasDownloadLink = !!product.fileUrl;

  const getPurchaseButtonState = () => {
    if (!isApproved) {
      if (isPending) {
        return {
          disabled: true,
          text: 'Pending Approval',
          className: 'bg-yellow-500 text-white cursor-not-allowed opacity-70'
        };
      } else if (isRejected) {
        return {
          disabled: true,
          text: 'Not Available',
          className: 'bg-red-500 text-white cursor-not-allowed opacity-70'
        };
      } else {
        return {
          disabled: true,
          text: 'Not Available',
          className: 'bg-gray-500 text-white cursor-not-allowed opacity-70'
        };
      }
    }

    if (!hasDownloadLink) {
      return {
        disabled: true,
        text: 'No Download Available',
        className: 'bg-gray-500 text-white cursor-not-allowed opacity-70'
      };
    }

    if (isBuyer) {
      return null; // Show download buttons instead
    }

    return {
      disabled: false,
      text: `Purchase - $${product.price || 0}`,
      className: 'bg-pink-700 text-white hover:bg-pink-800'
    };
  };

  const buttonState = getPurchaseButtonState();

  return (
    <section className="max-w-screen-lg mx-auto px-4 pb-20">
      {/* Hero banner */}
      <div className="w-full h-[360px] relative rounded-md overflow-hidden border border-gray-200">
        <Image
          src={product.heroUrl}
          alt={product.title}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold mt-8">{product.title}</h1>

      <div className="grid grid-cols-4 gap-10 mt-8">
        {/* ----- Left column (description) ----- */}
        <div className="col-span-3 space-y-4">
          {product.description.split('\n').map((p, i) => (
            <p key={i} className="text-sm leading-6 text-gray-800">
              {p}
            </p>
          ))}

          {/* Product Details - aligned with description */}
          {product.productDetails && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Product Details</h3>
              <p className="text-base leading-7 text-gray-800">{product.productDetails}</p>
            </div>
          )}
        </div>

        {/* ----- Right column (actions) ----- */}
        <aside className="space-y-4">
          {/* Vendor avatar */}
          <div className="flex items-center gap-2">
            <Image
              src={product.vendor.avatar}
              alt={product.vendor.name}
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="font-semibold text-sm">{product.vendor.name}</span>
          </div>

          {/* Status warning for non-approved products */}
          {!isApproved && (
            <div className="p-3 rounded-lg border mb-4">
              {isPending && (
                <div className="text-yellow-800 bg-yellow-50 border-yellow-200 p-2 rounded text-sm">
                  <strong>⏳ Pending Approval</strong>
                  <p className="mt-1">This product is currently under review and not available for purchase.</p>
                </div>
              )}
              {isRejected && (
                <div className="text-red-800 bg-red-50 border-red-200 p-2 rounded text-sm">
                  <strong>❌ Not Available</strong>
                  <p className="mt-1">This product is not available for purchase.</p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {isBuyer && isApproved ? (
            <>
              {product.fileUrl && (
                <a
                  href={product.fileUrl}
                  download
                  className="block w-full rounded bg-black text-white text-sm font-medium text-center py-2"
                >
                  Download
                </a>
              )}

              {product.onlineUrl && (
                <a
                  href={product.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded border border-gray-300 text-sm font-medium text-center py-2 hover:bg-gray-50"
                >
                  Read Online
                </a>
              )}
            </>
          ) : (
            buttonState && (
              <button
                disabled={buttonState.disabled}
                className={`block w-full rounded text-sm font-medium py-2 ${buttonState.className}`}
              >
                {buttonState.text}
              </button>
            )
          )}

          {/* Rating Stars */}
          <div className="flex justify-center">
            <RatingStars productId={product.id} isBuyer={isBuyer} userId={userId} />
          </div>
        </aside>
      </div>


    </section>
  );
}