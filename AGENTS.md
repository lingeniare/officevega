# AGENTS.md

## Running tests and typecheck

`pnpm test` / `pnpm typecheck` inside a package triggers pnpm's dependency-status
check, which tries to reinstall the workspace and fails on the internal
`@genoffice/*` packages (the repo was installed with npm — package-lock.json —
not pnpm). Run the binaries directly from the root `node_modules` instead:

```bash
# from a package dir (e.g. packages/pipelines, apps/slides):
../../node_modules/.bin/vitest run            # tests
../../node_modules/.bin/vitest run tests/page-spec.test.ts   # one file
../../node_modules/.bin/tsc --noEmit          # typecheck
```

## Running `npm run dev`

The shell step goes through `tools/dev-shell.mjs`, which deletes
`ELECTRON_RUN_AS_NODE` before spawning electron-vite. Electron-hosted
terminals (IDE/agent shells such as Devin Desktop) export `ELECTRON_RUN_AS_NODE=1`;
an electron binary that inherits it boots as plain Node.js, so the bundled
`require('electron')` resolves to the npm package shim (the executable path
string) and the main process crashes on the first `ipcMain` access —
`concurrently -k` then kills every dev server. Deleting is required: Electron
treats even an empty value as set. The same trap applies to `electron .`-style
launches (`npm run shell`, `npm start -w @officevega/shell`) from such terminals.

## Release update feed

- Auto-update uses electron-updater's **generic** provider; the feed lives on
  the project site (`OFFICEVEGA_UPDATE_URL` → `apps/shell/electron-builder.env`,
  gitignored — currently `https://officevega.com/updates/`). Without the env
  var no publish config is emitted and packaged builds have no updater.
- `scripts/stage-update-feed.cjs` assembles the upload-ready `release-feed/`
  dir from `apps/shell/release/` (or given dirs): copies only
  manifest-referenced installers, sha512-verifies them, merges same-name
  `latest*.yml`/`beta*.yml` from separate arch passes, and enforces
  forward-only versions (`--force` to roll back). Upload installers first,
  `*.yml` last — the full site-side runbook is `docs/update-feed-officevega.md`.
- `DOWNLOAD_PAGE_URL` in `apps/shell/src/main/updater.ts` is the last-resort
  manual fallback (`https://officevega.com/`); the feed-derived installer
  link always wins when derivable.

## Slides AI pipeline notes

- `generate_deck` runs its stages inside the tool (AgentLoop executes tool calls
  sequentially — parallelism lives in the pipeline, not the loop):
  style ∥ internal `research` web searches ∥ batched outline planning
  (first batch yields the Core Hook, the rest run in parallel via `continueFrom`),
  then imagery resolution: **every** non-URL visual slot (`image_queries` and
  `image_prompts` alike) is AI-generated first (`ai:generate-image`, one eager
  pool of `IMAGE_GEN_POOL` = 8 — `DeckAccess.imageGenConcurrency` overrides —
  started on all unique slots in page order the moment the plan is final, one
  retry per slot); image search is only a fallback — for slots the generator
  missed, or for all slots when generation is unavailable — then page
  generation (GEN_BATCH = PAGE_GEN_BATCH, 8 cloud / 4 local) with ordered
  landing, each chunk awaiting only its own slots' deferreds (late images
  overlap early pages).
  `upgrade_deck` visuals resolves its pending slots with the same pool.
- `dataSource:'search'` is satisfied by the internal research — no separate
  `web_search` turn is needed first.
- Local page specs (`packages/pipelines/src/slides/page-spec.ts`) accept
  `#RRGGBB(AA)` or `{"gradient":{"stops":[{pos:0-100,color}],"angle":deg}}` for
  `fill`/`background`; `file://` image URLs only when `localImages` is set —
  `slides-main.ts` enables it, and `fetchRemoteImage` resolves `file:` strictly
  inside the generated-image store (anything else fails the download, no local
  file reads).
- A gradient page background stays a full-bleed rect element — `promoteSlideBackground`
  only promotes opaque solids; the render layer marks it background-like instead.
