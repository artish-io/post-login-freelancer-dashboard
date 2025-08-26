'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, FileText, ShoppingCart, CreditCard, Users, LogOut } from 'lucide-react';

interface PlatformFeeData {
  invoiceNumber: string;
  projectId: string;
  projectTitle: string;
  freelancerId: number;
  commissionerId: number;
  totalAmount: number;
  platformFee: number;
  freelancerAmount: number;
  paidDate: string;
  invoicingMethod: 'milestone' | 'completion';
  type: 'project-invoice' | 'storefront' | 'paywall-subscription';
}

interface SummaryStats {
  totalRevenue: number;
  projectInvoiceRevenue: number;
  storefrontRevenue: number;
  paywallRevenue: number;
  totalTransactions: number;
  averageFee: number;
}

export default function PlatformFeesAdminDashboard() {
  const [platformFees, setPlatformFees] = useState<PlatformFeeData[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalRevenue: 0,
    projectInvoiceRevenue: 0,
    storefrontRevenue: 0,
    paywallRevenue: 0,
    totalTransactions: 0,
    averageFee: 0
  });
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlatformFeesData();
      checkMigrationStatus();
    }
  }, [isAuthenticated]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/admin-dashboard/platform-fees/login');
        return;
      }

      const response = await fetch('/api/admin/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('admin_token');
        router.push('/admin-dashboard/platform-fees/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin-dashboard/platform-fees/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin-dashboard/platform-fees/login');
  };

  const fetchPlatformFeesData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/platform-fees-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setPlatformFees(data.platformFees);
        setSummaryStats(data.summary);
      }
    } catch (error) {
      console.error('Error fetching platform fees data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkMigrationStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/migrate-milestone-fees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setMigrationStatus(data);
    } catch (error) {
      console.error('Error checking migration status:', error);
    }
  };

  const runMigration = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/migrate-milestone-fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert(`Migration completed! Updated ${result.migration.invoicesUpdated} invoices. Added $${result.migration.platformFeesAdded} in platform fees.`);
        fetchPlatformFeesData();
        checkMigrationStatus();
      } else {
        alert(`Migration failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error running migration:', error);
      alert('Migration failed. Check console for details.');
    }
  };

  const projectInvoiceFees = platformFees.filter(fee => fee.type === 'project-invoice');
  const storefrontFees = platformFees.filter(fee => fee.type === 'storefront');
  const paywallFees = platformFees.filter(fee => fee.type === 'paywall-subscription');

  const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Checking authentication...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading platform fees data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Fees Dashboard</h1>
          <p className="text-gray-600 mt-1">Track and manage all platform fee deductions</p>
        </div>
        
        <div className="flex items-center gap-3">
          {migrationStatus?.needsMigration && (
            <Button onClick={runMigration} className="bg-orange-600 hover:bg-orange-700">
              Run Migration ({migrationStatus.analysis?.milestonesWithoutPlatformFees} invoices)
            </Button>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {summaryStats.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.projectInvoiceRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              5.27% fee rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storefront Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.storefrontRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              30% fee rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paywall Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.paywallRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different fee types */}
      <Tabs defaultValue="project-invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="project-invoices">
            Project Invoices ({projectInvoiceFees.length})
          </TabsTrigger>
          <TabsTrigger value="storefront">
            Storefront ({storefrontFees.length})
          </TabsTrigger>
          <TabsTrigger value="paywall">
            Paywall Subscriptions ({paywallFees.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="project-invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Invoice Platform Fees</CardTitle>
              <p className="text-sm text-gray-600">
                5.27% platform fee deducted from freelance project payments
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectInvoiceFees.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No project invoice fees found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Invoice</th>
                          <th className="text-left p-2">Project</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-right p-2">Total Amount</th>
                          <th className="text-right p-2">Platform Fee</th>
                          <th className="text-right p-2">Freelancer Amount</th>
                          <th className="text-left p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectInvoiceFees.map((fee, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-xs">{fee.invoiceNumber}</td>
                            <td className="p-2">
                              <div className="max-w-xs truncate" title={fee.projectTitle}>
                                {fee.projectTitle}
                              </div>
                              <div className="text-xs text-gray-500">{fee.projectId}</div>
                            </td>
                            <td className="p-2">
                              <Badge variant={fee.invoicingMethod === 'milestone' ? 'default' : 'secondary'}>
                                {fee.invoicingMethod}
                              </Badge>
                            </td>
                            <td className="p-2 text-right font-mono">{formatCurrency(fee.totalAmount)}</td>
                            <td className="p-2 text-right font-mono text-green-600">{formatCurrency(fee.platformFee)}</td>
                            <td className="p-2 text-right font-mono">{formatCurrency(fee.freelancerAmount)}</td>
                            <td className="p-2 text-xs text-gray-500">{fee.paidDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storefront" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storefront Platform Fees</CardTitle>
              <p className="text-sm text-gray-600">
                30% platform fee from digital product sales
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Storefront fee tracking coming soon</p>
                <p className="text-xs mt-2">Will display fees from digital product sales</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paywall" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paywall Subscription Revenue</CardTitle>
              <p className="text-sm text-gray-600">
                Revenue from subscription-based services
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Paywall subscription tracking not yet implemented</p>
                <p className="text-xs mt-2">Will display subscription revenue when feature is available</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
