"use client";

import { useCallback, useMemo, useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * URL-backed filter state that reflects a selection immediately.
 *
 * router.push inside a transition does not update searchParams until the server
 * responds, so a control reading straight from the URL keeps showing the OLD
 * value for the whole round-trip and then snaps — which reads as a glitch.
 *
 * useOptimistic layers the pending change over the URL so the control updates
 * on click. React discards the optimistic value automatically once the
 * transition settles and the real URL arrives, so the two can never disagree.
 */
export function useOptimisticParams(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlParams = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  const [params, applyOptimistic] = useOptimistic(
    urlParams,
    (current: Record<string, string>, updates: Record<string, string | undefined>) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "all") delete next[key];
        else next[key] = value;
      }
      if (!("page" in updates)) delete next.page;
      return next;
    },
  );

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      startTransition(() => {
        // Must run inside the transition, or React warns and drops it.
        applyOptimistic(updates);

        const next = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === "" || value === "all") next.delete(key);
          else next.set(key, value);
        }
        // Any filter change invalidates the current page number.
        if (!("page" in updates)) next.delete("page");

        const qs = next.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
      });
    },
    [applyOptimistic, basePath, router, searchParams],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      applyOptimistic(
        Object.fromEntries(Object.keys(urlParams).map((key) => [key, undefined])),
      );
      router.push(basePath, { scroll: false });
    });
  }, [applyOptimistic, basePath, router, urlParams]);

  return { params, setParams, clearAll, isPending };
}
