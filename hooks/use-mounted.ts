"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only after client hydration. Theme is unknowable during SSR, so any
 *  theme-dependent render must wait for this or it will mismatch on hydration.
 *  useSyncExternalStore is the right primitive here — no effect, no setState. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
