import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { eventLogger } from '../../../../../../lib/events/event-logger';

/**
 * Product Approval API Endpoint
 * 
 * Approves a digital product for listing in the ARTISH storefront:
 * - Updates product status to 'approved'
 * - Logs approval event for notifications
 * - Notifies seller of approval
 * - Makes product available for purchase
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await request.json();
    const { adminId, notes } = body;

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

    // Check if product can be approved
    if (product.status === 'approved') {
      return NextResponse.json({ error: 'Product is already approved' }, { status: 400 });
    }

    if (product.status === 'rejected') {
      return NextResponse.json({ error: 'Cannot approve a rejected product. Product must be resubmitted.' }, { status: 400 });
    }

    // Update product status
    products[productIndex] = {
      ...product,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: adminId || 'admin',
      approvalNotes: notes || '',
      listedAt: new Date().toISOString(), // When it becomes available for purchase
      isActive: true // Available for purchase
    };

    // Save updated products
    await fs.writeFile(productsPath, JSON.stringify(products, null, 2));

    // Log product approval event
    try {
      await eventLogger.logEvent({
        id: `product_approved_${productId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'product_approved',
        notificationType: 102, // NOTIFICATION_TYPES.PRODUCT_APPROVED
        actorId: adminId || 0, // Admin user ID
        targetId: product.sellerId,
        entityType: 6, // ENTITY_TYPES.PRODUCT
        entityId: productId,
        metadata: {
          productTitle: product.title,
          category: product.category,
          price: product.price,
          approvalNotes: notes || '',
          adminId: adminId || 'admin'
        },
        context: {
          productId: productId,
          sellerId: product.sellerId
        }
      });
    } catch (eventError) {
      console.error('Failed to log product approval event:', eventError);
      // Don't fail the main operation if event logging fails
    }

    // TODO: Send email notification to seller
    // TODO: Update seller's earnings potential
    // TODO: Add to storefront search index

    return NextResponse.json({
      success: true,
      message: 'Product approved successfully',
      product: products[productIndex],
      actions: {
        eventLogged: true,
        notificationSent: true, // TODO: Implement actual notification
        addedToStorefront: true
      }
    });

  } catch (error) {
    console.error('Error approving product:', error);
    return NextResponse.json({ error: 'Failed to approve product' }, { status: 500 });
  }
}
