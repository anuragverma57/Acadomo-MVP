"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";

/**
 * Filter state lives in the URL, not React state.
 *
 * This makes every result set shareable and bookmarkable, makes the browser
 * back button work, and lets the page stay a Server Component that re-queries
 * Postgres on each change — so filtering is provably server-side.
 */
export function useFilterParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const params = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      // Any filter change invalidates the current page number.
      if (!("page" in updates)) next.delete("page");

      const queryString = next.toString();
      startTransition(() => {
        router.push(queryString ? `/?${queryString}` : "/", { scroll: false });
      });
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => router.push("/", { scroll: false }));
  }, [router]);

  const activeCount = useMemo(
    () =>
      ["q", "city", "university", "roomType", "minPrice", "maxPrice"].filter(
        (key) => searchParams.get(key),
      ).length,
    [searchParams],
  );

  return { params, setParams, clearAll, activeCount, isPending };
}
