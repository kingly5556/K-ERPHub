import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getModule } from "@/lib/modules/registry";

type RouteParams = { params: Promise<{ module: string; path?: string[] }> };

// Free-tier module backends (Render) sleep when idle and need ~30-60s to wake up.
// Vercel lets this function run for up to maxDuration seconds; the upstream call
// gives up a little earlier so we can still answer with a helpful response.
export const maxDuration = 120;
const UPSTREAM_TIMEOUT_MS = 90_000;

function wakingPage(moduleName: string) {
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="15"><title>กำลังปลุกโมดูล…</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#0f172a">
<div style="max-width:32rem;text-align:center;padding:1.5rem">
<h1 style="font-size:1.4rem">กำลังปลุกโมดูล ${moduleName}…</h1>
<p>เดโมนี้ใช้ free tier ระบบที่ไม่มีคนใช้จะหลับ ครั้งแรกอาจใช้เวลาประมาณ 1 นาที หน้านี้จะลองใหม่อัตโนมัติทุก 15 วินาที</p>
<p style="color:#64748b;font-size:.9rem">Waking up the ${moduleName} module (free hosting). This page retries every 15 seconds.</p>
</div></body></html>`;
}

const HOP_BY_HOP_REQUEST_HEADERS = ["host", "cookie", "connection", "content-length"];
const HOP_BY_HOP_RESPONSE_HEADERS = ["content-encoding", "content-length", "connection"];

async function handleProxy(request: NextRequest, { params }: RouteParams) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { module: moduleKey, path } = await params;
  const erpModule = getModule(moduleKey);
  if (!erpModule) {
    return NextResponse.json(
      { error: `Unknown ERP module "${moduleKey}"` },
      { status: 404 }
    );
  }

  if (!session.payload.allowedModules.includes(erpModule.key)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    erpModule.roles &&
    !erpModule.roles.some((role) => session.payload.roles.includes(role))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const base = erpModule.targetUrl.endsWith("/")
    ? erpModule.targetUrl
    : `${erpModule.targetUrl}/`;
  const subPath = (path ?? []).map(encodeURIComponent).join("/");
  const targetUrl = new URL(subPath, base);
  targetUrl.search = request.nextUrl.search;

  const forwardHeaders = new Headers(request.headers);
  for (const header of HOP_BY_HOP_REQUEST_HEADERS) {
    forwardHeaders.delete(header);
  }
  forwardHeaders.set("Authorization", `Bearer ${session.token}`);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: forwardHeaders,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      ...init,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    console.error(`[proxy] module "${erpModule.key}" ${timedOut ? "timed out" : "unreachable"}`, err);
    const wantsHtml =
      request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
    if (wantsHtml) {
      return new NextResponse(wakingPage(erpModule.name), {
        status: 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "retry-after": "15",
          "cache-control": "no-store",
        },
      });
    }
    return NextResponse.json(
      {
        error: timedOut
          ? `Module "${erpModule.key}" timed out (it may be waking up, try again shortly)`
          : `Module "${erpModule.key}" is unreachable`,
      },
      { status: timedOut ? 504 : 502, headers: { "retry-after": "15" } }
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const header of HOP_BY_HOP_RESPONSE_HEADERS) {
    responseHeaders.delete(header);
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export {
  handleProxy as GET,
  handleProxy as POST,
  handleProxy as PUT,
  handleProxy as PATCH,
  handleProxy as DELETE,
};
