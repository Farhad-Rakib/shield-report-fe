# Security Review — shield-report-fe

Findings from a manual code review + `npm audit`. None of these have been fixed yet — this is a record of what was found.

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | High | `axios` (direct dependency) — multiple advisories: SSRF, prototype pollution, header injection | Not fixed |
| 2 | High | `react-router` / `react-router-dom` (direct dependency) — open redirect, XSS, DoS advisories | Not fixed |
| 3 | Medium | Access + refresh JWT stored in `localStorage`, not httpOnly cookies | Not fixed |
| 4 | Moderate–High | 21 more vulnerable packages, mostly dev/build tooling (`vite`, `rollup`, `esbuild`, `glob`, etc.) | Not fixed |
| 5 | Info | Unused `@supabase/supabase-js` dependency adds unnecessary attack surface | Not fixed |
| 6 | Info | "Add User" form calls a backend endpoint that trusts a client-supplied `roles` field | See `shield-report-be/SECURITY.md` #1 |

---

## 1. High — `axios` vulnerable (direct dependency, used for every API call)
**Where:** `package.json` → `axios@^1.13.6`, used in `src/core/api/base.repository.ts` (the single Axios instance every `*.api.ts` file goes through).

`npm audit` reports the installed range (1.0.0–1.15.2) is affected by ~20 advisories including SSRF via `NO_PROXY` bypass, prototype pollution leading to auth bypass/response tampering, and CRLF injection in multipart bodies. Full list: `npm audit` or [advisory index](https://github.com/advisories?query=axios).

**Fix:** `npm audit fix` resolves this without `--force` (semver-compatible bump) — confirmed via `npm audit fix --dry-run`.

## 2. High — `react-router` / `react-router-dom` vulnerable (direct dependency)
**Where:** `package.json` → `react-router-dom@^7.13.1`, used throughout `src/app/router/` and every page.

Installed range (7.0.0–7.15.0) is affected by an open redirect (protocol-relative `//` URLs), stored XSS via unescaped `Location` header in prerendered redirects, and a DoS via unbounded path expansion. This app doesn't currently use SSR/prerendering or the RSC/`unstable` redirect APIs the worst of these target, but the open-redirect and DoS advisories apply to standard client-side routing too.

**Fix:** `npm audit fix` resolves this without `--force`.

## 3. Medium — JWT access + refresh tokens stored in `localStorage`
**Where:** `src/core/config/app.config.ts` (`auth.storageType: 'localStorage'`, `auth.tokenKey: 'admin_token'`), `src/features/auth/store/auth.store.ts` (Zustand `persist` writes both tokens to that key), `src/core/api/base.repository.ts` (`getToken`/`getRefreshToken` read from the same persisted JSON).

`localStorage` is readable by any JavaScript running on the page. If an XSS vector ever exists (e.g. via a vulnerable dependency, a future feature that renders unsanitized HTML/markdown, etc.), an attacker's script can read this key and exfiltrate **both** the access token and the 7-day refresh token (`Jwt:RefreshTokenExpiryDays` on the backend) — full, long-lived account takeover, not just a single request's worth of access. This is a known tradeoff in SPA-with-Bearer-token architectures, not unique to this codebase, but worth flagging explicitly since there's currently no compensating control (no CSP configured either — see below).

**Fix options (pick based on how much backend change is acceptable):**
- Move the refresh token to an httpOnly, `Secure`, `SameSite=Strict` cookie set by the backend on login/refresh, and keep only the short-lived access token in memory (not persisted storage at all).
- At minimum, add a Content-Security-Policy header (currently none configured anywhere in this project) to reduce the chance of script injection in the first place.

## 4. Moderate–High — Remaining 21 vulnerable packages (mostly dev/build tooling)
**Where:** `npm audit` (23 total findings; 2 covered above).

The rest are devDependencies or transitive build-tool packages: `vite`/`esbuild`/`rollup` (dev server + bundler — the `esbuild` advisory lets any website read responses from a running dev server, relevant only while `npm run dev` is active), `glob`/`minimatch`/`picomatch`/`brace-expansion` (ReDoS, via `@typescript-eslint`/`eslint`), `cross-spawn` (ReDoS), `js-yaml`/`ajv`/`@eslint/plugin-kit` (eslint config parsing), `nanoid`, `flatted`, `follow-redirects`, `form-data`, `ws`, `yaml`, `@babel/core`, `@babel/helpers`. None of these ship in the production bundle (`dist/`) — they're build/lint-time only — so runtime exposure is low, but they're still worth clearing.

**Fix:** `npm audit fix` resolves **all 23** findings (this one and #1/#2 included) without `--force` — verified via dry run, no breaking semver bumps required.

## 5. Info — Unused `@supabase/supabase-js` dependency
**Where:** `package.json`. Confirmed via `grep -rl supabase src/` — zero references in the codebase.

Not exploited by anything today, but it's a sizeable dependency (with its own transitive tree) shipping in `node_modules`/potentially the bundle for no functional reason, which is unnecessary attack surface and bundle weight.

**Fix:** Remove it from `package.json` unless there's a planned use.

## 6. Info — "Add User" form sends a client-chosen `roles` array to a backend that trusts it
**Where:** `src/features/users/pages/UsersPage.tsx` — `AuthRegisterApi.register(dto: { fullName, email, password, roles: string[] })`, posting to `/Auth/register`.

The real vulnerability is server-side (`shield-report-be/SECURITY.md` finding #1 — the registration endpoint is anonymous and doesn't validate the caller is allowed to grant the roles it's given). This FE code isn't itself adding the risk — it's a legitimate admin-facing "create user with roles" form — but it's worth knowing this is the call site that happens to exercise the vulnerable backend endpoint, and that the role list it shows (whatever `/roles` returns) currently includes every role, including SuperAdmin, with no FE-side restriction either.

**Fix:** No FE-only fix closes this — fix the backend endpoint first (see linked finding), then optionally also restrict which roles this form's dropdown offers based on the caller's own permissions.

---

## Scan commands used
```bash
npm audit                 # human-readable report
npm audit fix --dry-run   # confirms all 23 are fixable without --force
```
