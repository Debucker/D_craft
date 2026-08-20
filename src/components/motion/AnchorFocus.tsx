'use client';

import { useEffect } from 'react';

/**
 * ANCHOR FOCUS
 * -----------------------------------------------------------------------
 * This used to be a Lenis smooth-scroll wrapper. Lenis was removed because it
 * was the single largest source of input latency on the page: it intercepted
 * the wheel and animated `scrollTop` over 1.05s with an exponential ease, so
 * the page always trailed the user's finger by roughly a second. Native
 * scrolling responds on the same frame as the input and gets the OS's own
 * momentum curve for free, which is what "fluid" actually means here.
 *
 * The scrolling itself is now entirely the browser's: `scroll-behavior: smooth`
 * in globals.css handles anchor jumps, `scroll-margin-top` keeps sections clear
 * of the fixed nav, and nothing runs per frame.
 *
 * The one thing the browser does *not* do reliably on an in-page anchor is move
 * keyboard focus to the destination, so screen-reader and keyboard users end up
 * scrolled to a section while their focus is still back on the nav. That is all
 * this component does now — and it never calls preventDefault, so the browser
 * keeps ownership of the scroll and the URL.
 */
export function AnchorFocus() {
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('#') || href === '#') return;

      const target = document.getElementById(href.slice(1));
      if (!target) return;

      // preventScroll, because the browser is already handling the scroll —
      // focusing without it would cause a second, instant jump.
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return null;
}
