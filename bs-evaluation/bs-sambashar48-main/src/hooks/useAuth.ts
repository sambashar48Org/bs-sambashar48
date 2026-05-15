'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface UserData {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'user';
}

/**
 * useAuth — Production-ready auth hook powered by React Query
 *
 * ARCHITECTURE:
 * - Middleware (Edge) is the PRIMARY route guard — validates JWT on every request
 * - useAuth is a DATA PROVIDER ONLY — fetches user data for the UI
 * - Redirect logic is CONDITIONAL, not automatic:
 *   * 401 (session expired) → redirect to /login (no point staying)
 *   * Role mismatch → redirect to / (user is authenticated but in wrong place)
 *   * 500+/network error → NO redirect, React Query retries 3 times automatically
 *
 * DESIGN DECISIONS:
 * - window.location.href used for redirects (not router.push) to avoid SPA cookie race conditions
 * - logout() clears both server cookie AND React Query cache
 * - refetch() replaces the old refreshAuth() — native React Query feature
 */
export function useAuth(requiredRole?: 'admin' | 'user') {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError, error, isFetching, refetch } = useQuery<UserData>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });

      if (!res.ok) {
        // Attach status to error for conditional handling
        const err = new Error('Auth fetch failed') as Error & { status: number };
        err.status = res.status;
        throw err;
      }

      return res.json();
    },
    // Don't retry 401 — session is gone
    retry: (failureCount, err) => {
      if (err && typeof err === 'object' && 'status' in err) {
        if ((err as { status: number }).status === 401) return false;
      }
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Conditional redirect: 401 → /login
  useEffect(() => {
    if (isError && error && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 401) {
        window.location.href = '/login';
      }
    }
  }, [isError, error]);

  // Conditional redirect: Role mismatch → /
  const isRoleMismatch = useMemo(() => {
    if (!requiredRole || !user) return false;
    return user.role !== requiredRole;
  }, [requiredRole, user]);

  useEffect(() => {
    if (user && isRoleMismatch) {
      window.location.href = '/';
    }
  }, [user, isRoleMismatch]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* silent — clear cache anyway */
    }
    // Clear ALL React Query cache to prevent stale data after logout
    queryClient.clear();
    // Full page navigation — ensures cookies are properly sent/cleared
    window.location.href = '/login';
  }, [queryClient]);

  return {
    user: user ?? null,
    isAuthenticated: !!user && !isRoleMismatch,
    isLoading,
    isError: isError && !isRoleMismatch, // Don't expose error if it's just a role mismatch
    error,
    isFetching,
    isRoleMismatch,
    refetch,
    logout,
  };
}
