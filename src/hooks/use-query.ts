'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseQueryOptions<T> {
  /** Fetch function that returns the data */
  fetchFn: (signal: AbortSignal) => Promise<T>;
  /** Enable polling interval in ms (default: 0 = no polling) */
  refetchInterval?: number;
  /** Re-fetch when tab becomes visible again (default: true) */
  refetchOnVisible?: boolean;
  /** Re-fetch when window regains focus (default: true) */
  refetchOnFocus?: boolean;
  /** Enable the query (default: true) */
  enabled?: boolean;
  /** Callback on successful fetch */
  onSuccess?: (data: T) => void;
  /** Callback on fetch error */
  onError?: (error: Error) => void;
}

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch: () => void;
  isFetching: boolean;
}

export function useQuery<T>({
  fetchFn,
  refetchInterval = 0,
  refetchOnVisible = true,
  refetchOnFocus = true,
  enabled = true,
  onSuccess,
  onError,
}: UseQueryOptions<T>): UseQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isFetching, setIsFetching] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchCountRef = useRef(0);
  const dataRef = useRef<T | undefined>(undefined);

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      const currentFetchId = ++fetchCountRef.current;

      try {
        setIsFetching(true);
        if (dataRef.current === undefined) {
          setIsLoading(true);
        }
        setIsError(false);
        setError(undefined);

        const result = await fetchFn(signal);

        // Only update if this is still the latest fetch (not aborted/superseded)
        if (currentFetchId === fetchCountRef.current && !signal.aborted) {
          dataRef.current = result;
          setData(result);
          setIsLoading(false);
          onSuccess?.(result);
        }
      } catch (err) {
        if (signal.aborted) return; // Silently ignore aborted requests

        const error = err instanceof Error ? err : new Error('Unknown error');
        if (currentFetchId === fetchCountRef.current) {
          setIsError(true);
          setError(error);
          setIsLoading(false);
          onError?.(error);
        }
      } finally {
        if (currentFetchId === fetchCountRef.current) {
          setIsFetching(false);
        }
      }
    },
    [fetchFn, onSuccess, onError]
  );

  // Main fetch effect
  useEffect(() => {
    if (!enabled) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchData(controller.signal);

    // Cleanup: abort on unmount or dependency change
    return () => {
      controller.abort();
    };
  }, [enabled, fetchData]);

  // Polling effect
  useEffect(() => {
    if (!enabled || refetchInterval <= 0) return;

    const interval = setInterval(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      fetchData(controller.signal);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [enabled, refetchInterval, fetchData]);

  // Visibility change revalidation
  useEffect(() => {
    if (!enabled || !refetchOnVisible) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        fetchData(controller.signal);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, refetchOnVisible, fetchData]);

  // Focus revalidation
  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;

    const handleFocus = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      fetchData(controller.signal);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, refetchOnFocus, fetchData]);

  const refetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchData(controller.signal);
  }, [fetchData]);

  return { data, isLoading, isError, error, refetch, isFetching };
}
