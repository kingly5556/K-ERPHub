import { after, NextResponse } from "next/server";
import { getAllModules } from "@/lib/modules/registry";

// Free-tier backends sleep when idle. The login page calls this once on load so the
// module backends start waking up while the visitor is still choosing a demo role.
// Public on purpose (not matched by proxy.ts): it only pings /health.
export const maxDuration = 90;

const THROTTLE_MS = 60_000;
let lastWarm = 0;

export async function POST() {
  const now = Date.now();
  if (now - lastWarm < THROTTLE_MS) {
    return NextResponse.json({ skipped: true }, { status: 202 });
  }
  lastWarm = now;

  const urls = getAllModules().map((m) =>
    new URL("health", m.targetUrl.endsWith("/") ? m.targetUrl : `${m.targetUrl}/`).toString()
  );
  after(async () => {
    await Promise.allSettled(
      urls.map((url) => fetch(url, { cache: "no-store", signal: AbortSignal.timeout(80_000) }))
    );
  });
  return NextResponse.json({ warming: urls.length }, { status: 202 });
}
