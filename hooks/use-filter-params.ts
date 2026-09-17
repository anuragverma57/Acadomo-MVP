"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useOptimistic, useTransition } from "react";

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

  const urlParams = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  /**
   * router.push inside a transition leaves searchParams stale until the server
   * responds, so a control reading straight from the URL shows the OLD value
   * for the whole round-trip and then snaps. This layer applies the change
   * immediately; React discards it once the real URL arrives.
   */
  const [params, applyOptimistic] = useOptimistic(
    urlParams,
    (
      current: Record<string, string>,
      updates: Record<string, string | undefined>,
    ) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") delete next[key];
        else next[key] = value;
      }
      if (!("page" in updates)) delete next.page;
      return next;
    },
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
        // Must be inside the transition or React drops the optimistic update.
        applyOptimistic(updates);
        router.push(queryString ? `/?${queryString}` : "/", { scroll: false });
      });
    },
    [applyOptimistic, router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      applyOptimistic(
        Object.fromEntries(Object.keys(urlParams).map((key) => [key, undefined])),
      );
      router.push("/", { scroll: false });
    });
  }, [applyOptimistic, router, urlParams]);

  // Counted from the optimistic params so the mobile badge updates instantly.
  const activeCount = useMemo(
    () =>
      ["q", "city", "university", "roomType", "minPrice", "maxPrice"].filter(
        (key) => params[key],
      ).length,
    [params],
  );

  return { params, setParams, clearAll, activeCount, isPending };
}
