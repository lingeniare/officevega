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

## Slides AI pipeline notes

- `generate_deck` runs its stages inside the tool (AgentLoop executes tool calls
  sequentially — parallelism lives in the pipeline, not the loop):
  style ∥ internal `research` web searches ∥ batched outline planning
  (first batch yields the Core Hook, the rest run in parallel via `continueFrom`),
  then imagery resolution: **every** non-URL visual slot (`image_queries` and
  `image_prompts` alike) is AI-generated first (`ai:generate-image`, pool of 3);
  image search is only a fallback — for slots the generator missed, or for all
  slots when generation is unavailable — then page generation (GEN_BATCH 4
  cloud / 2 local) with ordered landing.
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
- Staged flow state (`SkillState`): `draftImageSlots` keeps each page's visual
  slot descriptions (for a `detail:"full"` run it stores the resolved URLs);
  `draftResolvedSlots` maps normKey(slot text) → resolved image URL so a later
  `upgrade_deck(stage:"style")` re-feeds the same imagery instead of losing it
  or resurrecting placeholder boxes; `draftPageImages` records the URLs last
  fed into each regenerated page (covers non-draft decks too).
- `ai:store-image-data` persists a picture's embedded `data:` URL into the
  generated-image store and returns its `file://` URL — used by upgrade passes
  to re-feed canvas pictures whose original URL was lost at landing (local
  path only; the cloud service can't reach local bytes).
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
