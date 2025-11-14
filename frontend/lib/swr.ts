import { useCallback, useEffect, useRef, useState } from "react";

type Key = string | null;

type Fetcher<Data> = (key: string) => Promise<Data>;

type SWROptions = {
  revalidateOnFocus?: boolean;
};

type SWRResponse<Data, Error> = {
  data: Data | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: (newData?: Data | Promise<Data>, shouldRevalidate?: boolean) => Promise<Data | undefined>;
};

export default function useSWR<Data = unknown, Error = unknown>(
  key: Key,
  fetcher: Fetcher<Data>,
  options?: SWROptions
): SWRResponse<Data, Error> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<Data | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(key));

  const revalidate = useCallback(async () => {
    if (!key) {
      return undefined;
    }

    setIsLoading(true);
    let isActive = true;

    try {
      const result = await fetcherRef.current(key);
      if (!isActive) {
        return undefined;
      }

      setData(result);
      setError(undefined);
      return result;
    } catch (err) {
      if (!isActive) {
        return undefined;
      }

      setError(err as Error);
      return undefined;
    } finally {
      if (isActive) {
        setIsLoading(false);
      }
    }
  }, [key]);

  useEffect(() => {
    if (!key) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    fetcherRef.current(key)
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setError(undefined);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err as Error);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (options?.revalidateOnFocus === false) {
      return;
    }

    const handler = () => {
      void revalidate();
    };

    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [options?.revalidateOnFocus, revalidate]);

  const mutate = useCallback<SWRResponse<Data, Error>["mutate"]>(
    async (newData, shouldRevalidate = true) => {
      if (newData !== undefined) {
        const resolved = await Promise.resolve(newData);
        setData(resolved);
        return resolved;
      }

      if (!shouldRevalidate) {
        return data;
      }

      return revalidate();
    },
    [data, revalidate]
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
