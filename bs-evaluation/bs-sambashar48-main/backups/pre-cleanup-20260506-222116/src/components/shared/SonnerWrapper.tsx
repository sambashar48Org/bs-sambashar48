'use client';

import { Toaster } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export function SonnerWrapper() {
  const { isRTL } = useTranslation();
  return (
    <Toaster
      position={isRTL ? 'top-left' : 'top-right'}
      richColors
      closeButton
      duration={4000}
    />
  );
}
