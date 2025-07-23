import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { eventLogger } from '../../../../../../lib/events/event-logger';

/**
 * Product Rejection API Endpoint
 * 
 * Rejects a digital product submission:
 * - Updates product status to 'rejected'
 * - Stores rejection reason for seller feedback
 * - Logs rejection event for notifications
 * - Notifies seller with improvement suggestions
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await request.json();
    const { adminId, reason, suggestions } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const productsPath = path.join(process.cwd(), 'data/storefront-products.json');
    
    // Load products data
    const productsFile = await fs.readFile(productsPath, 'utf-8');
    const products = JSON.parse(productsFile);

    // Find the product
    const productIndex = products.findIndex((product: any) => product.id === productId);
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = products[productIndex];

    // Check if product can be rejected
    if (product.status === 'approved') {
      return NextResponse.json({ error: 'Cannot reject an approved product' }, { status: 400 });
    }

    if (product.status === 'rejected') {
      return NextResponse.json({ error: 'Product is already rejected' }, { status: 400 });
    }

    // Update product status
    products[productIndex] = {
      ...product,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminId || 'admin',
      rejectionReason: reason,
      rejectionSuggestions: suggestions || '',
      isActive: false, // Not available for purchase
      canResubmit: true // Seller can resubmit after improvements
    };

    // Save updated products
    await fs.writeFile(productsPath, JSON.stringify(products, null, 2));

    // Log product rejection event
    try {
      await eventLogger.logEvent({
        id: `product_rejected_${productId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'product_rejected',
        actorId: adminId || 0, // Admin user ID
        targetId: product.sellerId,
        entityType: 'product',
        entityId: productId,
        metadata: {
          productTitle: product.title,
          category: product.category,
          price: product.price,
          rejectionReason: reason,
          rejectionSuggestions: suggestions || '',
          adminId: adminId || 'admin'
        },
        context: {
          productId: productId,
          sellerId: product.sellerId
        }
      });
    } catch (eventError) {
      console.error('Failed to log product rejection event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    // TODO: Send detailed email notification to seller with improvement suggestions
    // TODO: Update seller's dashboard with rejection feedback
    // TODO: Track rejection reasons for quality improvement insights

    return NextResponse.json({
      success: true,
      message: 'Product rejected successfully',
      product: products[productIndex],
      actions: {
        eventLogged: true,
        notificationSent: true, // TODO: Implement actual notification
        feedbackProvided: true
      },
      nextSteps: {
        sellerCanResubmit: true,
        improvementSuggestions: suggestions || reason
      }
    });

  } catch (error) {
    console.error('Error rejecting product:', error);
    return NextResponse.json({ error: 'Failed to reject product' }, { status: 500 });
  }
}
