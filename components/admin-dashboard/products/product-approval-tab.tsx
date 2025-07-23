'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Download,
  Star,
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Search,
  Filter
} from 'lucide-react';

export default function ProductApprovalTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  useEffect(() => {
    filterProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, searchTerm, statusFilter, categoryFilter]);

  const fetchPendingProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/products/pending');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching pending products:', error);
      // Mock data for demonstration
      setProducts([
        {
          id: 'PROD001',
          title: 'Modern Business Card Template Pack',
          description: 'A collection of 20 modern business card templates in various styles and colors.',
          category: 'Templates',
          price: 29.99,
          sellerName: 'Sarah Johnson',
          sellerId: 31,
          submittedAt: '2025-01-20T10:30:00Z',
          status: 'pending',
          files: [
            { name: 'business-cards-pack.zip', size: '15.2 MB', type: 'application/zip' },
            { name: 'preview.jpg', size: '2.1 MB', type: 'image/jpeg' }
          ],
          tags: ['business', 'cards', 'templates', 'modern', 'professional'],
          previewImages: [
            '/api/placeholder/400/300',
            '/api/placeholder/400/300',
            '/api/placeholder/400/300'
          ],
          requirements: {
            software: 'Adobe Illustrator CS6+',
            format: 'AI, EPS, PDF',
            license: 'Commercial use allowed'
          }
        },
        {
          id: 'PROD002',
          title: 'Minimalist Logo Collection',
          description: 'A curated collection of 50 minimalist logos perfect for startups and modern businesses.',
          category: 'Logos',
          price: 49.99,
          sellerName: 'Mike Chen',
          sellerId: 33,
          submittedAt: '2025-01-19T14:15:00Z',
          status: 'pending',
          files: [
            { name: 'logo-collection.zip', size: '25.8 MB', type: 'application/zip' },
            { name: 'logo-preview.pdf', size: '5.3 MB', type: 'application/pdf' }
          ],
          tags: ['logos', 'minimalist', 'startup', 'branding', 'vector'],
          previewImages: [
            '/api/placeholder/400/300',
            '/api/placeholder/400/300'
          ],
          requirements: {
            software: 'Adobe Illustrator, Sketch',
            format: 'AI, SVG, PNG',
            license: 'Extended commercial license'
          }
        },
        {
          id: 'PROD003',
          title: 'Social Media Post Templates',
          description: 'Instagram and Facebook post templates for businesses and influencers.',
          category: 'Social Media',
          price: 19.99,
          sellerName: 'Alex Rodriguez',
          sellerId: 34,
          submittedAt: '2025-01-18T16:45:00Z',
          status: 'under_review',
          files: [
            { name: 'social-templates.zip', size: '12.4 MB', type: 'application/zip' }
          ],
          tags: ['social media', 'instagram', 'facebook', 'posts', 'templates'],
          previewImages: [
            '/api/placeholder/400/300'
          ],
          requirements: {
            software: 'Canva, Photoshop',
            format: 'PSD, PNG, JPG',
            license: 'Personal and commercial use'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };



  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleProductAction = async (productId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        // Update local state
        setProducts(prev => prev.map(product => 
          product.id === productId 
            ? { ...product, status: action === 'approve' ? 'approved' : 'rejected' }
            : product
        ));
        setShowModal(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    const icons = {
      pending: Clock,
      under_review: Eye,
      approved: CheckCircle,
      rejected: XCircle
    };

    const Icon = icons[status as keyof typeof icons] || Clock;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  const categories = ['all', ...Array.from(new Set(products.map(product => product.category)))];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {products.filter(p => p.status === 'pending').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Under Review</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {products.filter(p => p.status === 'under_review').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved Today</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {products.filter(p => p.status === 'approved').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {products.filter(p => p.status === 'rejected').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500">
              <XCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by product title, seller, category, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading products...</span>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Product Image */}
              <div className="aspect-video bg-gray-100 relative">
                <Image
                  src={product.previewImages[0]}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 right-3">
                  {getStatusBadge(product.status)}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-green-600">
                    ${product.price}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {product.category}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <User className="w-4 h-4 mr-1" />
                  {product.sellerName}
                  <Calendar className="w-4 h-4 ml-3 mr-1" />
                  {new Date(product.submittedAt).toLocaleDateString()}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Review
                  </button>
                  
                  {product.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleProductAction(product.id, 'approve')}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleProductAction(product.id, 'reject', 'Quality standards not met')}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Product Review Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Product Review</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Product Details */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedProduct.title}</h3>
                <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Price:</span>
                    <span className="ml-2 text-lg font-bold text-green-600">${selectedProduct.price}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Category:</span>
                    <span className="ml-2">{selectedProduct.category}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Seller:</span>
                    <span className="ml-2">{selectedProduct.sellerName}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Submitted:</span>
                    <span className="ml-2">{new Date(selectedProduct.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Preview Images */}
              <div>
                <h4 className="font-medium mb-2">Preview Images</h4>
                <div className="grid grid-cols-3 gap-2">
                  {selectedProduct.previewImages.map((image: string, index: number) => (
                    <div key={index} className="relative w-full aspect-video">
                      <Image
                        src={image}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover rounded border"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Files */}
              <div>
                <h4 className="font-medium mb-2">Files</h4>
                <div className="space-y-2">
                  {selectedProduct.files.map((file: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({file.size})</span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleProductAction(selectedProduct.id, 'approve')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Approve Product
                </button>
                <button
                  onClick={() => handleProductAction(selectedProduct.id, 'reject', 'Quality standards not met')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4 inline mr-2" />
                  Reject Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
