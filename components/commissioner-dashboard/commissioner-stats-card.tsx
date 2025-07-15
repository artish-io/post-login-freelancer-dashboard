'use client';

interface CommissionerStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  changeValue?: string;
  changeDirection?: 'up' | 'down';
  bgColor?: string;
}

export default function CommissionerStatsCard({
  title,
  value,
  subtitle,
  changeValue,
  changeDirection,
  bgColor = 'bg-[#FCD5E3]'
}: CommissionerStatsCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-6 flex flex-col justify-between h-32`}>
      {/* Top - Title */}
      <div className="text-sm text-gray-700 font-medium">
        {title}
      </div>

      {/* Middle - Main value */}
      <div className="text-4xl font-bold text-black">
        {value}
      </div>

      {/* Bottom - Change indicator only */}
      <div className="flex items-center justify-end">
        {changeValue && (
          <div className="flex items-center gap-1 text-xs text-black">
            <span className="text-black font-medium">
              {changeValue}
            </span>
            {changeDirection === 'up' ? (
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
