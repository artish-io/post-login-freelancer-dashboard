'use client';

import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

export interface StarsProps {
  value: number; // 0..5
  readOnly?: boolean;
  onChange?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

export default function Stars({
  value,
  readOnly = false,
  onChange,
  size = 'md',
  showValue = false,
  className
}: StarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleStarClick = useCallback((rating: number) => {
    if (!readOnly && onChange && rating >= 1 && rating <= 5) {
      onChange(rating as 1 | 2 | 3 | 4 | 5);
    }
  }, [readOnly, onChange]);

  const handleStarHover = useCallback((rating: number) => {
    if (!readOnly) {
      setHoverValue(rating);
    }
  }, [readOnly]);

  const handleMouseLeave = useCallback(() => {
    if (!readOnly) {
      setHoverValue(null);
    }
  }, [readOnly]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, rating: number) => {
    if (!readOnly && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleStarClick(rating);
    }
  }, [readOnly, handleStarClick]);

  const displayValue = hoverValue !== null ? hoverValue : value;
  const fullStars = Math.floor(displayValue);
  const hasHalfStar = displayValue % 1 >= 0.5;

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <div 
        className="flex items-center gap-0.5"
        onMouseLeave={handleMouseLeave}
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={readOnly ? `Rating: ${value} out of 5 stars` : 'Rate this'}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFilled = starIndex <= fullStars;
          const isHalfFilled = starIndex === fullStars + 1 && hasHalfStar;
          const isHovered = hoverValue !== null && starIndex <= hoverValue;

          return (
            <button
              key={starIndex}
              type="button"
              disabled={readOnly}
              className={clsx(
                sizeClasses[size],
                'transition-colors duration-150',
                !readOnly && 'cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded',
                readOnly && 'cursor-default'
              )}
              onClick={() => handleStarClick(starIndex)}
              onMouseEnter={() => handleStarHover(starIndex)}
              onKeyDown={(e) => handleKeyDown(e, starIndex)}
              tabIndex={readOnly ? -1 : 0}
              role={readOnly ? 'presentation' : 'radio'}
              aria-checked={readOnly ? undefined : starIndex <= value}
              aria-label={readOnly ? undefined : `${starIndex} star${starIndex !== 1 ? 's' : ''}`}
            >
              {isHalfFilled ? (
                <div className="relative">
                  <Star className={clsx(sizeClasses[size], 'text-gray-300')} />
                  <div className="absolute inset-0 overflow-hidden w-1/2">
                    <Star className={clsx(sizeClasses[size], 'fill-yellow-400 text-yellow-400')} />
                  </div>
                </div>
              ) : (
                <Star
                  className={clsx(
                    sizeClasses[size],
                    isFilled || isHovered
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      
      {showValue && (
        <span className="text-sm text-gray-600 ml-2">
          {value.toFixed(1)}/5
        </span>
      )}
    </div>
  );
}

// Convenience component for read-only display
export function ReadOnlyStars({ 
  value, 
  size = 'md', 
  showValue = true, 
  className 
}: Pick<StarsProps, 'value' | 'size' | 'showValue' | 'className'>) {
  return (
    <Stars
      value={value}
      readOnly={true}
      size={size}
      showValue={showValue}
      className={className}
    />
  );
}
