# VEGA API — Auth & Key Issuance Requirements (for the api.vega.chat backend AI)

## Context

GetOffice is an Electron desktop suite (Docs / Sheets / Slides + shell). Today it
authenticates against `www.genspark.ai` and we want to move that identity to
`api.vega.chat`, which runs **better-auth**.

### What exists today (to be replaced)

The current client flow lives in `packages/ai-search/src/getoffice-auth.ts`:

1. `POST {base}/api/office_addin_auth/device_code?app_type=genoffice`
   → `{ device_code, auth_url, expires_in, poll_interval }`
2. The app opens `auth_url` in the system browser; the user approves.
3. Poll `GET {base}/api/office_addin_auth/token?code={device_code}` every
   `poll_interval` s until `{ status: 'approved', access_token }` (30-day Bearer).
   `status: 'pending'` keeps polling; anything else aborts as `expired`.
4. `POST {base}/api/office_addin_auth/session` with `Authorization: Bearer`
   → session cookie via `Set-Cookie`.
5. `POST {base}/api/api_tokens/create` (Cookie auth) with
   `{ key_name: 'genoffice' }` → `{ data: { token, key_id } }`.
6. Stored locally in `~/.getoffice/auth.json`:
   `{ api_key, key_id, access_token }` (mode 0600).
7. Logout: rebuild the session from `access_token`, then
   `POST {base}/api/api_tokens/revoke { key_id }`, then delete the local file.
8. Account info for the UI comes from `gsk login-info` →
   `{ email, plan, credit_balance }`; the balance is shown in the Settings
   account block.

VEGA is already wired in as an OpenRouter-compatible BYOK gateway:
`https://api.vega.chat/api/v1` with `sk-apivega-...` keys (`VEGA_BASE_URL` in
`packages/ai-provider/src/media.ts`). Users currently paste a key manually —
the goal of this work is to replace that with a one-click sign-in that mints
the key automatically.

### Constraints on our side

- Requests originate from an Electron **main process** (Node/Chromium
  `net.fetch`), not a browser tab. Cloudflare bot-challenges the Genspark
  endpoints for non-browser clients, so we call through Chromium's network
  stack and read `Set-Cookie` via `getSetCookie()`. If api.vega.chat sits
  behind a similar WAF, tell us — the same workaround applies, but we need to
  know which endpoints are challenged.
- Desktop app: **no redirect URI, no client secret**. Only flows that work
  without a local HTTP listener are acceptable (device authorization grant,
  or the poll-based equivalent above).
- The app may sit behind HTTP proxies; we handle proxy failover ourselves.
- All traffic by the issued key is billed to the account's deposit. The key
  name/metadata `genoffice` must land in billing attribution the same way
  Genspark's `key_name` → `billing_tag` does.

## Requirements

### R1. Device authorization (better-auth)

Expose the better-auth `deviceAuthorization` plugin endpoints (RFC 8628), or
an equivalent custom flow, under the auth base path (e.g.
`https://api.vega.chat/api/auth`):

- `POST /api/auth/device/code` — accepts `{ client_id: 'genoffice', scope? }`;
  returns `device_code`, `user_code`, `verification_uri`,
  `verification_uri_complete`, `expires_in`, `interval`.
- `POST /api/auth/device/token` — accepts
  `{ device_code, client_id, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }`;
  returns `authorization_pending` until the user approves, then a session
  token (better-auth session or JWT).
- A public verification page (`verification_uri`) where a signed-in VEGA user
  enters/confirms `user_code` and approves the `genoffice` client. If the
  user is not signed in, the page must lead them through sign-in and return
  to the approval step.

Register `genoffice` as an allowed client (client_id whitelist /
`validateClient`) so the flow can't be initiated by arbitrary clients.

### R2. Automatic issuance of exactly one API key

After device approval the app must obtain **one** `sk-apivega-...` key without
any manual dashboard step. Either shape is acceptable — pick what fits
better-auth's `apiKey` plugin best:

