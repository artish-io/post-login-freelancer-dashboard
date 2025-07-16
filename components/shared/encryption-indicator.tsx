// components/shared/encryption-indicator.tsx
'use client';

import { Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { useEncryption } from '@/hooks/useEncryption';

interface EncryptionIndicatorProps {
  className?: string;
  showText?: boolean;
}

export default function EncryptionIndicator({ 
  className = "", 
  showText = false 
}: EncryptionIndicatorProps) {
  const { isReady, publicKey } = useEncryption();

  if (!isReady) {
    return (
      <div className={`flex items-center gap-1 text-yellow-600 ${className}`}>
        <Shield size={16} />
        {showText && <span className="text-xs">Setting up encryption...</span>}
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className={`flex items-center gap-1 text-red-600 ${className}`}>
        <ShieldX size={16} />
        {showText && <span className="text-xs">Encryption unavailable</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-green-600 ${className}`}>
      <ShieldCheck size={16} />
      {showText && <span className="text-xs">End-to-end encrypted</span>}
    </div>
  );
}
