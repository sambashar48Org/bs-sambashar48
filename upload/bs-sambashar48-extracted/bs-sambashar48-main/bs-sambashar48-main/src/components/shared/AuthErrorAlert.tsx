'use client';

import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthErrorAlertProps {
  onRetry: () => void;
  isFetching: boolean;
  /** Optional: override default message */
  message?: string;
}

/**
 * AuthErrorAlert — Inline error alert for auth failures
 *
 * Displayed when useAuth reaches isError state after all retries exhausted.
 * Shows a retry button with loading state (isFetching) to prevent double-clicks.
 * Does NOT redirect or log out the user — gives them control to retry.
 */
export function AuthErrorAlert({ onRetry, isFetching, message }: AuthErrorAlertProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-amber-200/60 p-6 sm:p-8 max-w-md w-full text-center space-y-5">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            تعذر الاتصال بالخادم
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {message || 'لم نتمكن من جلب بياناتك. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.'}
          </p>
        </div>

        {/* Retry Button */}
        <Button
          onClick={onRetry}
          disabled={isFetching}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2 transition-all"
        >
          {isFetching ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              جاري التحقق...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
