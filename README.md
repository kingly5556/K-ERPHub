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

On first run `src/config/users.json` (gitignored) is created automatically from `src/config/users.example.json`. It seeds five demo users, one per role: `demo.purchasing`, `demo.manager`, `demo.warehouse`, `demo.accountant` and `demo.admin`, all with password `Demo@2026`. Set `NEXT_PUBLIC_DEMO_PASSWORD=Demo@2026` to show one-click demo login buttons. To change the password, run `node scripts/hash-password.mjs "<new password>"`, paste the hash into `users.example.json`, and delete your local `users.json` so it is recreated. **Replace this placeholder user store with a real identity provider before production use.**

Open `http://localhost:3000` — it redirects to `http://localhost:3000/erphub` (and to `/erphub/login` if you're not signed in).

## Deploying

In production each module URL comes from an env var named `MODULE_<KEY>_URL` (for example `MODULE_STOCK_URL`, `MODULE_ACCOUNTING_URL`). It overrides the localhost URL in `modules.json`. The proxy waits up to 90 s for a sleeping free-tier backend, then shows a "waking up" page (for page loads) or returns 502/504 JSON (for API calls). `POST /api/warmup`, called by the login page, pings every module's `/health` in the background so backends start waking before the visitor opens a module. `vercel.json` pins functions to `sin1` (Singapore), next to the backends and databases.

## Adding a new ERP module

1. Add an entry to `src/config/modules.json`: `{ key, name, icon, targetUrl, roles? }`.
2. Add `key` to the relevant users' `allowedModules` in `src/config/users.json` (or your real user store).
3. The module becomes reachable at `/erp/{key}/...` immediately — no other wiring needed.
