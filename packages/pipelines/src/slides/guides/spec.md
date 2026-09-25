# Deck spec for `officevega create --type pptx --spec`

The designed-deck path (`officevega guide slides design`) keeps one page per file:

```
deck/pages/01.json   { "title": "The 40% squeeze", "type": "cover", "layout": "cover_typography_hero", "background": "#0E1A2B", "elements": [ ... ] }
deck/pages/02.json   { "title": "Where the margin went", "type": "content", "layout": "three_columns", "background": "#FFFFFF", "elements": [ ... ] }
```

`title`, `type` and `layout` echo the page's outline entry; the builder ignores them, the checks compare them. `officevega slides check deck/pages/01.json` builds and audits one file, then checks it against `outline.json` and `style.md` (looked up beside the file and one folder up, or `--outline <file>`): file `NN.json` is outline entry `pages[N-1]`; an echoed field that disagrees or placeholder copy exits 1, a missing title or a planned photo without an image is a warning, and colors the style sheet does not name are listed in `detail.style.offPalette`. `officevega create --type pptx --spec deck/pages [--outline deck/outline.json] --out deck.pptx` takes every `*.json` in the folder in name order (`01`, `02`, … `10`), one slide each, runs the same checks on every file and refuses to build when the page count differs from the outline or a page disagrees with its entry. `officevega slides replace deck.pptx --slide n --spec deck/pages/NN.json` rebuilds slide n from its file after checking it against entry n.

`--spec` also accepts one file holding the whole deck, `{ "pages": [ {...}, {...} ] }`, a bare array of pages, or a single page object. Up to 60 pages. Every page becomes one 16:9 slide; the canvas is **1280 × 720 px**, origin top-left, all `x` `y` `w` `h` integers in px. Elements paint in array order (first = bottom). Colors are `#RRGGBB` or `#RRGGBBAA` (`AA` alpha, `00` transparent).

## Outline

`deck/outline.json` is the plan the pages are written from; `officevega slides check` validates it:

```json
{
  "topic": "Regional logistics review 2024",
  "core_hook": "Margins fell 40% while volume grew",
  "pages": [
    {
      "title": "The 40% squeeze",
      "type": "cover",
      "layout": "cover_typography_hero",
      "brief": "Main title, subtitle with the period, presenter line; dark background from the style sheet.",
      "image_queries": []
    },
    {
      "title": "Where the margin went",
      "type": "content",
      "layout": "three_columns",
      "brief": "Three columns: fuel +31%, wages +18%, spot rates -22% (2024 vs 2022), one source line each.",
      "image_queries": ["container port cranes at dawn [16:9]"]
    }
  ]
}
```

`type` is `cover`, `content`, `data` or `closing`; `layout` is one of that type's variants from the design guide's layout library. `image_queries` holds one entry per visual slot — an English scene description (resolve it with AI image generation first — a photo search is only the fallback when generation is unavailable or fails) or a ready `http(s)` URL — each ending with the slot's aspect tag, `"harbor cranes at dawn [4:3]"`: one of `1:1`, `16:9`, `9:16`, `3:4`, `4:3` — pick it for the layout role (a free side column or vertical band → `9:16`/`3:4`, balanced pairs and compact slots → `1:1`, a true full-width hero or overlay scene → `16:9`) instead of defaulting every slot to wide. The tag is contractual: the image is generated at that ratio and its box keeps it. An untagged entry defaults to `16:9` and a tag outside the set snaps to the nearest allowed ratio — both are warned about. `[]` for a page without photos. Errors from the check: unknown type or layout, missing title, brief, core hook or image_queries entries, placeholder copy (`XX%`, `lorem`, `TBD`), a content or data layout repeated on consecutive pages. Warnings: a thin brief, a non-English query, fewer than three layout variants across the body pages, a first page that is not a cover, a last page that is not a closing page.

## Element types

**Shape**

```json
{
  "type": "shape",
  "shape": "roundRect",
  "x": 80,
  "y": 120,
  "w": 360,
  "h": 200,
  "fill": "#1F3A5F",
  "stroke": { "color": "#FFFFFF", "widthPt": 1 },
  "valign": "middle",
  "paragraphs": [
    { "align": "center", "runs": [{ "text": "Label", "sizePt": 14, "color": "#FFFFFF" }] }
  ]
}
```