- **Option A (preferred):** an endpoint such as
  `POST /api/auth/api-keys/create` (or `POST /api/v1/keys/genoffice`)
  authenticated by the device-flow session token, body
  `{ name: 'genoffice' }`, returning `{ id, key }` **once** — the plaintext
  key is never retrievable again.
- **Option B:** the device-token response itself returns a freshly minted key
  alongside the session token.

Hard requirements either way:

- **Idempotent / single-key invariant.** Re-running login revokes the
  previous `genoffice` key server-side and issues a new one. At most one
  active key tagged `genoffice` exists per account. Alternatively expose
  `POST .../revoke` so the client can revoke the superseded `key_id` itself
  (we already do this best-effort after re-login).
- The key must work as `Authorization: Bearer sk-apivega-...` on
  `/api/v1/chat/completions`, `/api/v1/images`, `/api/v1/models` — the same
  surface a manually created BYOK key gets.
- `POST .../api-keys/revoke` (or delete) for sign-out: invalidate the key
  server-side, then we drop the local file.

### R3. Deposit / account endpoint

A lightweight authenticated endpoint to replace `gsk login-info`, called with
the issued API key (preferred — no session needed) or the session token:

```
GET /api/v1/account        (or GET /api/v1/credits — see Q8)
→ {
    email: string,
    plan?: string,
    balance: number,        // current deposit
    currency?: string,      // 'USD' | credits — specify the unit
    totalUsage?: number,    // lifetime spend, if available
    limit?: number | null   // spending cap, if available
  }
```

This drives two UI surfaces: the account status block (email + balance, shown
as `creditBalance` today) and low-balance warnings. It must respond fast
(<1 s) and be cheap to poll — we call it on settings open and after login.

### R4. Error semantics

Document the exact response for each failure mode we branch on:

- device poll: `authorization_pending`, `slow_down`, `expired_token`,
  `access_denied` — HTTP status + body shape for each
- key create/revoke: 401 vs 403 vs 429
- account/balance: 401 for an invalid/revoked key (this is also our
  "key was revoked server-side" signal — the app must distinguish it from a
  network error)
- zero/negative deposit: does the chat endpoint return 402/403 with a
  specific error code we can surface as "top up your deposit"?

## Acceptance criteria

1. From a clean machine: clicking "Sign in" in GetOffice opens the VEGA
   verification page; after approval the app holds a working
   `sk-apivega-...` key with zero manual steps.
2. `GET /api/v1/chat/completions` with that key succeeds; the call is billed
   against the account deposit and attributed to `genoffice`.
3. Signing in a second time invalidates the first key (verified by a 401 on
   the old key) and leaves exactly one active `genoffice` key.
4. Sign-out revokes the key server-side.
5. `GET {account endpoint}` returns the deposit; the Settings UI shows it.
6. All of the above works through `net.fetch` (Chromium) and plain Node
   `fetch` — no browser cookie jar, no CORS assumptions.

## Open questions for the VEGA side

**Auth flow**

1. Which better-auth variant is deployed — the session-based
   `deviceAuthorization` plugin, or `oauthDeviceAuthorization` under
   `@better-auth/oauth-provider`? The response shapes differ; we need the
   exact field names (`verification_uri` vs `verification_url`,
   `interval` vs `poll_interval`, session token vs OAuth access token).
2. What is the mounted base path — `/api/auth`? Full URLs for the three
   endpoints, please.
3. Is `client_id` registration required? What value should we send for
   `genoffice`, and do you need a fixed client list (`validateClient`)?
4. What does the device-token response return on approval — a better-auth
   session token (cookie/`set-auth-token`), a JWT, or an OAuth access token?
   What TTL, and is there a refresh path or must the user re-authorize?
5. Does the verification page exist already, or does it need to be built? Can
   `verification_uri_complete` carry `user_code` pre-filled?
6. Is there a staging environment (`api-staging.vega.chat`?) and a test
   account we can run the flow against?

**API keys**

7. Is the `apiKey` plugin enabled? If yes, what is its creation endpoint
   (`/api/auth/api-keys/create`?) and can it be called with a session
   token header instead of a cookie? If no, you'll need a custom
   create/revoke endpoint — confirm which you prefer.
