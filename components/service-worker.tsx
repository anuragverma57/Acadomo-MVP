"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only.
 *
 * Kill switch: set NEXT_PUBLIC_DISABLE_SW=1 in Vercel and redeploy to
 * unregister the worker and wipe its caches on every client — no code change
 * needed if caching ever misbehaves in production.
 *
 * In development any existing worker is unregistered, because a stale SW serves
 * old assets and makes local changes appear not to apply.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const disabled =
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_DISABLE_SW === "1";

    if (disabled) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      // Also clear our caches so nothing stale survives the unregister.
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => {
          keys
            .filter((key) => key.startsWith("acadomo-"))
            .forEach((key) => caches.delete(key));
        });
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed", error);
      });
    };

    // Register after load so the SW stays off the critical path.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
