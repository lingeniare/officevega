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
- `apps/*/src/main` changes compile into the **shell** build — rebuild the shell
  or they silently do not run.