8. Can key creation be constrained to a single active `genoffice` key
   server-side (auto-revoke on re-issue), or should the client list keys,
   revoke prior ones, then create? If listing is supported, what's the
   endpoint and filter field (`name`? `metadata.app`?)?
9. Key format confirmation: `sk-apivega-...`? Fixed prefix we can validate
   client-side?
10. Can the key carry a `name`/`metadata` tag (`genoffice`) that shows up in
    your billing/usage attribution? Where does it appear (dashboard, usage
    exports)?

**Deposit**

11. Is there already a balance endpoint (e.g. OpenRouter-style
    `GET /api/v1/auth/key` returning `{ limit, usage }`, or
    `GET /api/v1/credits`)? If not, what endpoint will you add, and what are
    the exact field names and units (USD cents? credits?)?
12. Can the account endpoint be authorized with the API key itself, or does
    it require the session token? API key is strongly preferred — we drop
    the session token after key issuance today and would rather not persist it.
13. What error do paid endpoints return at zero deposit — HTTP code and
    machine-readable error code?
14. Is there a rate limit on the balance endpoint? How often may we poll it
    (on settings open only, or periodic refresh)?
15. Is email/plan returned by the same endpoint, or is there a separate
    `GET /api/auth/get-session`-style route? We display the email in the
    account block.

**Infrastructure**

16. Is api.vega.chat behind Cloudflare or another WAF that bot-challenges
    non-browser `User-Agent`s? Which endpoints, and is there an exemption we
    can request (API paths usually skip challenges)?
17. Any required headers beyond `Authorization` (e.g. `X-Client`,
    `HTTP-Referer`/`X-Title` like OpenRouter uses for attribution)?
18. CORS: is the device-code endpoint callable from a non-browser client
    (no Origin header), or does it require one?

## What we will change once you answer

- `packages/ai-search/src/getoffice-auth.ts` → VEGA device flow + key
  issuance (same exported surface: `startGetofficeLogin`,
  `getofficeApiKey`, `getofficeLogout`, `getofficeLoginInFlight`).
- `gskLoginInfo` / account-status IPC → the new balance endpoint.
- Settings UI: replace the manual `sk-apivega-...` paste field with a
  "Sign in to VEGA" button + deposit display (keeping manual paste as a
  BYOK fallback if you want it — tell us).

---

## VEGA-side answers (implemented 2026-09-16)

Everything below is implemented and verified end-to-end against the local
database (`scripts/test-device-flow.ts` — 12/12 checks green).

**Auth flow**

1. Session-based `deviceAuthorization` plugin (better-auth 1.7.3), not the
   OAuth-provider variant. On approval `POST /device/token` returns
   `{ access_token, token_type: "Bearer", expires_in, scope }` where
   `access_token` is a better-auth **session token** (TTL = session TTL,
   90 days). No refresh token — if it ever expires, re-run the device flow
   (the issued API key is unaffected and keeps working).
2. Base path: `https://api.vega.chat/api/auth`.
   - `POST /api/auth/device/code` — `{ client_id: "genoffice", scope? }` →
     `{ device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval }`
   - `POST /api/auth/device/token` —
     `{ grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code, client_id }`
   - Verification page: `verification_uri` = `https://api.vega.chat/device`;
     `verification_uri_complete` carries `?user_code=` pre-filled. If the
     user is signed out the page redirects through `/login` and returns.
3. `client_id` is whitelist-validated server-side — send literally
   `"genoffice"`. Other values get `400 { error: "invalid_client" }`.
   (Verified live 2026-09-17: `"getoffice"` is rejected — the whitelist was
   NOT renamed with the product rebrand; the client must keep sending
   `"genoffice"` until the backend registers the new value.)
4. See (1): session token, 90-day TTL. The app should **drop it after key
   issuance** — only the `sk-apivega-...` key is needed afterwards.
5. The page is built at `/device` (code entry + approve/deny, sign-in
   redirect included).
