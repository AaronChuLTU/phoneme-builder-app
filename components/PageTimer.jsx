"use client";

/**
 * PageTimer
 *
 * Renders nothing. Measures how long the visitor spends on each page and
 * reports it to /api/metrics/page-view, which feeds "average time on page"
 * on the dashboard.
 *
 * Only visible time counts: when the tab is hidden the clock stops, and
 * restarts when the tab comes back. Otherwise a tab left in the background
 * all afternoon would record hours of "reading".
 *
 * Reports go out with navigator.sendBeacon, which the browser guarantees to
 * send even while the page is unloading — a normal fetch() fired on close is
 * often cancelled before it leaves.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const ENDPOINT = "/api/metrics/page-view";

function send(path, durationMs) {
  if (durationMs < 500) return;
  const body = JSON.stringify({ path, durationMs: Math.round(durationMs) });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      ENDPOINT,
      new Blob([body], { type: "application/json" })
    );
  } else {
    fetch(ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  }
}

/** Report the time on the current page so far, then stop the clock. */
function flush(pathRef, startRef) {
  if (pathRef.current && startRef.current !== null) {
    send(pathRef.current, Date.now() - startRef.current);
  }
  startRef.current = null;
}

export default function PageTimer() {
  const pathname = usePathname();
  const pathRef = useRef(null);
  const startRef = useRef(null);

  // Route change (and first mount): report the previous page, start timing
  // the new one.
  useEffect(() => {
    flush(pathRef, startRef);
    pathRef.current = pathname;
    startRef.current =
      document.visibilityState === "visible" ? Date.now() : null;
  }, [pathname]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush(pathRef, startRef);
      } else {
        startRef.current = Date.now();
      }
    }
    function onPageHide() {
      flush(pathRef, startRef);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
