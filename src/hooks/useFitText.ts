import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scale text so it fills its container without overflowing.
 *
 * A fixed font size cannot serve both "Today I choose to show up" and twelve
 * lines of affirmations — one looks lost on the screen, the other spills off it.
 * So measure and binary-search the largest size that still fits.
 *
 * Binary search rather than a decrementing loop: text reflow makes each
 * measurement a forced layout, and stepping 64px down to 15px one pixel at a
 * time is 50 reflows on a phone. This converges in about 6.
 */

interface Options {
  /** Largest size to consider, in px. Short content will land here. */
  max?: number;
  /** Below this, shrinking further hurts more than scrolling does. */
  min?: number;
  /** Re-run when this changes (e.g. the text itself). */
  deps?: unknown[];
}

export function useFitText<T extends HTMLElement = HTMLDivElement>({
  max = 44,
  min = 15,
  deps = [],
}: Options = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<T | null>(null);
  const [fontSize, setFontSize] = useState(max);
  const [measured, setMeasured] = useState(false);

  const fit = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const available = container.clientHeight;
    if (available <= 0) return;

    const fits = (size: number): boolean => {
      content.style.fontSize = `${size}px`;
      // scrollHeight is only meaningful after the browser has reflowed, which
      // reading it here forces.
      return content.scrollHeight <= available;
    };

    // Common case: it already fits at full size, so skip the search entirely.
    if (fits(max)) {
      setFontSize(max);
      setMeasured(true);
      return;
    }

    let lo = min;
    let hi = max;
    let best = min;

    for (let i = 0; i < 8 && lo <= hi; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) {
        best = mid;
        lo = mid + 0.5;
      } else {
        hi = mid - 0.5;
      }
    }

    content.style.fontSize = `${best}px`;
    setFontSize(best);
    setMeasured(true);
  }, [max, min]);

  useEffect(() => {
    // Wait for fonts before measuring, or the first pass measures fallback
    // metrics and settles on a size that is wrong once the real font loads.
    let cancelled = false;
    const run = () => {
      if (!cancelled) fit();
    };

    run();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(run);

    const observer = new ResizeObserver(run);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('orientationchange', run);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('orientationchange', run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, ...deps]);

  return { containerRef, contentRef, fontSize, measured };
}
