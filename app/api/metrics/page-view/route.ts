/**
 * app/api/metrics/page-view/route.ts  ->  POST /api/metrics/page-view
 *
 * Receives time-on-page reports from the PageTimer component. Sent with
 * navigator.sendBeacon, which fires as the page closes and never waits for
 * a reply, so this always answers 204 with no body.
 *
 * Invalid reports are dropped silently rather than answered with a 400:
 * the browser has already moved on and cannot act on an error.
 */

import { parsePageView, recordPageView } from "@/lib/metrics";

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Malformed body — fall through and drop it.
  }

  const view = parsePageView(body);
  if (view) await recordPageView(view);

  return new Response(null, { status: 204 });
}