`shape` is one of `rect`, `roundRect`, `ellipse`, `triangle`, `rightArrow`, `leftArrow`, `upArrow`, `downArrow`, `chevron`, `diamond`, `parallelogram`, `trapezoid`, `hexagon`, `pentagon`, `pie`, `donut`, `star5`, `heart`, `cloud`, `line`, `lineArrow`. `line` and `lineArrow` draw the diagonal of their box from top-left to bottom-right and need a `stroke`; a horizontal rule is a box with `h: 1`. A shape needs a `fill` or a `stroke` (or both). `paragraphs` is optional label text, vertically centered unless `valign` says otherwise.

`fill` (and the page-level `background`) takes `"#RRGGBB(AA)"` or a linear gradient object:

```json
{ "gradient": { "stops": [{ "pos": 0, "color": "#0E1A2B" }, { "pos": 100, "color": "#3B82F6" }], "angle": 45 } }
```

`pos` is 0–100, `angle` in degrees (0 = left→right, 90 = top→bottom); `{"gradient":{"from":"#A","to":"#B","angle":45}}` is the two-stop shorthand. Gradients suit large cover/background blocks, not small elements.

**Text**

```json
{
  "type": "text",
  "x": 80,
  "y": 60,
  "w": 800,
  "h": 90,
  "valign": "top",
  "paragraphs": [
    {
      "align": "left",
      "lineSpacingPct": 110,
      "spaceAfterPt": 6,
      "bullet": false,
      "runs": [
        {
          "text": "Headline",
          "sizePt": 36,
          "bold": true,
          "color": "#0E1A2B",
          "font": "Helvetica Neue"
        }
      ]
    }
  ]
}
```

Run fields: `text` (required), `sizePt` (6 to 160), `bold`, `italic`, `color`, `font`. Paragraph fields: `runs` (required), `align` (`left` `center` `right` `justify`), `lineSpacingPct` (60 to 300), `spaceBeforePt` and `spaceAfterPt` (0 to 96), `bullet` (true = a • bullet with a hanging indent). A paragraph may mix runs of different size, weight and color (a big number run beside a small unit run). Text boxes have zero inner padding and wrap at their width; the builder measures every plain text box and grows it downwards when the content is taller (it never shrinks a box).

**Image**

```json
{ "type": "image", "url": "./assets/hero.jpg", "x": 660, "y": 80, "w": 540, "h": 560 }
```

`url` is a local file path (absolute, or relative to the current directory and then to the spec file's folder), a `data:` URL, or an `http(s)` URL that officevega downloads. The box's `w`:`h` is one of the fixed slot aspects — `1:1`, `16:9`, `9:16`, `3:4`, `4:3` — normally the ratio the slot's outline tag declares; a box that misses is snapped to the nearest allowed ratio and reported. The image is center-cropped to fill its box (object-fit: cover), so the snapped box keeps most of the picture: a box that keeps less than half (a portrait product shot in a flat strip) lands but is reported as a warning. Up to 8 images per page. An image that cannot be read is dropped and listed in `detail.imageFailures`.

## Validation

Elements missing numeric geometry, lying fully outside the canvas, or of an unknown type are dropped with a warning; boxes that stick out are clamped to the canvas. Text elements without any text and shapes without fill or stroke are dropped. An image box — or an `IMAGE:`/`VISUAL:`-labeled placeholder shape — whose proportions miss the fixed slot aspects (`1:1`, `16:9`, `9:16`, `3:4`, `4:3`) is snapped to the nearest allowed ratio, keeping its position. Two text boxes on one page with identical or near-identical text (a subtitle restating the chart caption) are kept but warned about, as is an image box that crops away more than half of its picture. A page with no surviving element fails; the deck fails only when no page survives. Everything dropped or warned about is reported in `detail.issues` per page. Up to 48 elements per page.

## After building

Elements get durable ids (`e_*`) and slides `s_<n>`; `officevega slides read deck.pptx --json` lists them for follow-up `officevega slides apply` ops. `officevega slides audit` reports out-of-bounds, text overflow and overlap per slide with the same ids; `officevega slides render` writes one PNG per slide for visual review; `officevega slides replace --slide n --spec <page.json>` swaps one slide for a rebuilt page (its element ids are new).
