"use client";

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  User
} from 'lucide-react';

type TabType = 'invoices' | 'storefront' | 'products' | 'skills';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [storefrontSubmissions, setStorefrontSubmissions] = useState<any[]>([]);
  const [unmappedSkills, setUnmappedSkills] = useState<any[]>([]);
  const [gigCategories, setGigCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
    fetchUnmappedSkills();
    fetchGigCategories();
    fetchStorefrontSubmissions();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, purchasesRes, productsRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/storefront/purchases'),
        fetch('/api/admin/products/pending')
      ]);

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData);
      }

      if (purchasesRes.ok) {
        const purchasesData = await purchasesRes.json();
        setPurchases(purchasesData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnmappedSkills = async () => {
    try {
      const response = await fetch('/api/admin/unmapped-skills');
      const data = await response.json();
      if (data.success) {
        setUnmappedSkills(data.skills || []);
      }
    } catch (error) {
      console.error('Error fetching unmapped skills:', error);
    }
  };

  const fetchGigCategories = async () => {
    try {
      const response = await fetch('/data/gigs/gig-categories.json');
      const data = await response.json();
      setGigCategories(data || []);
    } catch (error) {
      console.error('Error fetching gig categories:', error);
    }
  };

  const fetchStorefrontSubmissions = async () => {
    try {
      const response = await fetch('/storefront-submissions/submissions.json');
      const data = await response.json();
      setStorefrontSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching storefront submissions:', error);
    }
  };

  const approveProduct = async (submissionId: string) => {
    setProcessingId(submissionId);
    try {
      const response = await fetch('/api/storefront/approve-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchStorefrontSubmissions(); // Reload to get updated status
        alert('Product approved successfully!');
      } else {
        alert(result.error || 'Failed to approve product');
      }
    } catch (error) {
      alert('Failed to approve product');
    } finally {
      setProcessingId(null);
    }
  };

  // Calculate totals from real data
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const totalServiceFees = paidInvoices.reduce((sum, inv) => sum + (inv.paymentDetails?.platformFee || 0), 0);
  const totalInvoiceAmount = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const completedPurchases = purchases.filter(p => p.status === 'delivered');
  const totalStorefrontFees = completedPurchases.reduce((sum, p) => sum + (p.platformFee || 0), 0);
  const totalStorefrontSales = completedPurchases.reduce((sum, p) => sum + p.amount, 0);

  const pendingProducts = products.filter(p => p.status === 'pending');
  const pendingStorefrontSubmissions = storefrontSubmissions.filter(s => s.status === 'pending');
  const totalPendingApprovals = pendingProducts.length + pendingStorefrontSubmissions.length;

  const pendingSkills = unmappedSkills.filter(s => s.status === 'pending');

  const tabs = [
    {
      id: 'invoices' as TabType,
      label: 'Invoice Tracking',
      icon: FileText,
      count: paidInvoices.length
    },
    {
      id: 'storefront' as TabType,
      label: 'Storefront Sales',
      icon: ShoppingCart,
      count: completedPurchases.length
    },
    {
      id: 'products' as TabType,
      label: 'Product Approval',
      icon: CheckCircle,
      count: totalPendingApprovals
    },
    {
      id: 'skills' as TabType,
      label: 'Skills Management',
      icon: User,
      count: pendingSkills.length
    }
  ];

  const handleProductAction = async (productId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: 1, reason: action === 'reject' ? 'Quality standards not met' : '' })
      });

      if (response.ok) {
        // Refresh products data
        fetchAllData();
      }
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
    }
  };

  const migratePlatformFees = async () => {
    try {
      const response = await fetch('/api/admin/migrate-invoice-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Migration completed! Updated ${result.migration.invoicesUpdated} invoices. Added $${result.migration.platformFeesAdded} in platform fees.`);
        // Refresh data to show updated fees
        fetchAllData();
      }
    } catch (error) {
      console.error('Error migrating platform fees:', error);
      alert('Migration failed. Check console for details.');
    }
  };

  return (
    <section className="flex flex-col gap-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Simple Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ARTISH Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Track invoices, commissions, and product approvals</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/admin-dashboard/platform-fees"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Platform Fees Dashboard
            </a>
            <button
              onClick={migratePlatformFees}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              🔧 Fix Missing Platform Fees
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Service Fees (5%)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ${totalServiceFees.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">{paidInvoices.length} paid invoices</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storefront Fees (30%)</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ${totalStorefrontFees.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">{completedPurchases.length} sales</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Platform Revenue</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                ${(totalServiceFees + totalStorefrontFees).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">Combined fees</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Products</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {pendingProducts.length}
              </p>
              <p className="text-sm text-gray-500">Need approval</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading data...</span>
            </div>
          ) : (
            <div>
              {/* Invoice Tracking Tab */}
              {activeTab === 'invoices' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Invoice & Commission Tracking</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform Fee (5%)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Freelancer Gets</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paidInvoices.map((invoice) => (
                          <tr key={invoice.invoiceNumber} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {invoice.projectTitle}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${invoice.totalAmount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              ${(invoice.paymentDetails?.platformFee || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${(invoice.paymentDetails?.freelancerAmount || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invoice.paidDate || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Storefront Sales Tab */}
              {activeTab === 'storefront' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Storefront Sales & Commission Tracking</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform Fee (30%)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller Gets</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {purchases.map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{purchase.id}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {purchase.productTitle}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              User #{purchase.userId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${purchase.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                              ${(purchase.platformFee || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${(purchase.sellerAmount || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                purchase.status === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {purchase.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {purchase.purchaseDate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Product Approval Tab */}
              {activeTab === 'products' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Product Approval Queue</h3>

                  {/* Storefront Submissions Section */}
                  <div className="mb-8">
                    <h4 className="text-md font-medium mb-4 text-gray-800">Storefront Submissions</h4>
                    <div className="space-y-4">
                      {pendingStorefrontSubmissions.map((submission) => (
                        <div key={submission.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-gray-900">{submission.productName}</h5>
                              <p className="text-sm text-gray-500 mt-1">
                                Submitted {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              {submission.status}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-3">{submission.description}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Category: {submission.category}</span>
                              {submission.fileName && (
                                <span>File: {submission.fileName} ({(submission.fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => approveProduct(submission.id)}
                                disabled={processingId === submission.id}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {processingId === submission.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                                Reject
                              </button>
                            </div>
                          </div>

                          {submission.tags && submission.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {submission.tags.map((tag: string, index: number) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {pendingStorefrontSubmissions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No pending storefront submissions
                      </div>
                    )}
                  </div>

                  {/* Regular Product Approvals Section */}
                  <div>
                    <h4 className="text-md font-medium mb-4 text-gray-800">Product Approvals</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {products.filter(p => ['pending', 'under_review'].includes(p.status)).map((product) => (
                        <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-gray-900 line-clamp-2">{product.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {product.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-green-600">${product.price}</span>
                          <span className="text-sm text-gray-500">{product.category}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <User className="w-4 h-4 mr-1" />
                          {product.sellerName}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleProductAction(product.id, 'approve')}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleProductAction(product.id, 'reject')}
                            className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            <XCircle className="w-4 h-4 inline mr-1" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                    {products.filter(p => ['pending', 'under_review'].includes(p.status)).length === 0 && (
                      <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No products pending approval</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Skills Management Tab */}
              {activeTab === 'skills' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Skills Management</h3>
                  <p className="text-gray-600 mb-6">
                    Manage unmapped skills that users have entered. Assign them to appropriate gig categories to improve search results.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {unmappedSkills.map((skill) => (
                          <SkillMappingRow
                            key={skill.id}
                            skill={skill}
                            categories={gigCategories}
                            onUpdate={fetchUnmappedSkills}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {unmappedSkills.length === 0 && (
                    <div className="text-center py-12">
                      <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No unmapped skills found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Skills mapping row component
function SkillMappingRow({ skill, categories, onUpdate }: {
  skill: any;
  categories: any[];
  onUpdate: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMapSkill = async () => {
    if (!selectedSubcategory) return;

    setIsUpdating(true);
    try {
      const response = await fetch('/api/admin/unmapped-skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: skill.id,
          status: 'mapped',
          mappedTo: selectedSubcategory,
          mappedCategory: selectedCategory
        })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error mapping skill:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIgnoreSkill = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/admin/unmapped-skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: skill.id,
          status: 'ignored'
        })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error ignoring skill:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);
  const subcategories = selectedCategoryData?.subcategories || [];

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {skill.skill}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {skill.frequency}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {skill.context}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          skill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          skill.status === 'mapped' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {skill.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {skill.status === 'pending' && (
          <div className="flex gap-2 items-center">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('');
              }}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {selectedCategory && (
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">Select Subcategory</option>
                {subcategories.map((sub: any) => (
                  <option key={sub.name} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleMapSkill}
              disabled={!selectedSubcategory || isUpdating}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
            >
              Map
            </button>

            <button
              onClick={handleIgnoreSkill}
              disabled={isUpdating}
              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Ignore
            </button>
          </div>
        )}
        {skill.status === 'mapped' && skill.mappedTo && (
          <span className="text-xs text-green-600">→ {skill.mappedTo}</span>
        )}
      </td>
    </tr>
  );
}
