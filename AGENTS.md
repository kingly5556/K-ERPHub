<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repo shape: Modular ERP Hub (path-based routing)

This repo (`K-ERPHub`) **is ERPHUB itself** — the auth hub + reverse-proxy gateway for a suite of separate ERP modules, each living in its own repo. Full request flow and the JWT contract are documented in `README.md` — read that before touching auth, routing, or `src/config/modules.json`. The short version, so nothing here drifts from what a module repo (e.g. `Stock-Purchase-Backend` / `Stock-Purchase-Frontend`, cloned as sibling folders next to this one) expects:

- **One login, many modules.** A user logs in once at `/erphub`, gets an `httpOnly` JWT cookie (`k_erp_token`), and every module lives at `/erp/{key}/...`. This app proxies each request to the module's real backend (`targetUrl` in `src/config/modules.json`), injecting `Authorization: Bearer <jwt>` — see `src/app/erp/[module]/[[...path]]/route.ts`.
- **Concrete example flow:** user logs in at `/erphub` → clicks the "Stock & Purchase Order" tile → browser hits `/erp/stock/...` → `getSessionFromRequest` reads the `k_erp_token` cookie, checks the module's `roles` if any, then re-attaches that same JWT as `Authorization: Bearer <jwt>` when forwarding to the stock module's `targetUrl`. The user never sees a second login.
- **A module never re-implements login.** It only needs to verify the JWT it receives (same `JWT_SECRET`, HS256) and read `{ sub, username, roles, allowedModules }` from the payload. It must not call back to this app, and must not build its own auth/session system — that responsibility stays here.
- **Registering a new module** is two edits here: add it to `src/config/modules.json` (`key`, `name`, `icon`, `targetUrl`, optional `roles`), and add that `key` to the relevant users' `allowedModules` in `src/config/users.json` (or the real user store, once one exists). Nothing else needs wiring.
- Treat `src/config/users.json`'s file-based store as a demo placeholder, not a pattern for a module's own data layer. `users.json` is **gitignored** (it holds password hashes); `users.example.json` is the committed template and `scripts/ensure-users.mjs` copies it into place before `dev`/`build`/`start` if `users.json` is missing.
