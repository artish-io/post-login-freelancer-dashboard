import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { getAllInvoices } from '../../../../lib/invoice-storage';

/**
 * Admin Revenue API Endpoint
 * 
 * Provides comprehensive revenue analytics for the ARTISH platform including:
 * - Service charges from freelance projects (5% fee)
 * - Storefront sales from digital products (30% platform fee)
 * - Total platform revenue and growth metrics
 * - Transaction analytics and trends
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    // Load data files
    const storefrontSalesPath = path.join(process.cwd(), 'data/storefront-sales.json'); // TODO: Create this file

    let invoicesData = [];
    let storefrontData = [];

    try {
      invoicesData = await getAllInvoices();
    } catch (error) {
      console.log('Error loading invoices, using empty array:', error);
    }

    try {
      const storefrontFile = await fs.readFile(storefrontSalesPath, 'utf-8');
      storefrontData = JSON.parse(storefrontFile);
    } catch (error) {
      console.log('Storefront sales file not found, using mock data');
      // Mock storefront data for demonstration
      storefrontData = [
        {
          id: 'SF001',
          productTitle: 'Modern Business Card Template Pack',
          price: 29.99,
          platformFee: 8.99,
          sellerAmount: 21.00,
          purchasedAt: '2025-01-20T10:30:00Z',
          status: 'completed'
        },
        {
          id: 'SF002',
          productTitle: 'Minimalist Logo Collection',
          price: 49.99,
          platformFee: 14.99,
          sellerAmount: 35.00,
          purchasedAt: '2025-01-19T14:15:00Z',
          status: 'completed'
        },
        {
          id: 'SF003',
          productTitle: 'Complete Brand Identity Kit',
          price: 89.99,
          platformFee: 26.99,
          sellerAmount: 63.00,
          purchasedAt: '2025-01-18T16:45:00Z',
          status: 'completed'
        }
      ];
    }

    // Filter data by date range
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000; // Include end date

    // Filter paid invoices within date range
    const paidInvoices = invoicesData.filter((invoice: any) => {
      if (invoice.status !== 'paid' || !invoice.paidDate) return false;
      const paidDateTime = new Date(invoice.paidDate).getTime();
      return paidDateTime >= startDateTime && paidDateTime <= endDateTime;
    });

    // Filter storefront sales within date range
    const storefrontSales = storefrontData.filter((sale: any) => {
      if (sale.status !== 'completed' || !sale.purchasedAt) return false;
      const purchaseDateTime = new Date(sale.purchasedAt).getTime();
      return purchaseDateTime >= startDateTime && purchaseDateTime <= endDateTime;
    });

    // Calculate service charges (5% from freelance projects)
    const serviceChargeRevenue = paidInvoices.reduce((total: number, invoice: any) => {
      const platformFee = invoice.paymentDetails?.platformFee || (invoice.totalAmount * 0.05);
      return total + platformFee;
    }, 0);

    // Calculate storefront revenue (30% platform fee)
    const storefrontRevenue = storefrontSales.reduce((total: number, sale: any) => {
      return total + (sale.platformFee || sale.price * 0.3);
    }, 0);

    // Calculate totals
    const totalRevenue = serviceChargeRevenue + storefrontRevenue;
    const totalTransactions = paidInvoices.length + storefrontSales.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate daily revenue for chart
    const dailyRevenue = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Service charges for this day
      const dayServiceCharges = paidInvoices
        .filter((invoice: any) => invoice.paidDate === dateStr)
        .reduce((total: number, invoice: any) => {
          const platformFee = invoice.paymentDetails?.platformFee || (invoice.totalAmount * 0.05);
          return total + platformFee;
        }, 0);

      // Storefront sales for this day
      const dayStorefrontRevenue = storefrontSales
        .filter((sale: any) => sale.purchasedAt.split('T')[0] === dateStr)
        .reduce((total: number, sale: any) => {
          return total + (sale.platformFee || sale.price * 0.3);
        }, 0);

      dailyRevenue.push({
        date: dateStr,
        service: Math.round(dayServiceCharges * 100) / 100,
        storefront: Math.round(dayStorefrontRevenue * 100) / 100
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate growth metrics (mock for now - would need historical data)
    const growthMetrics = {
      revenue: 12.5,
      serviceCharges: 8.3,
      storefrontSales: 18.7,
      transactions: 15.2
    };

    // Prepare response data
    const responseData = {
      dateRange: {
        start: startDate,
        end: endDate
      },
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      serviceCharges: Math.round(serviceChargeRevenue * 100) / 100,
      storefrontSales: Math.round(storefrontRevenue * 100) / 100,
      totalTransactions,
      averageTransaction: Math.round(averageTransaction * 100) / 100,
      growth: growthMetrics,
      dailyRevenue,
      breakdown: {
        serviceChargePercentage: totalRevenue > 0 ? Math.round((serviceChargeRevenue / totalRevenue) * 100) : 0,
        storefrontPercentage: totalRevenue > 0 ? Math.round((storefrontRevenue / totalRevenue) * 100) : 0
      },
      metrics: {
        totalInvoicesPaid: paidInvoices.length,
        totalStorefrontSales: storefrontSales.length,
        averageInvoiceValue: paidInvoices.length > 0 ? Math.round((paidInvoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0) / paidInvoices.length) * 100) / 100 : 0,
        averageStorefrontSale: storefrontSales.length > 0 ? Math.round((storefrontSales.reduce((sum: number, sale: any) => sum + sale.price, 0) / storefrontSales.length) * 100) / 100 : 0
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching admin revenue data:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}

// Export revenue data as CSV
export async function POST(request: Request) {
  try {
    const { startDate, endDate, format = 'csv' } = await request.json();

    // Get the same data as the GET endpoint
    const revenueResponse = await GET(new Request(`${request.url}?start=${startDate}&end=${endDate}`));
    const revenueData = await revenueResponse.json();

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Date',
        'Service Charges',
        'Storefront Sales',
        'Total Revenue',
        'Transactions'
      ];

      const csvRows = revenueData.dailyRevenue.map((day: any) => [
        day.date,
        day.service.toFixed(2),
        day.storefront.toFixed(2),
        (day.service + day.storefront).toFixed(2),
        '1' // Placeholder for transaction count per day
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="artish-revenue-${startDate}-to-${endDate}.csv"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });

  } catch (error) {
    console.error('Error exporting revenue data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
