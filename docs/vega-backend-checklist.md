# VEGA backend — implementation checklist (api.vega.chat)

Self-contained contract for the VEGA side: what must exist, the exact shapes,
and current status after sync Round 1 (2026-09-17). Details live in
`vega-auth-api-spec.md` (auth) and `vega-backend-sync.md` (feature sync).

## 1. Auth & key lifecycle — [x] implemented

- [x] `POST /api/auth/device/code` accepts `{client_id:"getoffice"}` —
      whitelisted value — and returns `device_code`, `user_code`,
      `verification_uri`, `verification_uri_complete`, `expires_in` (600),
      `interval` (5).
- [x] `POST /api/auth/device/token` — RFC 8628 poll;
      `authorization_pending` until approved, then a session `access_token`.
- [x] Verification page `https://api.vega.chat/device` — sign-in → approve →
      return, no extra requirements.
- [x] `POST /api/v1/keys/getoffice` (Bearer = session token) mints the single
      app key `sk-apivega-[0-9a-f]{48}`; plaintext returned once. Re-login
      supersedes the previous key — at most one active `getoffice` key.
- [x] `POST /api/v1/keys/getoffice/revoke` (Bearer = the API key) — sign-out.
      Revocation flips `enabled=false`; the row + billing attribution stay.
- [x] `GET /api/v1/account` (key-auth, <1 s) →
      `{email, balance, balanceRub, currency:"USD", totalUsage, limit, keyName}`.

## 2. OpenAI/OpenRouter-compatible surface — [x] implemented

Base `https://api.vega.chat/api/v1`, `Authorization: Bearer sk-apivega-...`
for every endpoint — no cookies, no CORS, no WAF challenges (confirmed).

| Endpoint                   | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `POST /chat/completions`   | chat (SSE), web search, image & video analysis                  |
| `POST /images/generations` | image generation + edits via `input_references`                 |
| `GET  /models`             | catalog; `input_modalities`/`output_modalities`/`limit` filters |
| `GET  /account`            | deposit/account info (above)                                    |

- [x] SSE deltas `choices[0].delta.content`; final `usage` frame emitted
      (server forces `stream_options.include_usage=true`).
- [x] `/models` entries carry `architecture.input_modalities` /
      `output_modalities`; `?limit=1` works as an auth/health probe.

## 3. Feature contracts — [x] confirmed working

- [x] **Chat** — `model:"openrouter/auto"` alias resolves upstream.
- [x] **Web search** — `plugins:[{id:"web", engine:"parallel"|"exa",
    max_results:N}]` passes through; citations arrive as
      `type:"url_citation"` annotations. Client retries parallel→exa itself
      (one engine per request).
- [x] **Image generation** — `/images/generations` with
      `{model:"google/gemini-3.1-flash-image", prompt, n:1, aspect_ratio,
    response_format:"b64_json"}`; edits = inline `input_references` on the
      same endpoint (no multipart `/images/edits` — not needed).
- [x] **Image analysis** — `chat/completions` + `image_url` data-URL parts,
      model `google/gemini-3.5-flash-lite`.
- [x] **Video analysis** — same with `video_url` data-URL parts; routed to a
      video-capable model.
- [x] **Model slots** — pinned ids (`openrouter/auto`,
      `google/gemini-3.1-flash-image`, `google/gemini-3.5-flash-lite`) served
      as-is; retired ids remapped server-side (`model-aliases.ts`), never 404.
- [x] **Spellcheck** — native Chromium client-side; nothing to implement.
      If VEGA later ships a proofreading model, it lands in `/models` as a
      normal text model.

## 4. Errors — [x] agreed shape

- [x] `401` — revoked/invalid key → client prompts sign-in.
- [x] `402 {error:{code:402,message:"Insufficient balance…"}}` — empty
      deposit / spend limit → client shows "top up".
- [x] Web-plugin failure → non-2xx or empty `choices` triggers client-side
      Exa retry, then the non-VEGA search chain.

## 5. Operational limits (confirmed)

- Request body: nginx `client_max_body_size 100m` → ~75 MB raw file after
  base64 inflation. Files-upload flow to be specced together if outgrown.
- Rate: 20 r/s burst 40 per IP (nginx); app level chat/images 30 req/min,
  `/account` + key endpoints 100 req/min; streams count once at start.

## 6. Watchlist / pending

- [ ] `plugins` web-search form is deprecated upstream — migrate client to
      `tools:[{type:"openrouter:web_search", ...}]` before OpenRouter removes it.
- [ ] Files-upload endpoint — only if video > ~75 MB becomes a real need.
- [ ] Optional: server-side low-balance signal below threshold (polling
      `/account` suffices today).

## Sync protocol

Contract changes land in `docs/vega-backend-sync.md` (Round log) + this
checklist before shipping. `/models` is the capability source of truth —
keep modality metadata accurate and no client release is needed.
