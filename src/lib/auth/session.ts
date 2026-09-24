import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { verifySessionToken, type SessionPayload } from "./jwt";

export const SESSION_COOKIE = "k_erp_token";

/** For use in Server Components / Route Handlers (reads via next/headers). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** For use in Proxy / Route Handlers that receive a NextRequest directly. */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<{ token: string; payload: SessionPayload } | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  return payload ? { token, payload } : null;
}
