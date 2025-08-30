'use client';

interface LoadingEllipsisProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingEllipsis({ size = 'md', className = '' }: LoadingEllipsisProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      <div 
        className={`${dotSize} bg-[#eb1966] rounded-full animate-pulse`}
        style={{ animationDelay: '0ms', animationDuration: '1400ms' }}
      ></div>
      <div 
        className={`${dotSize} bg-[#eb1966] rounded-full animate-pulse`}
        style={{ animationDelay: '200ms', animationDuration: '1400ms' }}
      ></div>
      <div 
        className={`${dotSize} bg-[#eb1966] rounded-full animate-pulse`}
        style={{ animationDelay: '400ms', animationDuration: '1400ms' }}
      ></div>
      <div 
        className={`${dotSize} bg-[#eb1966] rounded-full animate-pulse`}
        style={{ animationDelay: '600ms', animationDuration: '1400ms' }}
      ></div>
      <div 
        className={`${dotSize} bg-[#eb1966] rounded-full animate-pulse`}
        style={{ animationDelay: '800ms', animationDuration: '1400ms' }}
      ></div>
    </div>
  );
}

// Full page loading component
export function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingEllipsis size="lg" />
    </div>
  );
}

// Inline loading component for smaller areas
export function LoadingInline({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingEllipsis size={size} />
    </div>
  );
}
