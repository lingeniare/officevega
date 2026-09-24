# VEGA backend — sync brief (client ↔ api.vega.chat)

One page of instructions + questions so both sides stay in lockstep. Auth/key
issuance is covered by `docs/vega-auth-api-spec.md`; feature-surface details by
`docs/vega-features-api-spec.md`. This file is the practical contract: exactly
what the client sends today and what the backend must guarantee.

## Ground rules

- Everything goes to `https://api.vega.chat/api/v1` with
  `Authorization: Bearer sk-apivega-...` — one issued key for all features,
  billed to the account deposit, attributed to the server-registered key
  name `officevega`.
- The key is main-process only: never rendered, never editable, never in
  `ai-settings.json`. The client has **no user-facing override** for VEGA —
  no key field, no Base URL field, no media model pickers.
- Because users can't pick media models, the client sends the fixed ids
  below. Treat them as **capability slots**: if an id is retired, remap it
  server-side — don't 404 the request.
- Client = Electron main process (`net.fetch` / Node `fetch`). No cookies, no
  CORS, no HTML challenges on `/api/v1/*`.

## Instructions — what the client sends

### 1. Chat

```
POST /api/v1/chat/completions
{ "model": "openai/gpt-6-sol",           // default; user may pick any /models id
  "messages": [...], "stream": true }
```

Must return OpenAI SSE deltas (`choices[0].delta.content`). `openai/gpt-6-sol`
is the default chat model and `openai/gpt-6-luna` the default fast model;
`openrouter/auto` remains a supported catalog alias users can still pick.

### 2. Web search

```
POST /api/v1/chat/completions
{ "model": "openai/gpt-6-luna",
  "plugins": [{ "id": "web", "engine": "parallel", "max_results": 6 }],
  "messages": [{ "role": "user", "content": "<query>" }] }
```

- `engine` order is **`parallel` first, then `exa`** — the client retries with
  `"engine": "exa"` on non-2xx, timeout, or an empty answer+no citations.
- Results are read from `choices[0].message.annotations[]` entries of
  `type: "url_citation"` (`url`, `title`, `content`). Keep this shape.

### 3. Image generation

```
POST /api/v1/images/generations
{ "model": "openai/gpt-image-2.5-sunburst",
  "prompt": "...",
  "n": 1,
  "aspect_ratio": "16:9",                  // OpenRouter string form, not WxH
  "response_format": "b64_json",
  // only for edits/references — same endpoint, inline parts:
  "input_references": [{ "type": "image_url",
                         "image_url": { "url": "data:image/png;base64,..." } }] }
```

Response must carry `data[0].b64_json` (or an OpenRouter `image_urls[0]` /
`data[0].url`). Note: for VEGA the client does **not** use multipart
`/images/edits` — references are inline `input_references` on
`/images/generations`.

### 4. Image analysis

```
POST /api/v1/chat/completions
{ "model": "openai/gpt-6-luna",
  "messages": [{ "role": "user", "content": [
    { "type": "text", "text": "<prompt>" },
    { "type": "image_url", "image_url": { "url": "data:image/...;base64,..." } }
  ]}]}
```

### 5. Video analysis

Same as (4) but `model` is `google/gemini-3.5-flash-lite` and the media part is
`{ "type": "video_url", "video_url": { "url": "data:video/...;base64,..." } }`
(OpenRouter video modality). `openai/gpt-6-luna` takes no video input, so the
client pins a video-capable id here — keep it routed to one.

### 6. Model catalog

```
GET /api/v1/models?output_modalities=image     // image-gen picker feed
GET /api/v1/models?input_modalities=video      // video-capable models
GET /api/v1/models?input_modalities=image&output_modalities=text
GET /api/v1/models?limit=1                     // auth/health probe
```

Each entry needs `architecture.input_modalities` / `output_modalities`
(OpenRouter shape) — the client filters on them.

### 7. Account / billing

```
GET /api/v1/account   → { email, plan?, balance, currency?, totalUsage?, limit? }
```

Drives the account block and low-balance warnings; keep it <1 s and key-auth
(no session).

### 8. Errors

- `401` anywhere → key revoked; the app shows the sign-in prompt.
- Deposit exhausted → return a stable `402`/`403` with a distinguishable
  `error.code` — the app surfaces "top up".
- Web-plugin failure → non-2xx or empty `choices`; a clean error lets the
  client fall back to Exa, then to its non-VEGA chain.

## Questions for the VEGA side

