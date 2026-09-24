# ERPHUB

ERPHUB is the central auth hub and gateway for a suite of separate ERP systems ("modules"). It is a **path-based, modular ERP** architecture:

- Users log in once at ERPHUB and receive a stateless JWT (stored as an `httpOnly` cookie).
- Each ERP module is a separate backend service, registered in `src/config/modules.json`.
- ERPHUB acts as a **reverse proxy**: a request to `/erp/{module}/...` is forwarded to that module's real backend (`targetUrl` + sub-path), with `Authorization: Bearer <jwt>` attached. The browser never sees the module's real URL/port — everything stays under the ERPHUB domain.

## Request flow

1. `src/proxy.ts` (Next.js 16's `proxy` convention, formerly `middleware`) guards `/erphub` and `/erp/:path*`. If the session cookie is missing/invalid, it redirects to `/erphub/login`.
2. `/` is just a redirect to `/erphub`.
3. `/erphub/login` posts credentials to `POST /api/auth/login`, which validates against `src/lib/users/store.ts` and signs a JWT via `src/lib/auth/jwt.ts`, then sets it as the `k_erp_token` cookie.
4. `/erphub` (the portal) lists the ERP modules the logged-in user is allowed to open, from `src/config/modules.json`, filtered by the user's `allowedModules`.
5. Navigating to `/erp/{module}/...` hits `src/app/erp/[module]/[[...path]]/route.ts`, which re-verifies the JWT, looks up the module's `targetUrl`, and proxies the request/response (any method, streamed body) while injecting the `Authorization` header.
6. `POST /api/auth/logout` clears the cookie.
7. Unknown routes (e.g. `/erp/typo`) and any other unmatched path render a branded 404 page (`src/app/not-found.tsx`).

## Downstream module contract

Every ERP module registered in `modules.json` must be able to verify the JWT independently (no callback to ERPHUB required):

- Share the same `JWT_SECRET` (HS256) as this app — see `.env.local.example`.
- The JWT payload is `{ sub, username, roles, allowedModules }`.
- The token arrives as `Authorization: Bearer <jwt>` on every proxied request.

If you need per-module signing keys or asymmetric verification (RS256) later, swap `src/lib/auth/jwt.ts` accordingly.

## Local development

```bash
cp .env.local.example .env.local   # if you don't already have one; a working one is included for local dev
npm install
npm run dev
```

On first run `src/config/users.json` (gitignored) is created automatically from `src/config/users.example.json`. Seeded demo user: username `admin`, password `ChangeMe123!`. **Replace this placeholder user store with a real identity provider before production use.**

Open `http://localhost:3000` — it redirects to `http://localhost:3000/erphub` (and to `/erphub/login` if you're not signed in).

A demo module (`demo`, proxied to `https://httpbin.org`) is preconfigured so you can verify the proxy end-to-end: after logging in, open the `Demo Echo Service` tile, then visit `/erp/demo/get` to see the request echoed back — including the injected `Authorization` header.

## Adding a new ERP module

1. Add an entry to `src/config/modules.json`: `{ key, name, icon, targetUrl, roles? }`.
2. Add `key` to the relevant users' `allowedModules` in `src/config/users.json` (or your real user store).
3. The module becomes reachable at `/erp/{key}/...` immediately — no other wiring needed.
