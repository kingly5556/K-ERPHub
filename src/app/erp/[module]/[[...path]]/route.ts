import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getModule } from "@/lib/modules/registry";

type RouteParams = { params: Promise<{ module: string; path?: string[] }> };

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

  const upstreamResponse = await fetch(targetUrl, init);

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
