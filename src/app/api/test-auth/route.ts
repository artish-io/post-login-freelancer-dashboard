import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/storage/unified-storage-service';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    console.log('🧪 Testing authentication for:', { username });
    
    const user = await authenticateUser(username, password);
    
    if (user) {
      console.log('✅ Authentication successful:', { id: user.id, name: user.name, type: user.type });
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          type: user.type,
          email: user.email
        }
      });
    } else {
      console.log('❌ Authentication failed');
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('🔥 Authentication error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
