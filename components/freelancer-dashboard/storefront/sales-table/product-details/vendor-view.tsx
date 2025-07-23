

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import RatingStars from '../../../../ui/rating-stars';

type Product = {
  id: string;
  title: string;
  heroUrl: string;
  description: string;
  fileUrl: string | null;
  onlineUrl: string | null;
  unitsSold: number;
  productDetails?: string | null;
  price?: number;
  status?: string;
  vendor: {
    name: string;
    avatar: string;
  };
};

type VendorViewProps = {
  product: Product;
};

export default function VendorView({ product }: VendorViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState({
    title: product.title,
    description: product.description,
    heroUrl: product.heroUrl,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [salesData, setSalesData] = useState({
    unitsSold: product.unitsSold,
    price: product.price,
    totalRevenue: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real-time sales data
  const fetchSalesData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/storefront/products/${encodeURIComponent(product.id)}/sales`);
      if (response.ok) {
        const data = await response.json();
        setSalesData({
          unitsSold: data.unitsSold,
          price: data.price,
          totalRevenue: data.totalRevenue
        });
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load sales data on component mount
  useEffect(() => {
    fetchSalesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const handleRemove = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/storefront/products/${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        router.push('/freelancer-dashboard/storefront/product-inventory');
      } else {
        console.error('Failed to remove from storefront');
      }
    } catch (err) {
      console.error('Failed to remove from storefront', err);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/storefront/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedProduct.title,
          description: editedProduct.description,
          coverImage: editedProduct.heroUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Product updated successfully:', result);
        setIsEditing(false);

        // Verify the update was persisted by fetching the updated product
        const verifyResponse = await fetch(`/api/storefront/products/${encodeURIComponent(product.id)}`);
        if (verifyResponse.ok) {
          const updatedProduct = await verifyResponse.json();
          console.log('✅ Verified updated product data:', {
            title: updatedProduct.title,
            description: updatedProduct.description,
            coverImage: updatedProduct.coverImage
          });
        }

        // Refresh the page to show updated data from the JSON file
        router.refresh();

        // Also refresh sales data to ensure everything is in sync
        await fetchSalesData();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save product changes:', errorData);
        alert(`Failed to save changes: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Network error saving product changes:', err);
      alert('Failed to save changes. Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProduct({
      title: product.title,
      description: product.description,
      heroUrl: product.heroUrl,
    });
    setIsEditing(false);
  };

  return (
    <section className="max-w-screen-lg mx-auto px-6 py-6">
      {/* Hero */}
      <div className="w-full h-[360px] relative rounded-lg overflow-hidden border border-gray-200 mb-6">
        {isEditing ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
            <input
              type="url"
              value={editedProduct.heroUrl}
              onChange={(e) => setEditedProduct(prev => ({ ...prev, heroUrl: e.target.value }))}
              placeholder="Enter image URL"
              className="w-3/4 p-2 border border-gray-300 rounded mb-4 text-sm"
            />
            {editedProduct.heroUrl && (
              <Image
                src={editedProduct.heroUrl}
                alt="Preview"
                fill
                className="object-cover"
                priority
              />
            )}
          </div>
        ) : (
          <Image
            src={product.heroUrl}
            alt={product.title}
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Title */}
      {isEditing ? (
        <input
          type="text"
          value={editedProduct.title}
          onChange={(e) => setEditedProduct(prev => ({ ...prev, title: e.target.value }))}
          className="text-4xl font-bold mb-4 w-full border border-gray-300 rounded px-2 py-1"
        />
      ) : (
        <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
      )}

      {/* Product Status */}
      {product.status && (
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            product.status === 'Approved'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : product.status === 'Pending'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {product.status === 'Approved' && '✅ '}
            {product.status === 'Pending' && '⏳ '}
            {product.status === 'Rejected' && '❌ '}
            {product.status}
          </span>
          {product.status !== 'Approved' && (
            <p className="text-sm text-gray-600 mt-2">
              {product.status === 'Pending'
                ? 'Your product is under review and not yet available for purchase.'
                : 'Your product is not available for purchase.'}
            </p>
          )}
        </div>
      )}

      {/* Sales summary directly under title */}
      <div className="flex items-center gap-6 text-sm text-gray-600 mb-8">
        <span><strong className="text-gray-900">{salesData.unitsSold}</strong> units sold</span>
        {salesData.price && (
          <span><strong className="text-gray-900">${salesData.price}</strong> price</span>
        )}
        {salesData.totalRevenue > 0 && (
          <span><strong className="text-gray-900">${salesData.totalRevenue}</strong> total revenue</span>
        )}
        <button
          onClick={fetchSalesData}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title="Refresh sales data"
        >
          <svg className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Description */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            {isEditing ? (
              <textarea
                value={editedProduct.description}
                onChange={(e) => setEditedProduct(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-40 p-3 border border-gray-300 rounded text-base leading-7 text-gray-800 resize-vertical"
                placeholder="Enter product description..."
              />
            ) : (
              product.description.split('\n').map((p, i) => (
                <p key={i} className="text-base leading-7 text-gray-800">
                  {p}
                </p>
              ))
            )}
          </div>

          {/* Product Details - aligned with description */}
          {product.productDetails && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Product Details</h3>
              <p className="text-base leading-7 text-gray-800">{product.productDetails}</p>
            </div>
          )}
        </div>

        {/* Action panel */}
        <aside className="space-y-6">
          {/* Vendor avatar and name */}
          <div className="flex items-center gap-3">
            <Image
              src={product.vendor.avatar}
              alt={product.vendor.name}
              width={48}
              height={48}
              className="rounded-full"
            />
            <span className="font-semibold text-lg text-gray-900">{product.vendor.name}</span>
          </div>

          {/* Download button */}
          {product.fileUrl && (
            <a
              href={product.fileUrl}
              download
              className="block w-full rounded-lg bg-black text-white text-sm font-medium text-center py-3 hover:bg-gray-800 transition-colors"
            >
              Download
            </a>
          )}

          {product.onlineUrl && (
            <a
              href={product.onlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border border-gray-300 text-sm font-medium text-center py-3 hover:bg-gray-50 transition-colors"
            >
              Read Online
            </a>
          )}

          {/* Edit/Save Product button */}
          {isEditing ? (
            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white text-sm font-medium py-3 hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-300 text-gray-700 text-sm font-medium py-3 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-300 text-gray-700 text-sm font-medium py-3 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Product Page
            </button>
          )}

          {/* Rating stars */}
          <div className="flex justify-center py-2">
            <RatingStars productId={product.id} isBuyer={false} defaultRating={4} />
          </div>

          {/* Remove from Storefront button */}
          <button
            onClick={handleRemove}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-red-300 text-red-700 text-sm font-medium py-3 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove From Storefront
          </button>
        </aside>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Product
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{product.title}&quot; from storefront?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                No
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}