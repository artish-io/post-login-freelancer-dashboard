import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { NotificationStorage } from '@/lib/notifications/notification-storage';

export async function POST(request: NextRequest) {
  try {
    const { notificationId, userId, action } = await request.json();

    if (!notificationId || !userId) {
      return NextResponse.json(
        { error: 'Notification ID and User ID are required' },
        { status: 400 }
      );
    }

    // Mark notification as actioned in the storage
    NotificationStorage.markAsActioned(notificationId, parseInt(userId), action);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as actioned'
    });

  } catch (error) {
    console.error('Error marking notification as actioned:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
