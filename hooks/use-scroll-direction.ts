"use client";

import { useEffect, useRef, useState } from "react";

type ScrollState = { hidden: boolean; scrolled: boolean };

/**
 * Tracks scroll direction so a header can retract on the way down and return
 * immediately on the way up — the pattern that gives back vertical space on a
 * phone without hiding navigation when it is wanted.
 *
 * Guards:
 *  - a threshold, so trivial jitter does not toggle the header
 *  - never hides near the very top, where retracting looks like a flicker
 *  - rAF-batched, so the listener does not cause layout thrash
 */
export function useScrollDirection(threshold = 8): ScrollState {
  // Must match the server render exactly: there is no window on the server, so
  // reading window.scrollY in a lazy initialiser produced a different className
  // on a restored scroll position and broke hydration. Start from the server's
  // value and correct it in the effect below, after hydration completes.
  const [state, setState] = useState<ScrollState>({
    hidden: false,
    scrolled: false,
  });

  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;

      // Ignore sub-threshold movement and rubber-band overscroll.
      if (Math.abs(delta) < threshold || y < 0) {
        ticking.current = false;
        return;
      }

      setState({
        // Retract only once clear of the top, so it never flickers there.
        hidden: delta > 0 && y > 72,
        scrolled: y > 24,
      });

      lastY.current = y;
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    // Sync to the real position once mounted. Scheduling on the next frame
    // keeps this out of the synchronous commit, so it is a post-hydration
    // correction rather than a cascading render.
    const frame = requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y > 24) setState({ hidden: false, scrolled: true });
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return state;
}
