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
  // Lazy initialiser reads the real scroll position on mount (a restored
  // scroll position, for example) without a setState inside the effect.
  const [state, setState] = useState<ScrollState>(() => ({
    hidden: false,
    scrolled: typeof window !== "undefined" && window.scrollY > 24,
  }));

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

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
