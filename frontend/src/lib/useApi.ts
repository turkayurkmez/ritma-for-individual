import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

interface State<T> {
  data: T | undefined;
  loading: boolean;
  error: ApiError | null;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<State<T>>({ data: undefined, loading: true, error: null });
  const [version, setVersion] = useState(0);
  const latest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const id = ++latest.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    fetcherRef.current().then(
      (data) => {
        if (id === latest.current) setState({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (id !== latest.current) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, 'network_error', 'Sunucuya ulaşılamadı.');
        setState((current) => ({ ...current, loading: false, error: apiError }));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  useEffect(() => () => { latest.current++; }, []);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