- Visual slots carry a fixed aspect tag — `"scene [4:3]"`, one of `1:1, 16:9,
  9:16, 3:4, 4:3` (untagged = 16:9; helpers live in
  `packages/pipelines/src/slides/aspect-ratio.ts`). The tag picks the
  `generateImage` ratio, sizes the draft placeholder box, and `parsePageSpecObject`
  snaps image elements and `IMAGE:`/`VISUAL:`-labeled shapes to the declared or
  nearest allowed ratio (`CHART:`/`INFOGRAPHIC:` stay free-form).
- Staged flow state (`SkillState`): `draftImageSlots` keeps each page's visual
  slot descriptions (for a `detail:"full"` run it stores the resolved URLs);
  `draftResolvedSlots` maps normKey(slot text) → resolved image URL so a later
  `upgrade_deck(stage:"style")` re-feeds the same imagery instead of losing it
  or resurrecting placeholder boxes; `draftPageImages` records the URLs last
  fed into each regenerated page (covers non-draft decks too);
  `draftImageAspects` maps URL → declared aspect so a restyle keeps the ratio
  after the slot text was replaced by bare URLs.
- `ai:store-image-data` persists a picture's embedded `data:` URL into the
  generated-image store and returns its `file://` URL — used by upgrade passes
  to re-feed canvas pictures whose original URL was lost at landing (local
  path only; the cloud service can't reach local bytes).
- Post-generation layout QC (`slide-qc.ts` `runQcPages`, orchestrated by
  `AiPanel.runQcPass`) checks pages through a bounded pool
  (`QC_PAGE_CONCURRENCY` = 4, `localStorage 'ai-slides-qc-parallel'` overrides
  1-8, `'ai-slides-qc'='0'` disables the pass). History batches are
  session-global, so the pass runs inside ONE batch (one undo step) and a page
  whose deterministic audit got worse is reverted through per-slide main
  checkpoints (`slides:qc-slide-checkpoint`/`qc-slide-restore` /
  `qc-checkpoints-clear`, `Session.qcCheckpoints`) — never the whole-deck
  `aiSnapshotRestore`, which would wipe sibling pages' concurrent edits.
- `apps/*/src/main` changes compile into the **shell** build — rebuild the shell
  or they silently do not run.

## HTML AI pipeline notes

- New-page flow: `ask_clarification` (its optional `search` queries run through
  `HtmlDocAccess.webSearch` while the card waits, findings land in the tool
  result for the brief writer) → `plan_page` (brief card) → streamed
  `writePage` into DraftPreview → `fill_images`.
- Image contract: the page writer emits `<img class="img-slot"
  data-img="English generation prompt">` with NO src and a shimmer `.img-slot`
  rule; `fill_images` asks the user via the same ClarifyCard, resolves each
  unique prompt (AI generation `html:ai-generate-image` first, pool of 3,
  `ai:image-search` fallback), then rewrites `data-img="…"` → `src="…"` in one
  `apply_ops` str_replace batch. Resolved URLs go through
  `persistImage`: `file:` (BYOK generated store) is always materialized to
  `assets/` (or `data:` for untitled docs — it never renders in the preview);
  `https:` lands in `assets/` for saved documents and stays remote for
  untitled ones.
- `html:fetch-image` accepts `https?` and `file:`; `file:` resolves strictly
  inside the generated-image store via `fetchRemoteImage`.
- Never pass image base64 through tool arguments — only URLs; the main
  process downloads.

## License (client)

- Client lives in `apps/shell/src/main/license/` (`token.ts` Ed25519 verify, `client.ts`
  HTTP, `manager.ts` state/grace/clock-rollback, `store.ts` safeStorage file
  `userData/license.json`, `service.ts` IPC + daily `/validate`, `mock-server.ts`).
  Contract: `LICENSE_ACTIVATION.md` + the agreed decisions (1 device per key,
  30-day offline grace, no trial, free app — without a license only the VEGA
  provider is usable; enforced in `activeProvider`/`requestProvider` via
  `@genoffice/ai-provider` `setLicenseGetter`).
- `LICENSE_PUBLIC_KEYS` in `license/keys.ts` holds kid `2026-10` (rotate by adding a kid; an empty ring fails closed).
  Dev without a server: `OFFICEVEGA_LICENSE_MOCK=1`
  (keys in `mock-server.ts`); `OFFICEVEGA_LICENSE_URL` overrides the endpoint
  (dev only).
