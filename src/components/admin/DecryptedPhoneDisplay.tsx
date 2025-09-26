import React from 'react';
import { usePhoneDecryption } from '@/hooks/usePhoneDecryption';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield } from 'lucide-react';

interface DecryptedPhoneDisplayProps {
  encryptedPhone: string;
  showMasked?: boolean;
  className?: string;
}

export const DecryptedPhoneDisplay: React.FC<DecryptedPhoneDisplayProps> = ({
  encryptedPhone,
  showMasked = false,
  className = ''
}) => {
  const { phone, loading, error, isEncrypted } = usePhoneDecryption(encryptedPhone, showMasked);

  if (loading) {
    return <Skeleton className={`h-4 w-32 ${className}`} />;
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-destructive ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="font-mono">{phone}</span>
      {isEncrypted && (
        <Badge variant="secondary" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Зашифровано
        </Badge>
      )}
    </div>
  );
};