6. No staging env — test against production with a real account.

**API keys**

7. The better-auth `apiKey` plugin is not used — VEGA has its own key
   store. Dedicated endpoint:
   `POST /api/v1/keys/genoffice` — auth: `Authorization: Bearer <access_token>`
   (the device-flow session token; the `bearer` plugin accepts it without
   cookies). Body `{ "name": "genoffice" }` (optional, defaults to
   `genoffice`). Returns `{ "id": "<key_id>", "key": "sk-apivega-..." }` —
   plaintext shown exactly once. (`/api/v1/keys/getoffice` 404s on prod.)
8. Single-key invariant is enforced server-side: every `POST` deletes all
   previous keys with the same `name` for that account before inserting the
   new one. Re-login ⇒ old key returns 401 immediately.
   Revocation for sign-out: `POST /api/v1/keys/genoffice/revoke` —
   send the **API key itself** as Bearer (self-revocation; needs no stored
   session) or the session token (revokes all keys with that name).
9. Key format: `sk-apivega-<48 lowercase hex>` — safe to validate
   client-side with `^sk-apivega-[0-9a-f]{48}$`.
10. `usage_logs.api_key_id` is written on every billed request, so the
    `genoffice` name lands in billing attribution per-key. Dashboard
    (api.vega.chat/keys) shows the key with its name and usage.

**Deposit**

11. New endpoint `GET /api/v1/account`, authenticated with the issued
    `sk-apivega-...` key (no session needed):
    ```json
    {
      "email": "user@example.com",
      "name": "...",
      "balance": 12.34, // deposit, USD
      "balanceRub": 1020.55, // same deposit in RUB at current rate
      "currency": "USD",
      "totalUsage": 45.67, // lifetime spend, USD
      "limit": null, // key spend limit (USD) or null
      "keyName": "genoffice"
    }
    ```
12. API key auth — exactly as preferred; drop the session token.
13. Zero/insufficient deposit → `402 { error: { code: 402, message:
"Insufficient balance..." } }` on all paid endpoints (chat, images,
    video, etc.). Surface as "top up your deposit".
14. `/api/v1/account` is IP-rate-limited at 100 req/min — poll freely on
    settings open / after login / on low-balance checks.
15. Email is returned by `/api/v1/account` itself (see shape above). No
    plan field exists — omit it.

**Infrastructure**

16. `/api/auth/*` POST endpoints accept requests **without** `Origin` and
    without `Cookie` — better-auth skips the origin check when no cookie
    header is present, so `net.fetch` and plain Node `fetch` work as-is.
    `/device/token` polling is exempt from the IP rate limiter.
17. No required headers beyond `Authorization`. `HTTP-Referer`/`X-Title`
    are supported OpenRouter-style for attribution — send
    `X-Title: GetOffice` if you want the app tagged in stats.
18. CORS is `Access-Control-Allow-Origin: *` on all `/api/v1/*` endpoints —
    callable from any client, no Origin needed.

**Client mapping (Genspark → VEGA)**

| Genspark                                      | VEGA                                                    |
| --------------------------------------------- | ------------------------------------------------------- |
| `POST /api/office_addin_auth/device_code`     | `POST /api/auth/device/code`                            |
| `GET /api/office_addin_auth/token?code=` poll | `POST /api/auth/device/token`                           |
| `POST /api/office_addin_auth/session`         | not needed — `access_token` is already the session      |
| `POST /api/api_tokens/create`                 | `POST /api/v1/keys/genoffice` (Bearer = access_token)   |
| `POST /api/api_tokens/revoke`                 | `POST /api/v1/keys/genoffice/revoke` (Bearer = API key) |
| `gsk login-info`                              | `GET /api/v1/account` (Bearer = API key)                |

Note the polling contract change: the token endpoint answers
`400 { error: "authorization_pending" }` / `slow_down` / `expired_token` /
`access_denied` (RFC 8628 shape), and you must respect the returned
`interval` (5 s) — polling faster yields `slow_down`.
