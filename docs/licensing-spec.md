# OfficeVega Corporate Licensing — Design Spec

Status: proposed · 2026-09-26 · supersedes nothing; complements `docs/vega-auth-api-spec.md` and `docs/vega-features-api-spec.md`.

## 1. Context and goal

OfficeVega is free for individuals and non-commercial/government institutions
(EULA §3.1–3.2). A paid **Corporate license** (EULA §3.4–3.6, per-seat
subscription, invoiced) unlocks the gated feature: **BYOK + local AI** — every
AI provider except built-in `vega` (third-party providers, user API keys,
custom base URLs / OpenAI-compatible endpoints, Ollama/LM Studio, Codex
bridge), including BYOK *search* providers (`serper`, `tavily`, `parallel`).

This spec defines the technical licensing scheme. Approved direction:
**license key → online activation → signed offline-verifiable token**
(air-gapped deployments are out of scope; a grace period comes from the
token's own TTL).

The legal layer already exists: `apps/shell/build/EULA.txt` and the
`ee/` directory reserved for enterprise modules under the proprietary
OfficeVega Enterprise License (open-core boundary, CODEOWNERS-enforced).

## 2. Threat model — honest scope

- The Apache-2.0 core can be rebuilt without the gate; the shipped asar can
  be patched. Client-side licensing is **deterrence + UX**, not a hard wall.
  The hard levers are the EULA (§7.1 forbids bypassing license controls),
  the trademark, and server-side enforcement of anything that calls
  api.vega.chat.
- Therefore we deliberately do **not** invest in obfuscation, asar
  self-integrity checks, or anti-debug tricks — they cost maintenance and
  stop nobody motivated. We do make bypass require a rebuild/patch (i.e. a
  clear license violation), and we keep all secrets off the client.

| Threat | Mitigation |
| --- | --- |
| Forged license token | Ed25519 signature; private key exists only on the VEGA server; public key baked into the shell build |
| Key sharing beyond seats | Server counts active activations against `seats`; N+1th activation → `seats_exceeded` |
| Copied `license.json` to another machine | Token carries `inst` (install id); a mismatch forces re-activation, which consumes a seat. A user who copies the whole `~/.officevega` dir clones one "seat" — accepted under the counter-only model |
| Clock rollback past `exp` | Token `nbf`/`exp` + persisted `lastSeenNow` floor — the token never outlives its `exp` regardless of clock |
| Revoked/expired subscription keeps working | `refresh` returns `403` → local token wiped, features relock. Longest abuse window = token TTL |
| Renderer tampering | Verification lives only in the main process; renderers receive derived flags `{plan, features[]}`, never key material |
| Secrets in repo | Private signing key never committed; public key injected at build via `OFFICEVEGA_LICENSE_PUBKEY` (same pattern as `OFFICEVEGA_UPDATE_URL`) |

## 3. Components

### 3.1 Client — `ee/licensing/` (compiles into the shell main process)

Mirrors `packages/ai-search/src/officevega-auth.ts` conventions (main-process
only, `net.fetch` with proxy failover, `~/.officevega` storage, env-dir
override for tests).

- **`install.ts`** — `installId()`: a `crypto.randomUUID()` minted on first
  run and persisted in `~/.officevega/install.json` (0600). Purely random —
  not a hardware fingerprint (privacy-friendly, survives reinstalls per
  storage, self-reported by design).
- **`verify.ts`** — `verifyToken(raw): Claims | null`. Ed25519 verify via
  `node:crypto.verify` against the baked public key; parses claims; checks
  `nbf <= now <= exp` and the persisted `lastSeenNow` floor.
- **`store.ts`** — `~/.officevega/license.json` (0600): `{key, token,
  install_id, lastSeenNow}`. Read order for fleet deployment:
  `OFFICEVEGA_LICENSE_DIR` env → `~/.officevega/` → system dir
  (`%ProgramData%\OfficeVega\license.json`, `/etc/officevega/license.json`).
  Writes only ever go to the per-user dir.
- **`activate.ts`** — activation + refresh loop: `POST
  /api/v1/licenses/activate` and `POST /api/v1/licenses/refresh` via the same
  `net.fetch`+proxy-fallback machinery as login. Refresh runs once at shell
  boot and then daily while running; failures are silent unless the token is
  past `exp`.
- **`entitlements.ts`** — `entitlementState(): {plan:'free'|'corp',
  features:string[], org?, expiresAt}` and `hasFeature('byok')`. Watches the
  store file (same `watchFile` pattern as `watchOfficeVegaApiKey`) so a
  token wiped by refresh revokes features live.
- **`ipc.ts`** — registers `license:get-state`, `license:activate(key)`,
  `license:deactivate` handlers for the shell renderer; pushes state changes
  like the auth-changed listener.

### 3.2 Gate points (all in the main process)

1. **Request dispatch** — `packages/ai-provider` gains
   `license-gate.ts`: `setProviderGate((providerId) => boolean)` (default:
   allow only the no-user-credential providers — `'vega'`, plus the
   built-in `'genspark'` account path while it still exists) +
   `assertProviderAllowed(provider)` called in `stream.ts`, `chat.ts`,
   `model-catalog.ts` before `resolveEndpoint`. Inversion of control keeps
   Apache-licensed `ai-provider` free of `ee/` imports; `ee/licensing`
   registers the real predicate at boot. The same rule applies to *search*
   providers in `packages/ai-search`: `vega` and `genspark` (built-in free
   chain) stay open; `serper`/`tavily`/`parallel` are user-keyed BYOK and
   require the feature.
2. **Settings write** — the `ai:set-settings` IPC handlers
   (`apps/*/src/main/*-main.ts` / `ai-ipc.ts`) reject persisted configs that
   name a non-`vega` provider, a non-empty third-party `apiKey`, or a custom
   `baseUrl` when `hasFeature('byok')` is false. Defense-in-depth beside
   point 1 — a tampered `ai-settings.json` still can't dispatch.
3. **UI** — renderers read `license:get-state`; `SettingsModal` renders a
   lock badge/upsell on non-VEGA provider rows instead of hiding them
   (visible upsell > invisible restriction).

### 3.3 Server — `api.vega.chat` (contract for the VEGA side)

Same conventions as the auth spec: JSON, Bearer-less for activate (the key
*is* the credential), `net.fetch`-compatible.

- `POST /api/v1/licenses/activate` `{key, install_id, app_version,
  transfer?}` → `200 {token}` or `401 invalid_key` /
  `409 seats_exceeded` / `410 license_expired`.
  - Idempotent per `install_id`: re-activating an already-activated
    `install_id` re-issues the token and consumes no extra seat — this is
    what makes **"Restore license"** (re-enter/re-submit the key) safe.
  - `transfer: true` (sent only after the user confirms a seat transfer in
    the UI on `seats_exceeded`): the server deactivates the *oldest*
    activation of that license and activates the new `install_id`. Covers
    OS reinstalls and PC replacement without a support call. Without the
    flag, `seats_exceeded` is a hard error.
- `POST /api/v1/licenses/refresh` `{install_id, token}` → `200 {token}`
  (new `iat`/`exp`) or `403 revoked` / `410 license_expired` /
  `404 install_id` (seat was transferred away → relock locally).
- `POST /api/v1/licenses/deactivate` `{key, install_id}` → `204`
  (best-effort; frees the seat for reinstalls/hardware swaps).
- Admin: a `mint-license` script/endpoint creates `{key, org, seats,
  expiresAt, features}` per invoice. Keys are `VEGA-ENT-<base32>`,
  stored server-side keyed by hash; plaintext shown once.
- Token: compact Ed25519-signed claims `{v:1, lic, org, inst, features,
  seats, iat, nbf, exp}` (JWT-EdDSA or `base64url(claims).base64url(sig)` —
  pick one; the client spec accepts either if documented).
- Seat accounting: `activations(license_id, install_id, …)`; a repeated
  `activate` with the same `install_id` is **idempotent** (re-activating the
  same machine must not eat a second seat).
- Default token TTL: 30 days; `refresh` re-issues while the subscription is
  paid. Free-tier behavior is unchanged: no license → `plan:'free'`.

## 4. Flows

**Purchase (server/ops side, out of app scope)**: the buyer pays online or
by invoice; ops mints `{key, seats, expiresAt, features}` and emails the
`VEGA-ENT-…` key. One key per purchase — a 100-seat business license is a
single key with `seats: 100`, distributed to employees as text.

**Activation**: Settings → Corporate → paste `VEGA-ENT-…` → "Активировать"
→ main calls `activate` → stores `{key, token, install_id}` → entitlements
flip → UI unlocks. Errors map to messages: invalid key / all seats used /
expired / network. On `seats_exceeded` the UI offers "Перенести лицензию
на это устройство" → retries with `transfer: true`.

**Restore**: "Восстановить лицензию" re-submits the stored key through
`activate` — restores a corrupted/deleted token file, recovers from a
missed refresh window, and (via `transfer` on `seats_exceeded`) rebinds
the seat after an OS reinstall or hardware swap. Also runs automatically
at boot when `license.json` holds a key but no valid token.

**Runtime**: every AI request passes `assertProviderAllowed(provider)`;
`plan:'corp'` allows all providers, `free` allows `vega` only (and VEGA-only
search). On boot and daily, `refresh` revalidates; `403` wipes the store and
broadcasts `plan:'free'`.

**Expiry grace**: offline use is fine until `exp`; within the last 7 days
the UI shows a renewal hint; past `exp` → locked until refresh succeeds.

**Sign-out interplay**: VEGA sign-out (`officeVegaLogout`) is orthogonal —
the license is not tied to a VEGA account.

**Upgrade path**: installs that already stored BYOK settings keep
`ai-settings.json` on disk untouched — no deletion, no migration. Dispatch
rejects gated providers and `resolveAiSettings` falls back to `vega` at
read time; the Settings UI marks the stored provider "requires Corporate"
so re-licensing restores it in place.

## 5. Acceptance criteria

1. Clean install, no license: `ai:set-settings` with a non-VEGA provider or
   third-party `apiKey`/`baseUrl` is rejected in the main process; a direct
   `streamChat`/`chat` call with provider `openai`/`custom`/`codex` throws
   "corporate license required"; only `vega` works end-to-end.
2. `license:activate` with a valid key stores `{key, token, install_id}`
   (0600) and `hasFeature('byok')` becomes true without restart.
3. Re-activating the same `install_id` consumes no extra seat; activating
   past `seats` returns `seats_exceeded` and the UI explains the limit and
   offers the `transfer` path; a business key (`seats: 100`) activates 100
   distinct `install_id`s and rejects the 101st.
4. A `403` from `refresh` (revoked/expired subscription) wipes the token and
   relocks features at runtime; UI returns to locked state.
5. Forged, tampered, or expired tokens fail `verifyToken` — covered by
   vitest fixtures (generated Ed25519 test keypair; the prod pubkey comes
   from `OFFICEVEGA_LICENSE_PUBKEY`, tests inject their own).
6. Clock set backward: `lastSeenNow` floor prevents extending `exp`.
7. Copied `license.json` on a fresh install fails the `inst` check and
   forces re-activation (consuming a seat), not silent unlocking.
8. The renderer process never receives the license key, token internals, or
   signing material — only `{plan, features[], org, expiresAt}`.
9. "Restore license" with a stored key re-issues the token after the
   license file is deleted/corrupted; on a fresh machine it consumes a seat
   or (after confirmation) transfers one.
10. `pnpm`-free verification path per AGENTS.md:
    `node_modules/.bin/vitest run` covers `ee/licensing` and the gate
    tests; `node_modules/.bin/tsc --noEmit` clean.

## 6. Open questions for the VEGA side

1. Endpoint names/paths OK as above? Preferred token envelope (JWT-EdDSA vs
   compact `claims.sig`)?
2. Key format `VEGA-ENT-<base32>` (e.g. 4×5 groups)? Where does minting live
   — admin endpoint or ops script?
3. Should `GET /api/v1/account` surface `license`/`plan` for signed-in users
   as a display nicety (optional, not a gate)?
4. Deactivate on app uninstall is unreachable — the `transfer` flag is the
   proposed self-serve reclaim path. OK, or do you prefer an explicit
   device list in the app (show activations, pick which to drop)?

## 7. Out of scope

- Air-gapped / offline-file licenses (a future `ee/` module can add a
  server-exported license file on top of the same `verify.ts`).
- Payment/billing integration — licenses are minted manually per invoice.
- Hardening beyond the threat model (no obfuscation, no integrity watchdogs).
