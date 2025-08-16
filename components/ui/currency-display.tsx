'use client';

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  currencySymbolSize?: string;
  showDecimals?: boolean;
  locale?: string;
}

export default function CurrencyDisplay({
  amount,
  currency = 'USD',
  className = '',
  currencySymbolSize,
  showDecimals = true,
  locale = 'en-US'
}: CurrencyDisplayProps) {
  // Get currency symbol
  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': '$',
      'AUD': '$',
      'CHF': 'CHF',
      'CNY': '¥',
      'INR': '₹',
      'KRW': '₩',
      'BRL': 'R$',
      'MXN': '$',
      'ZAR': 'R',
      'NGN': '₦',
      'GHS': '₵',
      'KES': 'KSh',
      'EGP': 'E£',
      'MAD': 'DH',
      'TND': 'DT'
    };
    return symbols[currencyCode] || currencyCode;
  };

  // Format the number without currency symbol
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(value);
  };

  const currencySymbol = getCurrencySymbol(currency);
  const formattedNumber = formatNumber(amount);

  return (
    <span className={`inline-flex items-start ${className}`}>
      <span 
        className={`${currencySymbolSize || 'text-[0.65em]'} font-semibold mr-1 mt-0 leading-none`}
        style={{ 
          fontFamily: "'Bodoni Moda SC', serif", 
          fontWeight: 600,
          verticalAlign: 'top',
          lineHeight: '1'
        }}
      >
        {currencySymbol}
      </span>
      <span 
        className="font-semibold font-bodoni-moda leading-none"
        style={{ 
          fontFamily: "'Bodoni Moda SC', serif", 
          fontWeight: 600,
          lineHeight: '1'
        }}
      >
        {formattedNumber}
      </span>
    </span>
  );
}