| #   | Question                                                                                                                                       | Why / what we change depending on the answer                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Does the `web` plugin accept `engine`/`max_results` per the OpenRouter spec, and is `parallel` live?                                           | If unsupported we'll drop the field and take whatever default engine you run.                                 |
| 2   | Can the backend do parallel→exa fallback inside one request?                                                                                   | If yes, we remove the client retry and send one request.                                                      |
| 3   | Are our fixed ids (`openai/gpt-image-2.5-sunburst`, `openai/gpt-6-luna`) served as-is or remapped?                                               | If remapped, give us the canonical slot names to put in the client.                                           |
| 4   | `openrouter/auto` on VEGA: supported alias for chat, or should the default be a concrete model?                                                | Resolved: the default chat model is now `openai/gpt-6-sol`; `openrouter/auto` stays a pickable catalog alias.    |
| 5   | `input_references` on `/images/generations` — confirmed working for edits?                                                                     | Otherwise we switch to multipart `/images/edits` for VEGA too.                                                |
| 6   | Size limits on `data:` URLs (a 30 s video can be tens of MB)?                                                                                  | If too tight we need an upload/Files endpoint before video analysis can ship.                                 |
| 7   | Rate limits / concurrency caps for streaming chat + images?                                                                                    | We need numbers to set client-side retry/backoff.                                                             |
| 8   | Model deprecation policy — will retired ids keep working via remap, or do we get a heads-up channel (changelog/endpoint)?                      | Users can't repick media models; silent 404s would break features.                                            |
| 9   | Any WAF/bot-challenge on `/api/v1/*` for non-browser clients?                                                                                  | We hit Cloudflare challenges on Genspark and routed through Chromium's stack — tell us if the same is needed. |
| 10  | Spellcheck is native Chromium today. If VEGA later ships a proofreading model, how should it be exposed (id in `/models`, dedicated endpoint)? | We'd wire it as an opt-in feature, not silently.                                                              |

## Sync protocol going forward

- Contract changes (endpoints, payload shapes, engine names, model slots)
  land in this file + `vega-features-api-spec.md`; ping the OfficeVega side
  before shipping a breaking change.
- The `/models` catalog is the source of truth for capabilities — keep
  modality metadata accurate and the client stays compatible without a
  release.

---

## Round 1 — VEGA answers (2026-09-17)

### Backend changes confirmed

- `client_id` whitelist and key name are now **`officevega`** — the client
  was switched to the product-consistent wire names
  (`CLIENT_ID`/`KEY_NAME` in `officevega-auth.ts`). Verified live
  2026-09-17: `client_id:"officevega"` → `400 invalid_client` and
  `POST /api/v1/keys/officevega` → 404 while only `genoffice` was
  registered — **the backend must register `officevega`** (or accept both)
  before this client can sign in.
- Key endpoints: `POST /api/v1/keys/officevega` (mint),
  `POST /api/v1/keys/officevega/revoke` (sign-out).
- Keys are never deleted: revocation flips `enabled=false`; the row, prefix
  and `usage_logs.api_key_id` billing attribution persist. No delete affordance
  for app-managed keys, dashboard or server-side.
- Server-side model remap (`model-aliases.ts`): a retired pinned id is mapped
  to a live id — requests never 404 on model churn.
- No WAF / Cloudflare / bot challenges — plain nginx; `net.fetch` and Node
  `fetch` work as-is.
- Limits: nginx `client_max_body_size 100m` (~75 MB raw after base64);
  20 r/s burst 40 per IP; app level chat/images 30 req/min, `/account` and
  key endpoints 100 req/min; streams count once at request start.
- Errors: `401` revoked/invalid key; `402 {error:{code:402,message:"Insufficient
balance…"}}` on empty deposit and key spend-limit — the client already maps
  this shape to the "top up" surface.
- Chat streams force `stream_options.include_usage=true` → a final usage
  frame is emitted (billing). Our SSE parser ignores chunks without
  `choices[0]` — tolerated.
- `/account` returns `{email, balance, balanceRub, currency:"USD", totalUsage,
limit, keyName}` — all fields the client reads are present.
- Note for later: the `plugins` web-search form is deprecated upstream; the
  modern surface is `tools: [{type:"openrouter:web_search", ...}]`. Works
  today — revisit when OpenRouter retires the plugin form.

### Our answers to the VEGA questions

1. `client_id: "officevega"` — what the client sends and what the whitelist
   must accept; mint/revoke paths are `/api/v1/keys/officevega*`.
2. Complete pinned-id list: `openai/gpt-6-sol` (chat default),
   `openai/gpt-6-luna` (fast-model default), `openrouter/auto` (supported
   chat alias), `openai/gpt-image-2.5-sunburst` (image generation default),
   `openai/gpt-6-luna` (web-search synthesis + image analysis),
   `google/gemini-3.5-flash-lite` (video analysis). Nothing else is pinned.
3. We never call `/api/v1/images` bare or `/images/edits` against VEGA —
   generations only, with inline `input_references`.
4. ~75 MB raw is enough for the foreseeable video-analysis use; if we outgrow
   it we'll spec a Files-upload flow together first.
5. DOCX/PDF analysis extracts text client-side (own parsers); only images and
   video travel as media parts.
6. Usage frame tolerated — confirmed above.
7. Polling `/account` on settings open / after login is enough; the 402 code
   covers in-flow exhaustion.
8. Keeping the revoked key row as "(отозван)" in the dashboard is fine.
9. `https://api.vega.chat/device` with sign-in → return is all we need; no
   extra branding/locale requirements.
10. `expires_in` 600 s / `interval` 5 s are fine as-is.
