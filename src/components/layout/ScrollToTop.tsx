import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router keeps the window scroll offset across client-side navigation,
 * so a scrolled page would hand its position to the next route. Reset it on
 * every pathname change so each page opens at the top.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    // The dashboard content lives inside a scrollable inset in some layouts;
    // reset it too so navigating never carries a previous scroll position.
    const inset = document.querySelector<HTMLElement>(
      '[data-slot="sidebar-inset"]',
    );
    if (inset) {
      inset.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
