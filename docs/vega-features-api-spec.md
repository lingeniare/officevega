# VEGA API — Feature Routing Requirements (for the api.vega.chat backend AI)

## Context

GetOffice is an Electron desktop suite. Per `docs/vega-auth-api-spec.md`
(implemented), sign-in mints one `sk-apivega-...` key per account. This
document covers the **feature surface** that key unlocks: `api.vega.chat` acts
as a 100% OpenRouter-compatible proxy, and every AI capability in the app —
chat, web search, image generation, image analysis, video analysis — defaults
to VEGA on that key.

### Constraints on our side

- All calls are `Authorization: Bearer sk-apivega-...` against
  `https://api.vega.chat/api/v1` — the same key for every feature, billed to
  the account deposit and attributed to `getoffice`.
- The issued key **never enters the renderer**. Settings UI has no API-key,
  Base-URL or model picker for VEGA; the client sends fixed model ids (below)
  and the server is free to remap them.
- No model pickers: users cannot choose the image/analysis/video models. If
  the requested id is retired, the proxy must route to its replacement — the
  client treats the ids below as capability slots, not hard requirements.
- Requests come from an Electron main process (`net.fetch` or Node `fetch`).
  No cookies, no CORS, no redirects to HTML.

## Requirements

### R1. OpenAI/OpenRouter-compatible surface

Base: `https://api.vega.chat/api/v1`. The client calls:

| Endpoint                   | Used for                                   |
| -------------------------- | ------------------------------------------ |
| `POST /chat/completions`   | chat (streaming SSE), analysis, web search |
| `POST /images/generations` | image generation and editing (see R3)      |
| `GET  /models`             | live catalog + `?limit=1` auth probe       |

`/models` must keep returning per-model `architecture.input_modalities` /
`output_modalities` (OpenRouter shape) — the app filters the catalog with
`?output_modalities=image` and `?input_modalities=image|video`. A chat
request must accept `stream: true` and emit OpenAI-style deltas.

### R2. Web search — `web` plugin, Parallel with Exa fallback

The client sends:

```json
POST /api/v1/chat/completions
{
  "model": "google/gemini-3.5-flash-lite",
  "plugins": [{ "id": "web", "engine": "parallel", "max_results": 6 }],
  "messages": [{ "role": "user", "content": "<query>" }]
}
```

- `engine` is the OpenRouter web-plugin engine: **`parallel` is primary**.
- If the response is a non-2xx, times out, or returns no answer and no
  citations, the client retries once with **`"engine": "exa"`**.
- Citations arrive as `choices[0].message.annotations[]` with
  `type: 'url_citation'` (`url`, `title`, `content`) — the app maps them to
  search results. Preserve this annotation shape.
- If the VEGA side can run engine fallback natively (single request, parallel
  → exa internally), tell us and we drop the client retry.

### R3. Image generation — fixed model slot

```
POST /api/v1/images/generations
{ "model": "google/gemini-3.1-flash-image", "prompt": "...", "n": 1,
  "size": "1024x1024" | aspect-mapped }
```

Edits/references ride the same endpoint as inline `input_references` parts
(`[{ "type": "image_url", "image_url": { "url": "data:..." } }]`) — the client
does not use multipart `/images/edits` for VEGA. Requests also send
`aspect_ratio` (OpenRouter string form) and `response_format: 'b64_json'`.
Response must include `data[0].b64_json` or
`data[0].url`/`image_urls[0]` (OpenRouter shape). The model id is a slot —
the proxy may substitute the current default image model; a picker may come
to the chat UI later, at which point the id stops being fixed.

### R4. Image analysis — fixed model slot

```
POST /api/v1/chat/completions
{ "model": "google/gemini-3.5-flash-lite",
  "messages": [{ "role": "user", "content": [
    { "type": "text", "text": "<prompt>" },
    { "type": "image_url", "image_url": { "url": "data:image/...;base64,..." } }
  ]}]}
```

Any vision-capable model the proxy prefers may serve this; the client only
needs OpenAI-shaped `choices[0].message.content` back.

### R5. Video analysis — fixed model slot

Identical to R4 except the media part is
`{ "type": "video_url", "video_url": { "url": "data:video/...;base64,..." } }`
(OpenRouter video modality). The backend picks a video-capable model —
route the fixed id to one.

### R6. Spellcheck — out of scope (documented for completeness)

Spellcheck in the AI chat is the **native Chromium checker** (`spellcheck`
attribute + language pack). No model call exists today and none is required.
If VEGA later offers a dedicated proofreading model, expose it in `/models`
and we will wire it as a separate opt-in feature.

### R7. Key secrecy

- `sk-apivega-...` lives only in `~/.getoffice/auth.json` (0600) in the main
  process; it is injected into requests there.
- Never return the plaintext key from any endpoint after issuance; account
  info comes from `GET /api/v1/account` (email, balance, plan — no key).
- The settings file (`ai-settings.json`) holds no VEGA key and no VEGA
  base-URL override.

## Error semantics (in addition to auth-spec R4)

- `401` on any feature endpoint → key revoked server-side; the app will
  surface the sign-in prompt.
- `402` / `403` with a balance error → empty deposit; the app shows "top up".
- Web plugin failures: a non-2xx or a 2xx with empty `choices` triggers the
  Exa retry; a second failure falls back to the client's non-VEGA search
  chain, so please keep plugin errors distinguishable (HTTP status or
  `error.code`).

## Acceptance criteria

1. Web search request above returns `choices[0].message.content` plus
   `url_citation` annotations with `engine: "parallel"`, and works
   identically with `engine: "exa"`.
2. `POST /images/generations` with the fixed model id returns an image
   (`b64_json` or URL); `/images/edits` accepts inline reference images.
3. Image analysis and video analysis requests above return a text answer.
4. `GET /api/v1/models` lists modality metadata so image-in/image-out and
   video-in filters resolve non-empty lists.
5. All of it runs on the issued `sk-apivega-...` key with `Bearer` auth only
   — no session, no cookies — and is billed to the account deposit.

## Open questions for the VEGA side

1. Does the web plugin accept `engine`/`max_results` as shown (OpenRouter
   plugin spec), and can the backend do parallel→exa fallback itself?
2. Are the fixed model ids served as-is or remapped? If remapped, what are
   the canonical capability slots for image-gen / vision / video?
3. `/images/generations` with inline `input_references` — confirmed working
   for edits on the VEGA side (verified live once), or should references use
   another shape?
4. Any request-size limits on `data:` URLs for video (a 30 s clip can be tens
   of MB)? If so, is there an upload/Files endpoint we should use instead?
