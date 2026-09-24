import type { AgentSkill, ToolDisplay } from '@genoffice/agent-core'
import type {
  GroupRenderNode,
  PictureRenderNode,
  RenderNode,
  RenderSlide,
  ShapeRenderNode,
} from '@genoffice/pptx-render'
import type { AgentToolCall, AgentToolDef } from '../../shared/ipc'
import { OP_GROUPS, opGuide, opGuideCatalog, opSignatureIndex } from '@genoffice/pptx-ops/op-docs'
import { auditSlideLayout, formatAudit } from '@genoffice/pipelines/slides/layout-audit'
import { runLayoutScript, type LayoutScriptElement } from './layout-script'
import { t } from '../i18n/locale'
import systemPrompt from './prompts/system.md?raw'

/**
 * Slides capability as an AgentSkill: deck outline context + three tools (read structure /
 * read one slide / edit element text). Changes go through the existing slides:edit-text IPC;
 * the main process applies them and returns the new RenderSlide, which applySlide writes
 * back into React state — the same pipeline as manual editing.
 */

// ── Generation progress events (for the onProgress callback; renderer memory only, never persisted or journaled) ──

/** Per-page progress status */
export type PageProgressStatus = 'pending' | 'running' | 'done' | 'error'

/** Per-page progress entry */
export interface PageProgressItem {
  title: string
  status: PageProgressStatus
  /** Failure reason (when status='error'); cleared after a successful retry */
  error?: string
}

/** Progress event union type (all stages share one callback; the UI dispatches by stage) */
export type DeckProgressEvent =
  | { stage: 'style'; label: string; status: 'running' | 'done' | 'error'; summary: string }
  | { stage: 'research'; label: string; status: 'running' | 'done' | 'error'; summary: string }
  | {
      stage: 'plan'
      label: string
      done: number
      total: number
      status: 'running' | 'done' | 'error'
      summary: string
    }
  | {
      stage: 'images'
      label: string
      done: number
      total: number
      status: 'running' | 'done' | 'error'
      summary: string
    }
  | {
      stage: 'pages'
      label: string
      done: number
      total: number
      status: 'running' | 'done' | 'error'
      summary: string
      pages: PageProgressItem[]
    }
  | {
      stage: 'done'
      total: number
      summary: string
      /** absent on success; the card must not read a failed or stopped run as "done" */
      outcome?: 'failed' | 'cancelled'
    }

/** Panel/skill access point to the currently open deck (refs provided by App, stay fresh across renders). */
export interface DeckAccess {
  getSlides(): RenderSlide[]
  getCurrent(): number
  getSelectedIds(): string[]
  applySlide(slideIndex: number, updated: RenderSlide): void
  /** Replace the whole deck (after adding/removing slides) and jump to the goTo slide */
  applyDeck(slides: RenderSlide[], goTo?: number): void
  /**
   * Generation progress callback (optional): called by generate_deck stages; the UI updates
   * the progress card and top progress bar in real time. Passed only through renderer
   * memory, never persisted or journaled.
   */
  onProgress?(event: DeckProgressEvent): void
  /** Land generated pages: each pageMarkers entry redeems a one-slide pptx, merged into / replacing the current deck. Returns total page count or an error.
   *  mode="insert_at" inserts a single page at position insertAt (later pages shift) — used to re-insert failed pages at their original position.
   *  On pipeline failure it automatically falls back to element-level mode; fallbackReason explains why (ok is still true).
   *  deckName = presentation name derived from user input, used as the file name when the new draft is saved (instead of "Untitled-timestamp"). */
  landGeneratedPages?(
    pageMarkers: string[],
    mode?: 'replace' | 'append' | 'insert_at',
    deckName?: string,
    insertAt?: number,
  ): Promise<{
    ok: boolean
    pages?: number
    appendedFrom?: number
    insertedIndex?: number
    error?: string
    fallbackReason?: string
    imageFailures?: { page: number; url: string }[]
  }>
  /** Redo one slide in place: land the marker's page as a replacement for slide slideIndex (other slides untouched; undoable with ⌘Z). */
  regenerateSlide?(
    slideIndex: number,
    marker: string,
  ): Promise<{ ok: boolean; error?: string; imageFailures?: { page: number; url: string }[] }>
  /** Survey: shows a card with options and waits for the user's choices, returning an answer summary. */
  askClarification?(questions: ClarifyQuestion[]): Promise<{ answers: string; cancelled?: boolean }>
  /**
   * In-tool image search (embedded in the tool):
   * given English keywords, returns an array of real image URLs (at most N).
   * In the deck pipeline this is the FALLBACK resolver — it runs for slots AI image
   * generation missed, or for all slots when generation is unavailable.
   * On search failure returns an empty array (fail-open; doesn't block the main generation path).
   */
  searchImages?(query: string, maxResults: number): Promise<string[]>
  /**
   * In-tool web research (embedded in the tool): one search query → results + optional
   * direct answer. generate_deck fires the research queries IN PARALLEL with style
   * generation and planning and folds the digest into the planning/per-page context —
   * the facts reach the pages without a separate agent turn.
   */
  searchWeb?(
    query: string,
    maxResults: number,
  ): Promise<{
    ok: boolean
    results?: { title: string; url: string; snippet: string }[]
    answer?: string
    error?: string
  }>
  /**
   * In-tool AI image generation (embedded in the tool): a visual prompt → a real
   * image URL (https for the account route, file:// for BYOK — the local page
   * builder resolves the latter). PRIMARY resolver of generate_deck's image stage —
   * every planned visual slot (image_queries and image_prompts alike) is generated
   * first; image search only covers misses. Availability is gated by
   * imageGenAvailable — callers must not invoke it when that returns false.
   */
  generateImage?(args: {
    prompt: string
    aspectRatio?: string
  }): Promise<{ ok: boolean; url?: string; error?: string }>
  /** Whether cloud single-page generation is available (kill switch + gsk login state) */
  isCloudPageGenEnabled?(): Promise<boolean>
  /** live predicate (gsk login && cloud-tools toggle, or a BYOK media key); false hides generate_image */
  imageGenAvailable?(): boolean
  /** same for analyze_media */
  mediaAnalysisAvailable?(): boolean
  /**
   * Cloud single-page generation (gsk slide_generate), used by generate_deck's self-driven
   * pipeline: given the unified style + this page's brief/layout/images, the cloud service
   * writes the HTML and converts it to a one-slide pptx. Returns a marker string that goes
   * into a landGeneratedPages pageMarkers slot.
   */
  generatePageCloud?(args: {
    pageIndex: number
    totalPages: number
    coreHook: string
    style: string
    title: string
    brief: string
    layout: string
    images: string[]
    context?: string
    topic?: string
    canvasW: number
    canvasH: number
    signal?: AbortSignal
  }): Promise<{ ok: boolean; marker?: string; error?: string }>
  /**
   * Local single-page generation (used when cloud is unavailable, e.g. BYOK without gsk):
   * same inputs and marker contract as generatePageCloud, but the page is produced entirely
   * locally — one LLM request writes a structured slide spec and the main process builds it
   * directly into a one-slide pptx (no HTML intermediate).
   */
  generatePageLocal?(args: {
    pageIndex: number
    totalPages: number
    coreHook: string
    style: string
    title: string
    brief: string
    layout: string
    images: string[]
    context?: string
    topic?: string
    canvasW: number
    canvasH: number
    signal?: AbortSignal
  }): Promise<{ ok: boolean; marker?: string; error?: string; imageFailures?: string[] }>
  /**
   * In-tool Style Skill generation:
   * a dedicated LLM call focused on producing a complete structured visual style guide
   * (color rules/fonts/layout variants per page type/overall style). Promotes style from an
   * "outline side-product" to a "dedicated deliverable" — less AI-looking, consistent across pages.
   */
  generateStyleSkill?(args: {
    topic: string
    questionnaire?: string
    styleHint?: string
    signal?: AbortSignal
  }): Promise<{ ok: boolean; styleSkill?: string; error?: string }>
  /**
   * In-tool planning: given topic + page count, the LLM produces a structured outline.
   * Fixes "missing pages at the input side" at the root — the main agent doesn't hand-write dozens of pages of pages JSON (avoids the argument being truncated by max_tokens).
   * style is already produced by generateStyleSkill; this function only outputs core_hook + per-page outlines (styleSkill serves as a reference for consistency).
   * Batched recursion is scheduled by the skill (continueFrom keeps the narrative coherent across batches).
   */
  planDeckOutline?(args: {
    topic: string
    count: number
    startPage: number
    context?: string
    styleSkill?: string
    continueFrom?: { coreHook: string }
    signal?: AbortSignal
  }): Promise<{
    ok: boolean
    // Same loose shape as OutlineJson (outline-json.ts): the LLM output is
    // only validated field-by-field at the point of use.
    outline?: { core_hook?: unknown; pages?: unknown }
    error?: string
  }>
  /**
   * Outline confirmation card (staged generation): shows the internally planned outline
   * to the user BEFORE any page is generated. The user may approve (optionally dropping
   * pages / retitling them), ask for changes (feedback goes back for re-planning), or
   * cancel. Runs inside generate_deck between planning and page generation — the tool
   * call simply awaits the user's decision, same as askClarification.
   */
  proposeOutline?(args: OutlineProposal): Promise<OutlineProposalResult>
  /**
   * Next-step offer (staged generation): fired by the skill when a draft deck has
   * just landed and again after each upgrade_deck run — pending lists the stages
   * still available (visuals = images/infographics, style = unified design). The
   * UI renders the choice as buttons; the model must NOT enumerate tool names or
   * JSON syntax in its reply. A {false,false} pending hides the card.
   */
  onUpgradeOffer?(pending: { visuals: boolean; style: boolean }): void
  /**
   * Draft (skeleton) page generation — the fast first pass of staged deck creation:
   * ONE LLM request writes simple slide specs for a BATCH of pages (minimal neutral
   * layout, real text, labeled placeholder boxes for every planned visual slot), and
   * each spec is built locally into a one-slide pptx. markers[i] aligns with pages[i]
   * (null = that page failed). No style design, no image resolution — upgrades come
   * later via upgrade_deck.
   */
  generateDraftPages?(args: {
    pages: {
      pageIndex: number
      totalPages: number
      title: string
      brief: string
      layout: string
      type?: string
      imageSlots: string[]
    }[]
    coreHook: string
    topic?: string
    context?: string
    canvasW: number
    canvasH: number
    signal?: AbortSignal
  }): Promise<{ ok: boolean; markers?: (string | null)[]; error?: string }>
  /**
   * Persist the current draft's Style Skill as a sidecar file (same directory and name as the draft, .styleskill.json).
   * fail-open: failure doesn't block the main path.
   */
  saveSidecar?(data: { topic: string; styleSkill: string; createdAt: string }): Promise<void>
  /**
   * Save styleSkill into userData/style-templates/<name>.json for later reuse.
   */
  saveStyleTemplate?(
    name: string,
    data: { topic: string; styleSkill: string; createdAt: string },
  ): Promise<{ ok: boolean; error?: string }>
  /**
   * List saved Style templates (name + topic + createdAt).
   */
  listStyleTemplates?(): Promise<Array<{ name: string; topic: string; createdAt: string }>>
  /**
   * Load the content of a given Style template.
   */
  loadStyleTemplate?(
    name: string,
  ): Promise<{ ok: boolean; styleSkill?: string; topic?: string; error?: string }>
  fitWidthPx: number
  /** Base retry backoff in ms for single-page generation failures (default 2000; tests pass 0 to disable backoff) */
  retryBackoffMs?: number
  /**
   * Names of text attachments in the current conversation that were never read with
   * read_attachment. When non-empty, generate_deck refuses to run until they are read
   * (decks must be built from attachment content, not generic filler).
   */
  unreadTextAttachments?(): string[]
  /**
   * Resolve a user image attachment by file name (an `attachment://` reference in
   * insert_web_image / replace_image) to its raw bytes, so the original file is
   * embedded as-is — the model must never recreate an attached image (r182 family).
   */
  resolveAttachmentImage?(
    name: string,
  ): Promise<{ ok: true; base64: string; ext: string } | { ok: false; error: string }>
  /**
   * Materialize a rendered picture's `data:` URL into the local generated-image store and
   * return its file:// URL — the only file URL shape the page builders accept. Lets an
   * upgrade/regenerate pass re-feed imagery already sitting on the canvas (local path only;
   * the cloud service cannot reach local bytes).
   */
  storeImageData?(dataUrl: string): Promise<{ ok: boolean; url?: string; error?: string }>
}

/** `attachment://<file name>` → decoded file name, or null when not an attachment reference. */
export function attachmentRefName(url: string): string | null {
  if (!url.toLowerCase().startsWith('attachment://')) return null
  const raw = url.slice('attachment://'.length).trim()
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Fixed minimal style for draft-mode pages (staged generation): the skeleton is
 *  deliberately plain — design comes later via upgrade_deck(stage:"style"). */
const DRAFT_STYLE =
  'Minimal draft layout: plain white background #FFFFFF, dark text #1A1A2E, a single accent #2563EB used sparingly, sans-serif fonts; every planned visual slot is a light-gray labeled placeholder box, not a real image'

/** Prefix the draft generator writes on visual placeholder boxes; upgrade_deck scans
 *  slide text for this prefix to recover the planned slots from the deck itself. */
export const DRAFT_SLOT_RE = /^\s*(IMAGE|CHART|INFOGRAPHIC|VISUAL)\s*[:：]/i

/** One row of the outline confirmation card. */
export interface OutlineProposalPage {
  title: string
  brief: string
  layout?: string
  /** Number of visual slots (image_queries + image_prompts) planned on this page */
  visuals?: number
}

/** Payload for the outline confirmation card shown before a new deck is generated. */
export interface OutlineProposal {
  coreHook: string
  topic?: string
  pages: OutlineProposalPage[]
  signal?: AbortSignal
}

/** Card verdict: approved (with page removals/title+brief edits), revise (feedback for
 *  re-planning), or cancelled. */
export type OutlineProposalResult =
  | { status: 'approved'; removed?: number[]; titles?: string[]; briefs?: string[] }
  | { status: 'revise'; feedback: string }
  | { status: 'cancelled' }

/** Single survey question structure (with options). */
export interface ClarifyQuestion {
  id: string
  label: string
  description?: string
  /** Option text array (≤5 per question); the frontend automatically appends "Other (fill in)" */
  options: string[]
  /** Multi-select (single-select by default) */
  multi?: boolean
}

const TOOLS: AgentToolDef[] = [
  {
    name: 'read_slide',
    description:
      'Read all elements of a page with full text (untruncated) and current colors (fill/text/stroke, hex). Call before rewriting a page.',
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: { type: 'integer', description: 'Page number (0-based)' },
      },
      required: ['slideIndex'],
    },
  },
  {
    name: 'execute_slide_script',
    description:
      "[Preferred tool for editing a slide's existing elements] Runs your JS edit script against one page; a single script covers: position/size/alignment/distribution/relative nudges/text/style/fill/stroke." +
      ' At run time the script automatically receives the real geometry and text of every element on the page (els) — **no read_slide needed first**; read-write combined, compute from els inside the script.' +
      ' The whole script is one atomic transaction: geometry in one batch, the rest in script order, one undo step; if any operation fails, everything rolls back and the page is unchanged — fix the script and resend it whole. A layout audit (overlap/out-of-bounds/text overflow) is returned at the end.' +
      ' Far more reliable than individual set_element_* calls — coordinate math happens at execution site, not from memory. If the audit reports problems, call this tool again immediately to fix.\n' +
      'Script environment (constrained synchronous JS-like DSL; no external APIs or ambient globals):\n' +
      '- els: array, each item {id,type,text,x,y,w,h,rotation,fontSizePt?,fill?,textColor?,strokeColor?,inGroup?,groupId?,locked?} (pixels, origin top-left; fill/textColor/strokeColor are current colors in #RRGGBB, read-only — write via setFill/setStyle/setStroke; inGroup+groupId=directly editable group child (all primitives work, coordinates absolute as shown); inGroup without groupId=nested in a sub-group, read-only — apply_ops ungroupElement on the outer group first; locked=layout decoration, read-only)\n' +
      '- canvas: {w,h} canvas size (px)\n' +
      "- setBox(id, {x?,y?,w?,h?,rotation?}): set an element's target box, pass only fields to change\n" +
      '- moveBy(id, dx, dy): relative move (left = negative dx, up = negative dy)\n' +
      '- resizeBy(id, dw, dh): relative resize\n' +
      '- setText(id, textOrParagraphs): replace text entirely; pass a string (split into paragraphs by \\n) or a paragraph array (same format as apply_ops setText paragraphs)\n' +
      '- setStyle(id, {fontSize?,color?,bold?,italic?,underline?,align?,fontFamily?}): change style without changing text, pass only fields to change\n' +
      "- setFill(id, colorOrNone): solid fill '#RRGGBB' or 'none'\n" +
      '- setStroke(id, {color?,widthPt?} | null): stroke; pass null to remove\n' +
      '- log(...): debug output (echoed back to you); the return value is echoed back to you (put a summary there)\n' +
      '- Supported computation: const/let, arithmetic, if/for/for...of/while, functions/arrows, JSON object/array literals, Math, regex.test, and safe array/string methods. No classes, async, modules, constructors, prototypes, or dynamic code.\n' +
      'Example 1 — three cards equal width, equal spacing:\n' +
      'const cards = els.filter(e => /card/.test(e.id));\n' +
      'const gap = 32, w = (canvas.w - 2*80 - (cards.length-1)*gap) / cards.length;\n' +
      'cards.forEach((c, i) => setBox(c.id, { x: 80 + i*(w+gap), y: 200, w, h: 320 }));\n' +
      "Example 2 — move the title left a bit: moveBy('title', -30, 0);\n" +
      "Example 3 — make the title blue and bold: setStyle('t1', { color: '#1a73e8', bold: true });",
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: { type: 'integer', description: 'Page number (0-based)' },
        code: {
          type: 'string',
          description:
            'JS script body (synchronous code; may use els/canvas plus setBox/moveBy/resizeBy/setText/setStyle/setFill/setStroke/log; may return a summary)',
        },
        explanation: {
          type: 'string',
          description:
            'One sentence describing what this script does (≤60 chars, shown to the user)',
        },
      },
      required: ['slideIndex', 'code'],
    },
  },
  {
    name: 'web_search',
    description:
      'Web search for text information (material/data/facts). Use when you need current information or are unsure about facts. Returns title/link/snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
        maxResults: { type: 'integer', description: 'Max results, default 6' },
      },
      required: ['query'],
    },
  },
  {
    name: 'image_search',
    description:
      'Search image assets (for slide imagery). Returns a list of imageUrl; after choosing, insert with insert_web_image. This is the FALLBACK source — prefer generate_image for new imagery and reach for image_search only when generation is unavailable/failed or the slot strictly needs a real-world photo (an actual place/product/person).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Image search keywords (English works better)' },
        maxResults: { type: 'integer', description: 'Max results, default 8' },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_image',
    description:
      'AI image generation/editing. Text-to-image, or pass referenceImageUrls for image editing; returns an image URL. NEW imagery: insert with insert_web_image. Editing an EXISTING slide picture (background removal/upscaling/etc.): swap it in place with replace_image — do not insert a duplicate. Use for custom illustrations/icons/backgrounds, style-consistent imagery; for real photos/screenshots still use image_search. NEVER use it to recreate an image the user attached (logo, photo) — embed the original with insert_web_image / replace_image and url=attachment://<file name>. Icons/logos/cutouts that must sit on slide content need transparentBackground:true — asking for a transparent background in the prompt does NOT work (models paint a fake gray checkerboard into the pixels).',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description:
            'Image description, English works better (keep any text to render in the image verbatim)',
        },
        model: {
          type: 'string',
          description:
            'Optional, defaults to the configured model. Account sign-in only — specify for special purposes: fal-bria-rmbg=background removal, fal-ai/recraft-clarity-upscale=upscale, flux-pro/outpaint=outpaint, fal-ai/image-editing/text-removal=remove text watermark',
        },
        referenceImageUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'URLs of reference images / images to edit (required for editing tasks)',
        },
        aspectRatio: {
          type: 'string',
          description: 'Aspect ratio: 1:1|4:3|16:9|9:16|3:4|2:3|3:2|auto',
        },
        transparentBackground: {
          type: 'boolean',
          description:
            'Set true when the result must have a real transparent background (icons, logos, cutouts placed over slide content). The app strips the background automatically after generation; never rely on the prompt for transparency.',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'analyze_media',
    description:
      'Analyze media content: understand images/audio/video (video and audio need VEGA, account sign-in or Gemini as the media provider). Pass media URLs (or local file paths) and analysis requirements; returns analysis text. Video supports extracting key points, structure, and time ranges — good for turning user material into usable deck content.',
    inputSchema: {
      type: 'object',
      properties: {
        mediaUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of media URLs or local file paths',
        },
        requirements: {
          type: 'string',
          description:
            'Analysis requirements (English): what to extract and how the result will be used (e.g. extract key points for slides)',
        },
      },
      required: ['mediaUrls', 'requirements'],
    },
  },
  {
    name: 'insert_web_image',
    description:
      'Download an image URL obtained from image_search or generate_image and insert it into a page (pixel coordinates). w×h is a layout frame, not a stretch target: the image keeps its aspect ratio, fills the frame, and the overflow is center-cropped (object-fit: cover) — pick the frame for the layout freely. ' +
      'To place an image the USER ATTACHED (logo, photo, screenshot), pass url=attachment://<file name> (the exact name from the attachment list) — the app embeds the original file bytes as-is. Never recreate an attached image with generate_image and never ask for base64.',
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: { type: 'integer' },
        url: {
          type: 'string',
          description:
            'Direct image link (imageUrl from image_search), or attachment://<file name> to embed a user-attached image as-is',
        },
        x: { type: 'number' },
        y: { type: 'number' },
        w: { type: 'number' },
        h: { type: 'number' },
      },
      required: ['slideIndex', 'url', 'x', 'y', 'w', 'h'],
    },
  },
  {
    name: 'replace_image',
    description:
      'Swap a picture\'s source image for a URL (from image_search or generate_image) in place — position, size, z-order, border and effects all survive. This is the tool for "change/AI-edit this image" flows: e.g. run generate_image with referenceImageUrls for background removal/upscaling/editing, then replace_image with the returned URL. A new image with a different aspect ratio is never stretched: it fills the frame and is center-cropped (object-fit: cover). keepCrop keeps the existing crop window and is only correct when the new image has the same pixel geometry as the old one (e.g. background removal output).',
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: { type: 'integer' },
        sourceId: { type: 'string', description: 'Picture element id' },
        url: { type: 'string', description: 'Direct image link' },
        keepCrop: { type: 'boolean', description: 'Keep the existing crop window (default false)' },
      },
      required: ['slideIndex', 'sourceId', 'url'],
    },
  },
  {
    name: 'ask_clarification',
    description:
      "[Call before creating a whole new deck] Shows a questionnaire card with options, letting the user make key choices for this deck (audience/scenario/tone/focus etc.); the user's choices directly determine the deck's Core Hook and style. Questions must target the specific topic, each being a real trade-off (options represent different directions). Ask 2–4 questions, ≤5 options each. After calling, wait for the user to finish choosing in the card and generate once you have the answers. Don't repeat the questions in your reply text.",
    inputSchema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          description: 'Question list (2–4 questions)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique question id (short English/pinyin)' },
              label: { type: 'string', description: 'Question text' },
              description: { type: 'string', description: 'Optional one-line note' },
              options: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Options (≤5); the frontend automatically appends "Decide for me" and "Other"',
              },
              multi: { type: 'boolean', description: 'Multi-select (single-select by default)' },
            },
            required: ['id', 'label', 'options'],
          },
        },
      },
      required: ['questions'],
    },
  },
  {
    name: 'regenerate_slide',
    description:
      '[Redo/redesign an existing page] Regenerates the page from your brief and replaces it in place (other pages untouched, undoable).' +
      ' Use when the user says "redo this page / redesign it / try another layout / make it prettier"; don\'t dismantle the page element by element with native tools.' +
      " Flow: first read_slide to get the page's current content, then check neighboring pages in the deck outline to grasp the deck's style;" +
      ' write a detailed brief — what to keep (copy real text/data into the brief verbatim), what to change, and the target layout; the deck style is applied automatically.' +
      ' If the page needs images, generate them first with generate_image (image_search only when generation is unavailable or a real-world photo is strictly required) and pass real URLs in image_urls.' +
      ' If generation fails, it is usually a temporary error: do NOT loop retrying — make the concrete changes in place with execute_slide_script instead (or tell the user to try again in a few minutes).',
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: { type: 'integer', description: 'Page to redo (0-based)' },
        brief: {
          type: 'string',
          description:
            'Content and layout brief for the new page: what goes in each region (copy the real copy/data to keep into the brief), and the layout to use (e.g. three_column_cards/hero_big_number/two_column/timeline).',
        },
        title: { type: 'string', description: 'Page title' },
        layout: { type: 'string', description: 'Layout intent name (optional)' },
        image_urls: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Real http(s) image URLs for this page (generate_image first, image_search only as fallback; [] for none)',
        },
        dataSource: {
          type: 'string',
          enum: ['user', 'document', 'search', 'sample'],
          description:
            "Required when the brief carries specific figures (%, money, magnitudes): where they came from — 'user'/'document'/'search' (run web_search first)/'sample' (disclose to the user)",
        },
      },
      required: ['slideIndex', 'brief'],
    },
  },
  {
    name: 'generate_deck',
    description:
      '[First choice for creating a whole new deck — staged, so the user reviews before the slow work runs]' +
      ' Pass topic + approx_pages (+ optional style hint/research/context) and OMIT detail. For a new deck the system defaults to the staged flow itself — even when you pass explicit pages: web research and outline planning run concurrently, the user CONFIRMS the outline in a card (they can drop/rename pages or send it back), then a text draft lands page by page as each page finishes. **Do not pass detail:"full" for a new deck — imagery and the design system are separate steps afterwards, only when the user asks, via upgrade_deck.** detail:"full" is for insert_mode:"append" pages or when the user explicitly demands the finished designed deck in one shot.' +
      ' You don\'t hand-write dozens of pages, and neither "only page 1 got generated" nor "arguments were truncated" can happen — the page count is guaranteed by the system loop.' +
      ' When the topic needs facts/data, prefer passing research queries (run internally, in parallel with planning) over a separate web_search turn — it removes a full round trip.' +
      ' (If you already know each page you may pass core_hook+style+pages directly; pages[].image_queries describes each real-world visual slot, pages[].image_prompts each bespoke visual — in a full run both are AI-GENERATED internally; if you already know real http(s) URLs pass them in image_queries — the system respects existing URLs and does not re-resolve them.)' +
      ' To add a few pages to an existing deck, pass pages (briefs for just the new pages) + insert_mode:"append" + detail:"full".',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description:
            "[Recommended] The deck's topic/requirements description (with topic you don't hand-write pages; the system plans internally)",
        },
        approx_pages: {
          type: 'integer',
          description: 'Expected page count (used together with topic)',
        },
        context: {
          type: 'string',
          description:
            'Optional: real material/data/questionnaire answers from web_search, so internal planning uses real content',
        },
        research: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional: web-search queries the system runs INTERNALLY, in parallel with style generation and outline planning (the digest feeds the page briefs). Prefer this over a separate web_search turn when creating a deck — it removes a full round trip. If you already searched, pass the material in context instead.',
        },
        core_hook: {
          type: 'string',
          description:
            'Optional: a narrative anchor you already decided (recommended alongside pages)',
        },
        style: {
          type: 'string',
          description:
            'Unified design system: primary/secondary colors, fonts, content margins, card corners (required with pages; optional as a style hint with topic)',
        },
        pages: {
          type: 'array',
          description:
            'Optional: pass directly when you already know each page (as many pages generated as planned). With many pages prefer topic and internal planning, to avoid over-long truncated arguments',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Page title' },
              type: { type: 'string', description: 'cover|content|data|closing' },
              brief: {
                type: 'string',
                description: 'Page content description (use real data/facts)',
              },
              layout: { type: 'string', description: 'Layout (content pages must not repeat)' },
              image_queries: {
                type: 'array',
                items: { type: 'string' },
                description:
                  "English description of each real-world visual slot on this page (actual places, products, people, brands) — the system AI-GENERATES each internally and fills real URLs back (a stock photo search runs only as fallback when generation is unavailable or misses); if you already know real http(s) URLs pass them directly (respected, not re-resolved); [] for no images",
              },
              image_prompts: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Optional: English prompts for AI-GENERATED bespoke visuals (hero/cover art, conceptual illustrations, abstract backgrounds) — the system generates each one internally and fills real URLs back (search only as fallback). Same mechanism as image_queries; split them only by intent — real-world subjects in image_queries, bespoke art here.',
              },
            },
            required: ['title', 'brief', 'layout'],
          },
        },
        insert_mode: {
          type: 'string',
          enum: ['replace', 'append'],
          description:
            'replace (default, new whole deck) = replace everything; append = append at the end',
        },
        detail: {
          type: 'string',
          enum: ['draft', 'full'],
          description:
            'Omit it when creating a new deck from a topic — the system defaults to the staged fast pass (outline confirmation card, then a text draft with labeled visual placeholders; imagery/design come later via upgrade_deck). "full" = complete designed pages with imagery in one shot — use when passing explicit pages, with insert_mode:"append", or when the user explicitly demands the finished deck immediately.',
        },
        style_template: {
          type: 'string',
          description:
            "Optional: name of a saved style template (from list_style_templates); when passed, Step 0 is skipped and the template's styleSkill is used directly, no style regeneration",
        },
        dataSource: {
          type: 'string',
          enum: ['user', 'document', 'search', 'sample'],
          description:
            "Required when topic/context/briefs carry specific figures (%, money, magnitudes): where they came from — 'user'/'document'/'search' (run web_search first)/'sample' (disclose to the user)",
        },
      },
    },
  },
  {
    name: 'upgrade_deck',
    description:
      '[Second step of staged generation — run only when the user asks after a draft landed] Upgrades pages IN PLACE, keeping every page\'s text verbatim.' +
      ' stage:"visuals" fills the labeled placeholder boxes (IMAGE:/CHART:) with real imagery — each slot is AI-generated first, photo search as fallback — and renders data placeholders as real composed visuals;' +
      ' stage:"style" applies one unified design system (a fresh Style Skill, or a saved template via style_template);' +
      ' stage:"full" does both. Pages are regenerated in place in parallel batches (other pages untouched, each landing is undoable).' +
      ' Typical flow: generate_deck(detail:"draft") → user likes the structure → upgrade_deck(stage:"visuals") → upgrade_deck(stage:"style").',
    inputSchema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['visuals', 'style', 'full'],
          description:
            'visuals = fill image/chart slots; style = apply a unified design system; full = both',
        },
        pages: {
          type: 'array',
          items: { type: 'integer' },
          description:
            'Optional: 1-based page numbers to upgrade (default: all pages of the deck)',
        },
        style_hint: {
          type: 'string',
          description:
            'Optional style direction for stage style/full (e.g. "dark navy + gold, corporate"); without it the system picks a professional style fitting the topic',
        },
        style_template: {
          type: 'string',
          description:
            'Optional: name of a saved style template (list_style_templates) — skips style generation',
        },
      },
      required: ['stage'],
    },
  },
  {
    name: 'save_style_template',
    description:
      '[Save the current deck\'s style as a reusable template] Saves the current presentation\'s Style Skill (visual style guide) under the given name; next time you generate a deck, pass the style_template argument to reuse it directly and skip style generation. Call when the user says "save this style" / "save as template".',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Template name (short, e.g. "minimal-blue" or "tech-dark")',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_style_templates',
    description:
      'List all saved style templates (name + topic + createdAt). When the user says "use last time\'s style" or "use some template", call this first to see what exists, then pass the target template name to generate_deck\'s style_template argument.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'edit_chart',
    description:
      'Modify a chart (including charts from imported files; first edit converts it to editable automatically): change type/data/colors/chart elements. kind options: bar/barStacked/line/area/pie/doughnut. colorScheme: default/colorful/colorful2/mono-accent1..6 (theme-derived); legacy keys blue/warm/cool/mono still work.',
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: { type: 'integer' },
        sourceId: { type: 'string', description: 'Chart element id (type=chart)' },
        kind: {
          type: 'string',
          enum: ['bar', 'barStacked', 'line', 'area', 'pie', 'doughnut'],
          description: 'Change chart type (optional)',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'X-axis/category labels (optional)',
        },
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              values: { type: 'array', items: { type: 'number' } },
            },
            required: ['name', 'values'],
          },
          description: 'Data series (optional)',
        },
        dataSource: {
          type: 'string',
          enum: ['user', 'document', 'search', 'sample'],
          description:
            "Required when passing series: provenance of the values ('user'/'document'/'search'/'sample'; 'search' needs a prior web_search, 'sample' must be disclosed to the user)",
        },
        colorScheme: {
          type: 'string',
          description: 'Color scheme (optional): default/colorful/colorful2/mono-accent1..6',
        },
        title: { type: 'string', description: 'Chart title (optional)' },
        legendPos: {
          type: 'string',
          enum: ['b', 't', 'r', 'l', 'none'],
          description: 'Legend position (optional)',
        },
        dataLabels: { type: 'boolean', description: 'Data labels toggle (optional)' },
        gridlines: { type: 'boolean', description: 'Value-axis gridlines toggle (optional)' },
        switchRowCol: {
          type: 'boolean',
          description: 'Switch rows/columns: categories ↔ series (optional)',
        },
      },
      required: ['slideIndex', 'sourceId'],
    },
  },
  {
    name: 'apply_ops',
    description:
      '[Canonical edit surface] Apply a list of canonical edit ops as ONE transaction — atomic by default: any failure rolls everything back, nothing is half-applied. Set dry_run:true to validate the plan without touching the deck (rehearse risky batches). This is THE tool for every edit without a dedicated tool (fill, stroke, transform, delete, z-order, grouping, crop, opacity, effects, links, table cells, structure and styling, page background, speaker notes, page delete/move/duplicate, transitions, sections, theme) and for multi-page or many-element batches; a single op is a perfectly fine batch. For one-page layout math prefer execute_slide_script.\n' +
      'Addressing: every op takes target:{slide, el?} — slide = 0-based index or durable "s_<n>"; el = an element id from the outline/read_slide (e_* ids are durable). Group children: put the child id in target.el and add group:"<group id>".\n' +
      'Units are document-space EMU. read_slide reports px and its exact "1 px = N EMU" factor — convert with that N (9525 only on a standard 16:9 deck; other page sizes differ). Font sizes are pt.\n' +
      'Full op reference (the same executor every editing surface uses), one signature per op; ? marks optional fields:\n' +
      opSignatureIndex() +
      '\naddChart additionally takes dataSource:"user"|"document"|"search"|"sample" (figure provenance, checked before the batch runs; "search" needs a web_search in this conversation).' +
      '\nFor field tables, runnable JSON examples and common mistakes call load_guide with the group name(s) above before a batch you have not done before. ' +
      "A failing op's error also returns its exact one-line signature, and dry_run rehearses the whole batch without touching the deck. An unknown op name returns the full vocabulary.",
    inputSchema: {
      type: 'object',
      properties: {
        ops: {
          type: 'array',
          items: { type: 'object' },
          description: 'The op list, applied in order as one transaction (at most 50)',
        },
        dry_run: { type: 'boolean', description: 'Validate the plan only; the deck is untouched' },
        isolation: {
          type: 'string',
          enum: ['atomic', 'per_op'],
          description: 'atomic (default): all-or-nothing. per_op: independent ops, failures skip.',
        },
      },
      required: ['ops'],
    },
  },
  {
    name: 'load_guide',
    description:
      'Load the full documentation of one or more op groups into context: field tables with types and units, runnable JSON examples, common mistakes. Call it before an apply_ops batch that uses ops you have not used in this conversation; several groups can be loaded at once.\n' +
      'Available groups:\n' +
      opGuideCatalog(),
    inputSchema: {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: { type: 'string', enum: [...OP_GROUPS] },
          description: 'Group names to load, e.g. ["element","slide"]',
        },
      },
      required: ['groups'],
    },
  },
]

/** Collect readable text of nodes (including nested group children); returns a list of [sourceId, type, text] */
/** Find one node by id in the node tree (including groups). */
function findNodeById(nodes: RenderNode[], id: string): RenderNode | undefined {
  for (const n of nodes) {
    if (n.sourceId === id || n.durableId === id) return n
    if (n.type === 'group') {
      const hit = findNodeById(n.children, id)
      if (hit) return hit
    }
  }
  return undefined
}

/**
 * Editable context of an element: a top-level node, or a direct child of a top-level group
 * (with groupId + the group's absolute origin for abs↔group-local px conversion — child render
 * boxes are group-local, matching the in-group edit IPCs). Deeper nesting returns {nested:true}:
 * the main process patches one level only, so those stay read-only until ungrouped.
 */
type EditTarget =
  { node: RenderNode; groupId?: string; groupOrigin?: { x: number; y: number } } | { nested: true }
function resolveEditTarget(slide: RenderSlide, sourceId: string): EditTarget | null {
  const matches = (n: RenderNode) => n.sourceId === sourceId || n.durableId === sourceId
  for (const n of slide.nodes) {
    if (matches(n)) return { node: n }
    if (n.type === 'group') {
      const g = n as GroupRenderNode
      const child = g.children.find(matches)
      if (child)
        return {
          node: child,
          groupId: n.sourceId,
          groupOrigin: { x: Math.round(n.box.x), y: Math.round(n.box.y) },
        }
      if (findNodeById(g.children, sourceId)) return { nested: true }
    }
  }
  return null
}

/** Editable element ids of a slide (locked layout decorations excluded), with short text hints. */
function availableIdList(slide: RenderSlide, withText = false): string {
  return collectNodeInfos(slide.nodes)
    .filter((n) => !n.locked)
    .map((n) => (withText && n.text?.trim() ? `${n.id} ("${preview(n.text, 12)}")` : n.id))
    .join(', ')
}

/**
 * Shared not-found / nested-in-subgroup error text for element-targeting tools. Guided: the
 * not-found branch lists the ids that DO exist — models self-correct from the list, but
 * blind-retry a bare "not found".
 */
function targetError(
  target: EditTarget | null,
  sourceId: string,
  pageNo: number,
  slide?: RenderSlide,
): string | null {
  if (!target) {
    const avail = slide ? ` Elements on this page: [${availableIdList(slide)}].` : ''
    return `Element ${sourceId} not found on page ${pageNo}.${avail} (e_* ids are durable across edits/saves; call read_slide when in doubt)`
  }
  if ('nested' in target)
    return `Element ${sourceId} is nested inside a sub-group; ungroup the outer group first (apply_ops ungroupElement), or edit the sub-group as a whole`
  return null
}

/** Element info shared by outline/read_slide/edit scripts (includes absolute geometry; locked = layout decoration, read-only). */
type NodeInfo = LayoutScriptElement

function nodeText(n: RenderNode): string {
  if (n.type === 'shape' || n.type === 'text') {
    return ((n as ShapeRenderNode).text?.lines ?? [])
      .map((line) => line.runs.map((r) => r.text).join(''))
      .join('\n')
  }
  if (n.type === 'table') {
    // Tables join cell text row by row (tab-separated) so the AI can read table content
    const byRow = new Map<number, string[]>()
    for (const c of n.cells) {
      const t = (c.text?.lines ?? []).map((l) => l.runs.map((r) => r.text).join('')).join(' ')
      const row = byRow.get(c.y) ?? []
      row.push(t)
      byRow.set(c.y, row)
    }
    return [...byRow.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, r]) => r.join('\t'))
      .join('\n')
  }
  return ''
}

/** Max font size of the text (pt, converted back from px); returns undefined when there is no text. */
function nodeMaxFontPt(n: RenderNode): number | undefined {
  if (n.type !== 'shape' && n.type !== 'text') return undefined
  let maxPx = 0
  for (const line of (n as ShapeRenderNode).text?.lines ?? []) {
    for (const r of line.runs) if (r.fontSizePx > maxPx) maxPx = r.fontSizePx
  }
  return maxPx > 0 ? Math.round((maxPx * 72) / 96) : undefined
}

/** Normalize a render color to #RRGGBB (strips alpha); undefined when not a hex color. */
function hex6(color: string | undefined): string | undefined {
  if (!color) return undefined
  const m = /^#([0-9a-fA-F]{6})/.exec(color.trim())
  return m ? `#${m[1].toUpperCase()}` : undefined
}

/** Dominant text color = the run color covering the most characters (bullets excluded). */
function dominantTextColor(n: RenderNode): string | undefined {
  if (n.type !== 'shape' && n.type !== 'text') return undefined
  const weight = new Map<string, number>()
  for (const line of (n as ShapeRenderNode).text?.lines ?? []) {
    for (const r of line.runs) {
      if (r.isBullet) continue
      const c = hex6(r.color)
      if (c) weight.set(c, (weight.get(c) ?? 0) + r.text.length)
    }
  }
  let best: string | undefined
  let max = 0
  for (const [c, w] of weight) {
    if (w > max) {
      best = c
      max = w
    }
  }
  return best
}

/** Readable colors of a node (solid fill / dominant text color / stroke); pictures only expose stroke. */
function nodeColors(n: RenderNode): Pick<NodeInfo, 'fill' | 'textColor' | 'strokeColor'> {
  const out: Pick<NodeInfo, 'fill' | 'textColor' | 'strokeColor'> = {}
  if (n.type === 'shape' || n.type === 'text') {
    const s = n as ShapeRenderNode
    if (s.fill.kind === 'solid') {
      const c = hex6(s.fill.color)
      if (c) out.fill = c
    }
    const stroke = hex6(s.stroke?.color)
    if (stroke) out.strokeColor = stroke
    const text = dominantTextColor(n)
    if (text) out.textColor = text
  } else if (n.type === 'picture') {
    const stroke = hex6((n as PictureRenderNode).stroke?.color)
    if (stroke) out.strokeColor = stroke
  }
  return out
}

/**
 * Collect node info (including nested group children). A child's box is in group-local
 * coordinates (ext/chExt scaling already baked into geometry at build time); here we add the
 * group offset to convert to absolute coordinates and set the inGroup flag. Direct children of a
 * top-level group also carry groupId (editable via the in-group pipeline); deeper nesting stays
 * read-only (the main process patches one level only).
 */
function collectNodeInfos(
  nodes: RenderNode[],
  ox = 0,
  oy = 0,
  parent?: { id: string; topLevel: boolean },
): NodeInfo[] {
  const out: NodeInfo[] = []
  for (const n of nodes) {
    const b = n.box
    const abs = {
      x: Math.round(ox + b.x),
      y: Math.round(oy + b.y),
      w: Math.round(b.w),
      h: Math.round(b.h),
    }
    const base: NodeInfo = {
      // Durable id when the element's bytes carry one — survives regenerate/
      // ungroup/save, so the AI can keep addressing across turns
      id: n.durableId ?? n.sourceId,
      type: n.type,
      text: nodeText(n),
      ...abs,
      rotation: b.rotationDeg,
      ...(parent ? { inGroup: true } : {}),
      ...(parent?.topLevel ? { groupId: parent.id } : {}),
      ...(n.decoration ? { locked: true } : {}),
      ...nodeColors(n),
    }
    const fontPt = nodeMaxFontPt(n)
    if (fontPt !== undefined) base.fontSizePt = fontPt
    out.push(base)
    if (n.type === 'group') {
      const g = n as GroupRenderNode
      out.push(
        ...collectNodeInfos(g.children, abs.x, abs.y, {
          id: n.durableId ?? n.sourceId,
          topLevel: !parent,
        }),
      )
    }
  }
  return out
}

function preview(text: string, max = 50): string {
  const flat = text.replace(/\n/g, ' / ')
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

/**
 * data: URLs of the pictures on a slide (groups included), largest first. Render nodes
 * keep only the embedded bytes — the original image URL is gone once a page lands — so
 * re-feeding existing imagery through an upgrade means materializing these bytes back
 * into the generated-image store (see DeckAccess.storeImageData).
 */
function pictureDataUrls(nodes: RenderNode[] | undefined): string[] {
  const pics: { area: number; url: string }[] = []
  const walk = (list: RenderNode[]) => {
    for (const n of list) {
      if (n.type === 'picture') {
        const d = (n as PictureRenderNode).dataUrl
        if (d) pics.push({ area: n.box.w * n.box.h, url: d })
      } else if (n.type === 'group') walk((n as GroupRenderNode).children)
    }
  }
  if (nodes) walk(nodes)
  pics.sort((a, b) => b.area - a.area)
  return pics.map((p) => p.url)
}

function buildDeckOutline(slides: RenderSlide[], current: number, selectedIds: string[]): string {
  const canvas = slides[0] ? `Canvas ${slides[0].widthPx}×${slides[0].heightPx}px.` : ''
  const lines: string[] = [
    `The presentation has ${slides.length} pages; page ${current + 1} is currently shown. ${canvas}`,
    `(Page order is the current actual order and may differ from generation time or earlier conversation; the user's "page N" refers to this outline)`,
  ]
  if (selectedIds.length > 0) {
    const currentSlide = slides[current]
    const selectedRefs = selectedIds.map((id) => {
      const node = currentSlide ? findNodeById(currentSlide.nodes, id) : undefined
      return node?.durableId ?? node?.sourceId ?? id
    })
    lines.push(`User selected elements: ${selectedRefs.join(', ')}`)
  }
  slides.forEach((slide, i) => {
    lines.push(`Page ${i + 1} (slideIndex=${i}):`)
    const infos = collectNodeInfos(slide.nodes)
    const fillCount = new Map<string, number>()
    for (const n of infos) {
      if (n.fill) fillCount.set(n.fill, (fillCount.get(n.fill) ?? 0) + 1)
    }
    const mainFills = [...fillCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c, count]) => (count > 1 ? `${c}×${count}` : c))
    if (mainFills.length > 0) lines.push(`  main fills: ${mainFills.join(' ')}`)
    for (const n of infos) {
      lines.push(`  - ${n.id} | ${n.type}${n.text ? ` | "${preview(n.text)}"` : ''}`)
    }
  })
  lines.push('(Use read_slide to see element positions/sizes/colors)')
  return lines.join('\n')
}

/**
 * Element inventory of one slide as read_slide reports it (ids + geometry + colors + text).
 * Shared by the read_slide tool and the post-generation layout QC pass (slide-qc.ts), so the
 * QC model maps screenshot pixels back to the same ids/coordinates the edit tools accept.
 */
export function formatSlideDump(slide: RenderSlide): string {
  const infos = collectNodeInfos(slide.nodes)
  const parts = infos.map((n) => {
    const flags = [
      n.groupId
        ? `in group ${n.groupId} (directly editable)`
        : n.inGroup
          ? 'nested in a sub-group (read-only; apply_ops ungroupElement on the outer group to edit)'
          : '',
      n.locked ? 'layout decoration (read-only)' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const rot = n.rotation ? ` rotation ${Math.round(n.rotation)}°` : ''
    const font = n.fontSizePt ? ` font ${n.fontSizePt}pt` : ''
    const colors = [
      n.fill ? `fill${n.fill}` : '',
      n.textColor ? `text${n.textColor}` : '',
      n.strokeColor ? `stroke${n.strokeColor}` : '',
    ]
      .filter(Boolean)
      .join(' ')
    const head = `${n.id} | ${n.type}${flags ? ` | ${flags}` : ''} | pos(${n.x},${n.y}) size ${n.w}×${n.h}${rot}${font}${colors ? ` | ${colors}` : ''}`
    return n.text ? `${head}\n${n.text}` : `${head} | (no text)`
  })
  const colorlessTypes = [
    ...new Set(
      infos
        .filter((n) => !n.fill && !n.textColor && !n.strokeColor)
        .filter((n) => n.type === 'picture' || n.type === 'chart')
        .map((n) => n.type),
    ),
  ]
  const colorNote = colorlessTypes.length
    ? `\n(${colorlessTypes.join('/')} colors not available)`
    : ''
  // Report the real px→EMU factor: render px carry the viewport scale, so ×9525 only
  // holds for decks whose baseline width is exactly the fit width (standard 16:9 at 1280).
  const pxToEmu = +(9525 / slide.scale).toFixed(2)
  return `Canvas ${slide.widthPx}×${slide.heightPx}px (1 px = ${pxToEmu} EMU)\n${parts.join('\n---\n') || '(no elements on this page)'}${colorNote}`
}

/** tools that need a media provider: account login + cloud tools, or a BYOK media key in Settings */
function hiddenMediaTools(access: DeckAccess): Set<string> {
  const hidden = new Set<string>()
  if (access.imageGenAvailable?.() === false) hidden.add('generate_image')
  if (access.mediaAnalysisAvailable?.() === false) hidden.add('analyze_media')
  return hidden
}

function mediaToolsOffNote(hidden: Set<string>): string {
  if (hidden.size === 0) return ''
  const plural = hidden.size > 1
  return `\n\nNote: ${[...hidden].join(' and ')} ${plural ? 'are' : 'is'} currently unavailable (no image/media provider: signed out of VEGA or cloud tools off, and no media API key in Settings). Do not call or promise ${plural ? 'them' : 'it'}; for imagery use image_search + insert_web_image instead.`
}

export function createSlidesSkill(access: DeckAccess): AgentSkill {
  // The HTML pipeline was already used in this conversation → later calls without an explicit mode default to append.
  // Safety net for when the AI ignores the "pass all pages at once" constraint: separate calls no longer overwrite each other (P0-1).
  const state: SkillState = { htmlGenerated: false }
  return {
    id: 'slides',
    // live like tools: the off-note overrides the prose that still mentions the hidden tools
    get systemPrompt() {
      return systemPrompt + mediaToolsOffNote(hiddenMediaTools(access))
    },
    // live view: the predicates are re-read before every model request
    get tools() {
      const hidden = hiddenMediaTools(access)
      return hidden.size ? TOOLS.filter((t) => !hidden.has(t.name)) : TOOLS
    },
    buildContext: () => {
      const outline = `<deck outline>\n${buildDeckOutline(access.getSlides(), access.getCurrent(), access.getSelectedIds())}\n</deck outline>`
      const progress = buildProgressNote(state)
      const draft = state.draftDeck
        ? '<deck-status>This deck is a DRAFT (staged generation): plain layout, labeled placeholder boxes where visuals go. When the user asks for imagery/infographics → upgrade_deck(stage:"visuals"); for a unified design → upgrade_deck(stage:"style"); for both → stage:"full".</deck-status>'
        : ''
      return [outline, progress, draft].filter(Boolean).join('\n')
    },
    executeTool: (call, signal) => executeTool(access, call, state, signal),
  }
}

interface SkillState {
  htmlGenerated: boolean
  /** A web_search ran in this conversation — unlocks dataSource:'search' in the figure gate */
  webSearched?: boolean
  /** Number of pages most recently planned by plan_deck, used by the progress checklist to remind the AI to finish */
  plannedPages?: number
  /** Per-page titles planned by plan_deck (order = page order), used to name unfinished pages in the checklist */
  plannedTitles?: string[]
  /** Whether each planned page has been generated (aligned with plannedTitles) — names unfinished pages accurately even when a middle page fails */
  pageDone?: boolean[]
  /** Style Skill produced by the most recent generate_deck (used by save_style_template) */
  lastStyleSkill?: string
  /** Topic of the most recent generate_deck (used by save_style_template) */
  lastTopic?: string
  /** The deck on canvas is a staged-flow draft (plain layout + labeled visual slots awaiting upgrade_deck) */
  draftDeck?: boolean
  /** The draft's visual slots were already filled by upgrade_deck(visuals|full) — only the design stage may still be pending */
  draftVisualsDone?: boolean
  /** Per-page visual slot descriptions captured at generation (aligned with plannedTitles);
   *  for a full (non-draft) run the entries are the resolved image URLs instead of keywords */
  draftImageSlots?: string[][]
  /** normKey(slot text) → image URL resolved by an earlier visuals pass. Persisted across
   *  upgrade_deck calls so a later style/design restyle re-feeds the same generated images
   *  instead of dropping them or resurrecting placeholder boxes. */
  draftResolvedSlots?: Record<string, string>
  /** Per-page image URLs last fed into a page (re)generation — covers decks that never
   *  had draft slots (imports, manual decks) and canvas pictures materialized to file://
   *  by a previous upgrade, so a re-restyle doesn't rematerialize or lose them. */
  draftPageImages?: string[][]
  /** Canvas-index offset of draftImageSlots: planned pages align with the deck 1:1 for
   *  replace/full runs, but for insert_mode:"append" slots[0] is the first APPENDED
   *  page — it lands at canvas index = number of pre-existing slides. */
  draftSlotsOffset?: number
}

/**
 * [Hard constraint against "hand-building from scratch"] Sometimes the AI skips the HTML
 * pipeline and assembles a whole deck element by element with addElement/addSmartArt ops —
 * such hand-built pages look crude and the layout falls apart (root cause of screenshot issues).
 * "From-scratch" detection: this session hasn't used the HTML pipeline (!htmlGenerated) AND the
 * deck has almost no real content (≤ 2 non-decoration elements with text, i.e. blank/initial
 * template). If so, reject and steer toward generate_deck. Adding a single element to an
 * existing rich deck / fine-tuning after the HTML pipeline are unaffected.
 */
function blockScratchBuild(
  kind: 'element' | 'smartart',
  slides: RenderSlide[],
  state?: SkillState,
): { output: string; isError: true; mutated: false; summary: string } | null {
  if (state?.htmlGenerated) return null // Went through the HTML pipeline; subsequent native edits are legitimate
  let contentEls = 0
  for (const slide of slides) {
    for (const n of collectNodeInfos(slide.nodes)) {
      if (!n.locked && n.text && n.text.trim() !== '') contentEls += 1
    }
  }
  if (contentEls > 2) return null // Deck already has real content; this is a refinement scenario, allow it
  const label = kind === 'smartart' ? t('aiLabelInsertSmartart') : t('aiFailNewElement')
  return {
    output:
      "For blank/from-scratch scenarios don't hand-assemble pages element by element with addElement/addSmartArt/addTable/addChart ops (crude layout). " +
      'Use the generation pipeline instead: new whole deck → generate_deck; new pages for an existing deck → generate_deck(pages, insert_mode:"append"). ' +
      'Write it beautifully in HTML/CSS and the system converts it into editable elements. Use insert ops only when the deck already has polished content and one element needs refining.',
    isError: true,
    mutated: false,
    summary: t('aiSumFromScratchGuard', { label }),
  }
}

/**
 * Build the generation progress checklist text — injected to the AI each turn via buildContext
 * so it "sees" which pages are still missing, a mechanical reminder to finish (rather than a
 * one-shot prompt constraint). Returns an empty string when there is no plan.
 */
function buildProgressNote(state?: SkillState): string {
  if (!state || !state.plannedPages) return ''
  const planned = state.plannedPages
  const flags = state.pageDone ?? new Array(planned).fill(false)
  const done = flags.filter(Boolean).length
  const titles = state.plannedTitles ?? []
  if (done >= planned) {
    return `<generation-progress>\n✅ Complete: ${planned} pages planned, all generated (${done} pages).\n</generation-progress>`
  }
  // Name unfinished pages one by one from pageDone (page numbers stay accurate when a middle page fails)
  const remaining: string[] = []
  for (let i = 0; i < planned; i++) {
    if (!flags[i]) remaining.push(`page ${i + 1}${titles[i] ? ` "${titles[i]}"` : ''}`)
  }
  return (
    `<generation-progress>\n` +
    `⚠️ Incomplete: ${planned} pages planned, ${done} generated, ${planned - done} still missing.\n` +
    `Unfinished: ${remaining.join(', ')}.\n` +
    `Immediately fill in the unfinished pages above with generate_deck(pages: briefs for the missing pages, insert_mode:"append"); do not stop and do not substitute native tools.\n` +
    `</generation-progress>`
  )
}

const fail = (summary: string, output: string) => ({
  output,
  isError: true,
  mutated: false,
  summary,
})

// ── Figure-provenance gate ────────────────────────────────────
// Prompt rules ("search before writing data") did not stop invented numbers being
// delivered as fact, so provenance is enforced at the tool layer: chart data and
// data-dense briefs must declare a dataSource, 'search' is only accepted after a
// real web_search in this conversation, and 'sample' figures must be disclosed.

/** Specific figures: percentages, money, magnitude units, decimals — not bare years/counts */
const SPECIFIC_FIGURE_RE =
  /\d[\d,.]*\s*(?:%|％|亿|萬|万|兆|billion|million|\bbn\b|\bmn\b)|[¥￥$€£]\s*\d|\d+\.\d+/g

function countSpecificFigures(text: string): number {
  return text.match(SPECIFIC_FIGURE_RE)?.length ?? 0
}

/**
 * Returns an error message when the declared dataSource does not justify the figures
 * this call carries, null when the call may proceed.
 */
function dataSourceGateError(call: AgentToolCall, state: SkillState | undefined): string | null {
  return dataSourceGateErrorForInput(call.input, state)
}

/** Same gate over a plain argument object (an apply_ops op carries dataSource as an extra field). */
function dataSourceGateErrorForInput(
  input: Record<string, unknown>,
  state: SkillState | undefined,
): string | null {
  const src = String(input.dataSource ?? '')
  if (src === 'user' || src === 'document' || src === 'sample') return null
  if (src === 'search') {
    if (state?.webSearched) return null
    return (
      "dataSource is 'search' but no web_search has run in this conversation. " +
      'Run web_search first and build the figures from the results (cite them to the user), ' +
      "or declare 'user'/'document' if the figures actually came from the user or this deck."
    )
  }
  return (
    'This call carries specific figures, so dataSource is required: ' +
    "'user' (figures supplied by the user or attachments), 'document' (read from this deck), " +
    "'search' (from web_search results — run it first), or 'sample' (illustrative placeholders; " +
    'you must tell the user they are NOT real data). Never present invented numbers as facts.'
  )
}

/** Appended to a successful tool output when the model declared the figures illustrative. */
const SAMPLE_DATA_NOTE =
  '\nNOTE: dataSource is "sample" — you MUST tell the user these figures are illustrative placeholders, not real data, and offer to research real numbers with web_search.'

/** Append the missing-image report to the tool output: the model learns which pages lack images and how to fix them, instead of silently treating it as success. */
function imageFailNote(fails?: { page: number; url: string }[]): string {
  if (!fails?.length) return ''
  const detail = fails.map((f) => `page ${f.page} (${f.url})`).join(', ')
  return `\n⚠️ Missing images: ${detail} failed to download/convert; those image slots are blank on the page. Produce a working image (generate_image first, or image_search with more generic English keywords), patch it onto the page with insert_web_image (slideIndex = page number - 1), then reply to the user.`
}

/**
 * Activity-chip label per op for single-op apply_ops runs, so the panel still
 * reads "Edit text" / "Move element" instead of a bare count now that the
 * dedicated tools are gone. Multi-op batches fall back to the count summary.
 */
const OP_LABEL_KEYS: Record<string, string> = {
  setText: 'aiOpEditText',
  setFont: 'aiOpEditFormat',
  setParagraphFormat: 'aiOpEditFormat',
  setTransform: 'aiOpMoveElement',
  setFill: 'aiOpSetFill',
  setStroke: 'aiOpSetStroke',
  deleteElement: 'aiOpDeleteElement',
  ungroupElement: 'aiOpUngroup',
  setPictureSrcRect: 'aiOpCropImage',
  setPictureOpacity: 'aiOpPictureOpacity',
  setNotes: 'aiOpSpeakerNotes',
  deleteSlide: 'aiOpDeleteSlide',
  setBackground: 'aiOpBackground',
  setTableCell: 'aiOpEditTable',
  tableStructure: 'aiOpTableStructure',
  tableMerge: 'aiOpTableStructure',
  setTableStyle: 'aiOpTableStyle',
  duplicateSlide: 'aiOpNewSlide',
  addElement: 'aiOpNewShape',
  addChart: 'aiOpInsertChart',
  addSmartArt: 'aiOpInsertSmartart',
  addTable: 'aiOpInsertTable',
}

/** Localized summary for an apply_ops run: the op's label when exactly one op ran, else the count. */
function applyOpsSummary(ops: unknown[], count: number): string {
  if (count === 1 && ops.length === 1) {
    const op = ops[0] as { op?: unknown; kind?: unknown } | null
    const name = typeof op?.op === 'string' ? op.op : ''
    const key =
      name === 'addElement' && op?.kind === 'textbox' ? 'aiOpNewTextbox' : OP_LABEL_KEYS[name]
    if (key) return t(key as Parameters<typeof t>[0])
  }
  return t('aiSumApplyOps', { count })
}

/** Insert ops subject to the anti-scratch-build guard when the deck is still blank. */
const SCRATCH_GUARDED_OPS = new Set(['addElement', 'addSmartArt', 'addTable', 'addChart'])

interface OpPreflight {
  /** ops to send over the IPC (AI-layer fields stripped) */
  ops: unknown[]
  /** an addChart declared its figures illustrative — the output must say so */
  sampleData: boolean
}

/**
 * apply_ops runs the same policy gates the dedicated tools run before an op
 * reaches the executor: the anti-scratch-build guard for inserts on a blank
 * deck, and figure provenance for chart data. `dataSource` is an AI-layer
 * field the registry does not know; it is checked here and stripped before the
 * ops cross the IPC. Malformed entries pass through untouched so the executor
 * returns its own guided error for them.
 */
function preflightOps(
  opsIn: unknown[],
  slides: RenderSlide[],
  state: SkillState | undefined,
): OpPreflight | ReturnType<typeof fail> {
  const ops: unknown[] = []
  let sampleData = false
  for (const [i, raw] of opsIn.entries()) {
    if (
      typeof raw !== 'object' ||
      raw === null ||
      typeof (raw as { op?: unknown }).op !== 'string'
    ) {
      ops.push(raw)
      continue
    }
    const op = { ...(raw as Record<string, unknown>) }
    const name = op.op as string
    if (SCRATCH_GUARDED_OPS.has(name)) {
      const blocked = blockScratchBuild(
        name === 'addSmartArt' ? 'smartart' : 'element',
        slides,
        state,
      )
      if (blocked) return { ...blocked, output: `ops[${i}] ${name}: ${blocked.output}` }
    }
    if (name === 'addChart') {
      const gateErr = dataSourceGateErrorForInput(op, state)
      if (gateErr) return fail(t('aiFailApplyOps'), `ops[${i}] ${name}: ${gateErr}`)
      if (op.dataSource === 'sample') sampleData = true
      delete op.dataSource
    }
    ops.push(op)
  }
  return { ops, sampleData }
}

/**
 * Layout audit of the pages a transaction touched (numeric slide prefixes of
 * the journal echo), capped so a deck-wide batch does not flood the reply.
 * Empty when every audited page passes.
 */
function auditTouchedPages(
  records: Array<{ target?: string }> | undefined,
  slides: RenderSlide[],
): string {
  const pages = new Set<number>()
  for (const rec of records ?? []) {
    const prefix = rec.target?.split('/')[0] ?? ''
    if (/^\d+$/.test(prefix)) {
      const idx = Number(prefix)
      if (slides[idx]) pages.add(idx)
    }
    if (pages.size >= 4) break
  }
  const failing = [...pages]
    .sort((a, b) => a - b)
    .map((idx) => ({ page: idx + 1, issues: auditSlideLayout(slides[idx]!) }))
    .filter((a) => a.issues.length > 0)
  if (failing.length === 0) return ''
  return (
    `\n<layout-audit>⚠️ Found issue(s) on ${failing.length} page(s):\n` +
    failing.map((a) => `page ${a.page}:\n${a.issues.map((s) => `- ${s}`).join('\n')}`).join('\n') +
    '\n→ Fix issues your edit caused before replying: execute_slide_script on the affected page (it reads live geometry) or another apply_ops with setTransform; at most 2 fix rounds. Issues that already existed and that you did not touch are for your judgment only — do not report them to the user, and never quote element ids in the reply.\n</layout-audit>'
  )
}

async function executeTool(
  access: DeckAccess,
  call: AgentToolCall,
  state?: SkillState,
  signal?: AbortSignal,
) {
  const slides = access.getSlides()
  switch (call.name) {
    case 'read_slide': {
      const idx = Number(call.input.slideIndex)
      const slide = slides[idx]
      if (!slide)
        return fail(t('aiFailReadSlide'), `slideIndex out of range (0-${slides.length - 1})`)
      return {
        output: formatSlideDump(slide),
        mutated: false,
        summary: t('aiSumReadSlide', { n: idx + 1 }),
      }
    }

    case 'execute_layout_script':
    case 'execute_slide_script': {
      const idx = Number(call.input.slideIndex)
      const slide = slides[idx]
      if (!slide) return fail(t('aiFailScript'), `slideIndex out of range (0-${slides.length - 1})`)
      const code = String(call.input.code ?? '').trim()
      if (!code) return fail(t('aiFailScript'), 'code must not be empty')
      const infos = collectNodeInfos(slide.nodes)
      const r = runLayoutScript(code, infos, { w: slide.widthPx, h: slide.heightPx })
      const logsStr = r.logs.length ? `\nlog output:\n${r.logs.join('\n')}` : ''
      if (r.error) {
        return fail(
          t('aiFailScript'),
          `Script execution error: ${r.error}${logsStr}\n(You can fix the script and retry; see els for the element list and geometry)`,
        )
      }
      const returnedStr = r.returned !== undefined ? `\nScript returned: ${r.returned}` : ''
      if (r.ops.length === 0 && r.edits.length === 0) {
        return {
          output: `Script finished but called no edit primitives (setBox/moveBy/setText/setStyle/setFill/setStroke); the page was not modified.${returnedStr}${logsStr}`,
          mutated: false,
          summary: t('aiSumScriptNoop', { n: idx + 1 }),
        }
      }
      // ── Dispatch: the whole script is ONE transaction — the collected primitives go
      //   to the main process in a single IPC and apply atomically through the op
      //   executor (any failure rolls the deck back there and returns a guided error).
      const applied = await window.slidesApi.applyEditScript({
        slideIndex: idx,
        fitWidthPx: access.fitWidthPx,
        boxes: r.ops,
        edits: r.edits,
      })
      if (!applied || 'error' in applied) {
        return fail(
          t('aiFailScript'),
          `${applied && 'error' in applied ? applied.error : t('aiErrUnknown')}\n` +
            `The page is unchanged (the script is atomic). Elements on page ${idx + 1}: ` +
            `[${availableIdList(slide, true)}]. Fix the script and resend it whole.${returnedStr}${logsStr}`,
        )
      }
      access.applySlide(idx, applied.slide)
      const counts = { text: 0, style: 0, fill: 0, stroke: 0 }
      for (const e of r.edits) counts[e.kind] += 1
      const parts: string[] = []
      if (r.ops.length > 0) parts.push(`layout ${r.ops.length} element(s)`)
      if (counts.text > 0) parts.push(`text ${counts.text} item(s)`)
      if (counts.style > 0) parts.push(`style ${counts.style} item(s)`)
      if (counts.fill > 0) parts.push(`fill ${counts.fill} item(s)`)
      if (counts.stroke > 0) parts.push(`stroke ${counts.stroke} item(s)`)
      const issues = auditSlideLayout(applied.slide)
      return {
        output: `Applied the edit script to page ${idx + 1}: ${parts.join(', ')}.${returnedStr}${logsStr}${formatAudit(issues)}`,
        mutated: true,
        summary: t('aiSumScript', { n: idx + 1, count: r.ops.length + r.edits.length }),
      }
    }

    case 'web_search': {
      const query = String(call.input.query ?? '').trim()
      if (!query) return fail(t('aiFailWebSearch'), 'query must not be empty')
      const r = await window.slidesApi.webSearch(query, Number(call.input.maxResults) || 6)
      // a backend failure must not read as "no results" — the model would fabricate conclusions
      if (r.method === 'error') {
        return fail(
          t('aiFailWebSearch'),
          `web search failed (service error, not an empty result — you may retry): ${r.error ?? 'unknown error'}`,
        )
      }
      if (state) state.webSearched = true
      // output for the LLM: title+URL+summary (each summary truncated to 120 chars to stay lean)
      const SNIPPET_MAX = 120
      const lines: string[] = []
      if (r.answer) lines.push(`Direct answer: ${r.answer.slice(0, 300)}\n`)
      r.results.forEach((it, i) => {
        const snip =
          it.snippet.length > SNIPPET_MAX ? it.snippet.slice(0, SNIPPET_MAX) + '…' : it.snippet
        lines.push(`${i + 1}. ${it.title}\n   ${it.url}\n   ${snip}`)
      })
      // display side channel: link list (full title+URL for the UI, not in LLM context)
      const display: ToolDisplay = {
        kind: 'links',
        items: r.results.map((it) => ({ url: it.url, title: it.title })),
      }
      return {
        output: lines.join('\n') || '(no results)',
        mutated: false,
        summary: t('aiSumWebSearch', { query, count: r.results.length }),
        display,
      }
    }

    case 'image_search': {
      const query = String(call.input.query ?? '').trim()
      if (!query) return fail(t('aiFailImageSearch'), 'query must not be empty')
      const r = await window.slidesApi.imageSearch(query, Number(call.input.maxResults) || 8)
      // a backend failure must not read as an empty gallery — the model would fabricate image choices
      if (r.method === 'error') {
        return fail(
          t('aiFailImageSearch'),
          `image search failed (service error, not an empty result — you may retry): ${r.error ?? 'unknown error'}`,
        )
      }
      // output for the LLM: keep the existing format (the LLM needs to read URLs into image_queries; format unchanged)
      const lines = r.images.map(
        (im, i) =>
          `${i + 1}. ${im.title || '(untitled)'} [${im.width ?? '?'}x${im.height ?? '?'}]\n   ${im.imageUrl}`,
      )
      // display side channel: image list (for UI thumbnails, not in LLM context)
      const display: ToolDisplay = {
        kind: 'images',
        items: r.images.map((im) => ({ url: im.imageUrl, title: im.title || undefined })),
      }
      return {
        output: lines.join('\n') || '(no images)',
        mutated: false,
        summary: t('aiSumImageSearch', { query, count: r.images.length }),
        display,
      }
    }

    case 'generate_image': {
      const prompt = String(call.input.prompt ?? '').trim()
      if (!prompt) return fail(t('aiFailGenImage'), 'prompt must not be empty')
      const refs = Array.isArray(call.input.referenceImageUrls)
        ? (call.input.referenceImageUrls as unknown[]).map(String).filter(Boolean)
        : undefined
      const r = await window.slidesApi.generateImage({
        prompt,
        model: call.input.model ? String(call.input.model) : undefined,
        referenceImageUrls: refs,
        aspectRatio: call.input.aspectRatio ? String(call.input.aspectRatio) : undefined,
        transparentBackground: call.input.transparentBackground === true,
      })
      if (!r.url) return fail(t('aiFailGenImage'), r.error ?? 'Generation failed')
      const display: ToolDisplay = {
        kind: 'images',
        items: [{ url: r.url, title: prompt.slice(0, 60) }],
      }
      return {
        output:
          `Image generated, URL: ${r.url}\n` +
          'New imagery: insert it with insert_web_image. If this edits an existing slide picture (e.g. background removal), swap it in place with replace_image instead.',
        mutated: false,
        summary: t('aiSumGenImage', {
          prompt: `${prompt.slice(0, 20)}${prompt.length > 20 ? '…' : ''}`,
        }),
        display,
      }
    }

    case 'analyze_media': {
      const mediaUrls = Array.isArray(call.input.mediaUrls)
        ? (call.input.mediaUrls as unknown[]).map(String).filter(Boolean)
        : []
      const requirements = String(call.input.requirements ?? '').trim()
      if (!mediaUrls.length) return fail(t('aiFailMedia'), 'mediaUrls must not be empty')
      if (!requirements) return fail(t('aiFailMedia'), 'requirements must not be empty')
      const r = await window.slidesApi.analyzeMedia({ mediaUrls, requirements })
      if (!r.text) return fail(t('aiFailMedia'), r.error ?? 'Analysis failed')
      // Analysis text can be very long; truncate to protect context (first 6000 chars are enough to generate deck content)
      const MAX_LEN = 6000
      const text = r.text.length > MAX_LEN ? r.text.slice(0, MAX_LEN) + '\n…(truncated)' : r.text
      return {
        output: text,
        mutated: false,
        summary: t('aiSumParseMedia', { count: mediaUrls.length }),
      }
    }

    case 'insert_web_image': {
      const idx = Number(call.input.slideIndex)
      if (!slides[idx])
        return fail(t('aiFailInsertImage'), `slideIndex out of range (0-${slides.length - 1})`)
      const url = String(call.input.url ?? '')
      const attachmentName = attachmentRefName(url)
      let payload: { url: string } | { base64: string; ext: string }
      if (attachmentName != null) {
        if (!access.resolveAttachmentImage)
          return fail(t('aiFailInsertImage'), 'Attachment embedding is unavailable here')
        const resolved = await access.resolveAttachmentImage(attachmentName)
        if (!resolved.ok) return fail(t('aiFailInsertImage'), resolved.error)
        payload = { base64: resolved.base64, ext: resolved.ext }
      } else {
        // file:// = a BYOK-generated image in the local store (the main process only resolves its own files)
        if (!/^(https?|file):\/\//.test(url)) return fail(t('aiFailInsertImage'), 'Invalid url')
        payload = { url }
      }
      const r = await window.slidesApi.insertImageUrl({
        slideIndex: idx,
        ...payload,
        xPx: Number(call.input.x),
        yPx: Number(call.input.y),
        wPx: Number(call.input.w),
        hPx: Number(call.input.h),
        fitWidthPx: access.fitWidthPx,
      })
      if (!r)
        return fail(
          t('aiFailInsertImage'),
          'Download or insertion failed (the image may be inaccessible)',
        )
      access.applySlide(idx, r.slide)
      return {
        output: `Inserted the image on page ${idx + 1}, element id=${r.sourceId}.`,
        mutated: true,
        summary: t('aiSumInsertImage', { n: idx + 1 }),
      }
    }

    case 'replace_image': {
      const idx = Number(call.input.slideIndex)
      const sourceId = String(call.input.sourceId ?? '')
      const failKey = 'aiFailReplaceImage' as const
      const slide = slides[idx]
      if (!slide) return fail(t(failKey), `slideIndex out of range (0-${slides.length - 1})`)
      const target = resolveEditTarget(slide, sourceId)
      const terr = targetError(target, sourceId, idx + 1, slides[idx])
      if (terr || !target || 'nested' in target) return fail(t(failKey), terr!)
      if (target.node.type !== 'picture')
        return fail(t(failKey), `Element ${sourceId} is not a picture (type: ${target.node.type})`)
      if (target.groupId)
        return fail(
          t(failKey),
          `Element ${sourceId} is inside a group; this tool only supports top-level pictures — ungroup it first (apply_ops ungroupElement)`,
        )

      const url = String(call.input.url ?? '')
      const attachmentName = attachmentRefName(url)
      let payload: { url: string } | { base64: string; ext: string }
      if (attachmentName != null) {
        if (!access.resolveAttachmentImage)
          return fail(t(failKey), 'Attachment embedding is unavailable here')
        const resolved = await access.resolveAttachmentImage(attachmentName)
        if (!resolved.ok) return fail(t(failKey), resolved.error)
        payload = { base64: resolved.base64, ext: resolved.ext }
      } else {
        if (!/^(https?|file):\/\//.test(url)) return fail(t(failKey), 'Invalid url')
        payload = { url }
      }
      const updated = await window.slidesApi.replacePictureUrl({
        slideIndex: idx,
        sourceId,
        ...payload,
        ...(call.input.keepCrop ? { keepSrcRect: true } : {}),
      })
      if (!updated)
        return fail(
          t(failKey),
          'Replacement failed (the image may be inaccessible, or the element is not a replaceable picture)',
        )
      access.applySlide(idx, updated)
      return {
        output: `Replaced the image of picture ${sourceId} on page ${idx + 1} in place (frame/z-order/effects kept).`,
        mutated: true,
        summary: t('aiSumReplaceImage', { n: idx + 1 }),
      }
    }

    case 'ask_clarification': {
      if (!access.askClarification)
        return fail(
          t('aiFailClarify'),
          'The current environment does not support questionnaire cards',
        )
      const raw = Array.isArray(call.input.questions) ? call.input.questions : []
      const questions: ClarifyQuestion[] = raw
        .map((q: Record<string, unknown>, i: number) => ({
          id: String(q.id ?? `q${i + 1}`),
          label: String(q.label ?? ''),
          description: q.description ? String(q.description) : undefined,
          options: Array.isArray(q.options)
            ? q.options.map((o: unknown) => String(o)).slice(0, 5)
            : [],
          multi: !!q.multi,
        }))
        .filter((q) => q.label && q.options.length > 0)
      if (questions.length === 0)
        return fail(
          t('aiFailClarify'),
          'questions must be non-empty and every question needs options',
        )
      const r = await access.askClarification(questions)
      if (r.cancelled) {
        return {
          output:
            'The user skipped the questionnaire. Decide the Core Hook and style yourself based on professional judgment and generate directly.',
          mutated: false,
          summary: t('aiSumClarifySkipped'),
        }
      }
      return {
        output: `User questionnaire answers:\n${r.answers}\nDecide the Core Hook and style accordingly, then generate with generate_deck.`,
        mutated: false,
        summary: t('aiSumClarifyDone'),
      }
    }

    case 'plan_deck': {
      const coreHook = String(call.input.core_hook ?? '').trim()
      const style = String(call.input.style ?? '').trim()
      const pages = Array.isArray(call.input.pages) ? call.input.pages : []
      if (!coreHook || !style || pages.length === 0) {
        return fail(t('aiFailPlan'), 'plan_deck requires core_hook + style + non-empty pages')
      }
      // Planning summary echoed back to the user
      const lines = pages.map((p: Record<string, unknown>, i: number) => {
        const imgCount =
          (Array.isArray(p.image_queries) ? p.image_queries.length : 0) +
          (Array.isArray(p.image_prompts) ? p.image_prompts.length : 0)
        const q = imgCount ? ` [images: ${imgCount}]` : ''
        return `Page ${i + 1} [${String(p.layout ?? '')}] ${String(p.title ?? '')} — ${String(p.brief ?? '').slice(0, 40)}${q}`
      })
      if (state) {
        state.plannedPages = pages.length
        state.plannedTitles = pages.map(
          (p: Record<string, unknown>) => String(p.title ?? '').trim() || 'Untitled',
        )
        state.pageDone = new Array(pages.length).fill(false) // New planning round, reset per-page progress
      }
      const summary = t('aiSumPlan', { count: pages.length, hook: coreHook })
      return {
        output: `Plan confirmed:\nCore Hook: ${coreHook}\nStyle: ${style}\n${lines.join('\n')}\nNow follow this plan and call generate_deck once, passing core_hook + style + all ${pages.length} pages (each page's brief strictly following the plan above). Each turn a <generation-progress> note tells you how many pages remain; do not stop before they are complete.`,
        mutated: false,
        summary,
      }
    }

    case 'regenerate_slide': {
      const idx = Number(call.input.slideIndex)
      if (!slides[idx])
        return fail(t('aiFailRegen'), `slideIndex out of range (0-${slides.length - 1})`)
      const regenUseCloud =
        !!access.generatePageCloud && !!(await access.isCloudPageGenEnabled?.().catch(() => false))
      if (!access.regenerateSlide || (!regenUseCloud && !access.generatePageLocal))
        return fail(
          t('aiFailRegen'),
          'The current environment does not support the page-redo pipeline',
        )
      const brief = String(call.input.brief ?? '').trim()
      if (!brief) return fail(t('aiFailRegen'), 'brief must not be empty')
      // Figure-provenance gate
      if (countSpecificFigures(`${String(call.input.title ?? '')}\n${brief}`) >= 2) {
        const gateErr = dataSourceGateError(call, state)
        if (gateErr) return fail(t('aiFailRegen'), gateErr)
      }
      const regenImages = Array.isArray(call.input.image_urls)
        ? (call.input.image_urls as unknown[]).map(String).filter((u) => /^https?:\/\//.test(u))
        : []
      // One retry then give up (same semantics as generate_deck pages). Both paths return a
      // marker pointing at a one-slide pptx temp file; landing is shared.
      const backoff = access.retryBackoffMs ?? 2000
      let marker: string | null = null
      let genImageFails: string[] = []
      let lastErr = ''
      const regenArgs = {
        pageIndex: idx + 1,
        totalPages: slides.length,
        coreHook: '',
        style: state?.lastStyleSkill ?? '',
        title: String(call.input.title ?? ''),
        brief,
        layout: String(call.input.layout ?? ''),
        images: regenImages,
        canvasW: 1280,
        canvasH: 720,
      }
      const regenGen = regenUseCloud ? access.generatePageCloud! : access.generatePageLocal!
      for (let attempt = 0; attempt < 2 && !marker; attempt++) {
        if (attempt > 0 && backoff > 0) await new Promise((r) => setTimeout(r, backoff))
        const res = await regenGen(regenArgs)
        if (res.ok && res.marker) {
          marker = res.marker
          if ('imageFailures' in res && Array.isArray(res.imageFailures))
            genImageFails = res.imageFailures
        } else lastErr = res.error ?? t('aiErrUnknown')
      }
      if (!marker)
        return fail(
          t('aiFailRegen'),
          `Page generation failed (2 attempts): ${lastErr}. This is usually a temporary service error — do not keep calling regenerate_slide in a loop. Instead, make the requested changes in place with execute_slide_script / set_element_* (group children are editable too), or tell the user to retry in a few minutes. The page was not modified.`,
        )
      const r = await access.regenerateSlide(idx, marker)
      if (!r.ok)
        return fail(
          t('aiFailRegen'),
          `${r.error || 'Redo failed'} (the page was not modified; retry once, or edit it in place with execute_slide_script)`,
        )
      if (state) state.htmlGenerated = true
      const allImageFails = [
        ...(r.imageFailures ?? []),
        ...genImageFails.map((url) => ({ page: idx + 1, url })),
      ]
      return {
        output:
          `Redid page ${idx + 1} in place from the brief (other pages untouched; the user can undo). Fine-tune afterwards with execute_slide_script / set_element_* tools.` +
          imageFailNote(allImageFails.length ? allImageFails : undefined),
        mutated: true,
        summary: t('aiSumRegen', { n: idx + 1 }),
      }
    }

    case 'generate_deck': {
      // ── Self-driven pipeline:
      //   1) Plan: use pages if passed; with topic, the tool plans the outline via LLM (batched recursion over threshold) — fixes missing pages at the input side.
      //   2) Generate: batched concurrent page generation (one retry per page), **each batch lands immediately → frontend shows pages one by one**.
      //      Cloud (gsk slide_generate) when available; otherwise fully local — the LLM (app AI
      //      transport, works with BYOK) writes a slide spec that is built directly into a pptx.
      // detail:'draft' = staged fast path: no style/image stages, pages are simple
      // spec skeletons built locally in multi-page batches — the user gets a complete
      // text deck in seconds and upgrades visuals/style afterwards via upgrade_deck.
      const insertMode: 'replace' | 'append' =
        call.input.insert_mode === 'append' ? 'append' : 'replace'
      // Staged flow is the DEFAULT for a new deck: the model omitting `detail` (or
      // passing "draft") gets the fast text-first path, even when it passes explicit
      // pages — the outline card still shows them for user confirmation. "full" runs
      // only when asked for explicitly, or for appended pages (they must match the
      // designed deck).
      const draftMode = call.input.detail !== 'full' && insertMode !== 'append'
      const useCloud =
        !draftMode &&
        !!access.generatePageCloud &&
        !!(await access.isCloudPageGenEnabled?.().catch(() => false))
      const canGenerate = draftMode
        ? !!(access.generateDraftPages || access.generatePageLocal)
        : useCloud || !!access.generatePageLocal
      if (!canGenerate)
        return fail(
          t('aiFailGenDeck'),
          'No page generation pipeline is available in this environment',
        )
      if (!access.landGeneratedPages)
        return fail(
          t('aiFailGenDeck'),
          'The current environment does not support the page landing pipeline',
        )

      // Hard gate: with unread text attachments present, refuse to generate.
      // The prompt already demands reading them first, but prompt rules alone are not
      // enforcement — this check is, and it is fully computable from the tool-call history.
      {
        const unread = access.unreadTextAttachments?.() ?? []
        if (unread.length > 0) {
          return fail(
            t('aiFailGenDeck'),
            `Text attachment(s) not read yet: ${unread.join(', ')}. Read each one with read_attachment first (paginate long files), then call generate_deck again and pass the key facts you read (names, figures, deals, next steps) in the context argument — deck content must come from the attachments, not generic filler.`,
          )
        }
      }

      const canvasW = 1280
      const canvasH = 720
      const PLAN_BATCH = 12 // Per-batch planning cap (kept slightly conservative against truncation)
      // Cloud generation is a server-side call (gsk slide_generate) — higher concurrency is
      // safe there. The local path streams through the user's AI proxy (opus large output +
      // concurrent streams time out easily) — keep it at 2, stability first.
      const GEN_BATCH = useCloud ? 4 : 2
      const BACKOFF_MS = access.retryBackoffMs ?? 2000 // Retry backoff base (rate limits/overload are mostly transient; immediate retries would hit them again)

      let coreHook = String(call.input.core_hook ?? '').trim()
      const style = String(call.input.style ?? '').trim()
      const pages: Array<Record<string, unknown>> = Array.isArray(call.input.pages)
        ? (call.input.pages as Array<Record<string, unknown>>)
        : []
      const topic = String(call.input.topic ?? '').trim()
      const context = String(call.input.context ?? '').trim() || undefined
      // Every per-page request re-sends the context; cap it so N pages don't multiply a huge attachment
      const PAGE_CONTEXT_MAX = 8000
      const styleTemplateName = String(call.input.style_template ?? '').trim() || undefined

      // Explicit research queries first; otherwise one auto-query when the model handed
      // us a bare topic (no material, no earlier search this conversation) — the facts
      // still reach the briefs without a separate agent turn.
      const researchQueries: string[] = (() => {
        const raw = call.input.research
        const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
        const qs = list.map((q) => String(q).trim()).filter(Boolean)
        if (qs.length) return qs.slice(0, 4)
        if (topic && !context && access.searchWeb && !state?.webSearched) return [topic]
        return []
      })()

      // Figure-provenance gate: a data-dense request must say where its numbers came from.
      // dataSource:'search' is satisfied by the internal research that is about to run —
      // its digest feeds the briefs, so no separate web_search turn is required first.
      {
        const briefText = [
          topic,
          context ?? '',
          ...pages.map((p) => `${String(p.title ?? '')} ${String(p.brief ?? '')}`),
        ].join('\n')
        if (countSpecificFigures(briefText) >= 2) {
          const gateState =
            researchQueries.length && access.searchWeb
              ? { ...(state ?? { htmlGenerated: false }), webSearched: true }
              : state
          const gateErr = dataSourceGateError(call, gateState)
          if (gateErr) return fail(t('aiFailGenDeck'), gateErr)
        }
      }

      // ── Step 0: style template (preferred) or independent Style Skill generation.
      // A loaded template skips the LLM style call entirely.
      let styleSkill = ''
      if (styleTemplateName && access.loadStyleTemplate) {
        // Preferred: load from a saved template (fail-open: on load failure continue normal generation)
        try {
          const tr = await access.loadStyleTemplate(styleTemplateName)
          if (tr.ok && tr.styleSkill) styleSkill = tr.styleSkill
        } catch {
          /* fail-open */
        }
      }
      // User clicked stop → checked inside each stage loop, abort as soon as possible (pages already landed are kept)
      const cancelled = () => signal?.aborted === true
      const cancelResult = (landed: number, totalPages: number) => ({
        output: `The user stopped generation. ${landed} page(s) already landed${totalPages ? ` (${totalPages} planned)` : ''} and remain on the canvas.`,
        mutated: landed > 0,
        summary: landed > 0 ? t('aiSumStoppedKept', { n: landed }) : t('aiErrStopped'),
      })
      if (cancelled()) return cancelResult(0, 0)

      // ── Steps 0+1 run CONCURRENTLY: style generation, web research and outline
      //   planning overlap in wall-clock time instead of stacking up.
      //   * research: `research` queries → internal web searches (fail-open)
      //   * planning: waits only for the research digest (real data for the briefs),
      //     not for the Style Skill — the skill lands before per-page generation anyway
      //   * style: a fully parallel track
      const researchP: Promise<string> = (async () => {
        if (!researchQueries.length || !access.searchWeb) return ''
        access.onProgress?.({
          stage: 'research',
          label: t('aiStageResearch'),
          status: 'running',
          summary: t('aiStageResearchRunning', { n: researchQueries.length }),
        })
        const parts = await Promise.all(
          researchQueries.map(async (q) => {
            try {
              const r = await access.searchWeb!(q, 6)
              if (!r.ok) return ''
              if (state) state.webSearched = true
              const lines = [`Research: ${q}`]
              if (r.answer) lines.push(`Direct answer: ${r.answer.slice(0, 300)}`)
              for (const it of (r.results ?? []).slice(0, 5)) {
                lines.push(`- ${it.title}: ${it.snippet.slice(0, 160)} (${it.url})`)
              }
              return lines.join('\n')
            } catch {
              return ''
            }
          }),
        )
        const digest = parts.filter(Boolean).join('\n\n')
        access.onProgress?.({
          stage: 'research',
          label: t('aiStageResearch'),
          status: 'done',
          summary: digest
            ? t('aiStageResearchDone', { n: parts.filter(Boolean).length })
            : t('aiStageResearchEmpty'),
        })
        return digest
      })()

      // Planning context = user-supplied material + the research digest (resolved once
      // researchP settles — planning and per-page context both consume it).
      const mergedContextP: Promise<string | undefined> = (async () => {
        const digest = await researchP
        const merged = [context, digest].filter(Boolean).join('\n\n')
        return merged || undefined
      })()

      const needStyleGen =
        !draftMode && !styleSkill && access.generateStyleSkill && (topic || pages.length === 0 || !style)
      // Style track: resolves to the final Style Skill (or the user-passed style / '').
      // Draft mode skips it entirely — the skeleton uses one fixed minimal style.
      const styleP: Promise<string> = draftMode
        ? Promise.resolve(DRAFT_STYLE)
        : (async () => {
        if (!needStyleGen) return styleSkill || style
        access.onProgress?.({
          stage: 'style',
          label: t('aiStageStyle'),
          status: 'running',
          summary: t('aiStageStyleRunning'),
        })
        const styleTopic =
          topic || coreHook || (pages[0] ? String(pages[0].title ?? '') : 'Presentation')
        const sr = await access.generateStyleSkill!({
          topic: styleTopic,
          ...(style ? { styleHint: style } : {}),
          ...(context ? { questionnaire: context } : {}),
          ...(signal ? { signal } : {}),
        })
        access.onProgress?.({
          stage: 'style',
          label: t('aiStageStyle'),
          status: 'done',
          summary: t('aiStageStyleDone'),
        })
        return (sr.ok && sr.styleSkill) || style || ''
      })()

      // ── Step 1: plan the outline — without pages, plan in-tool from topic.
      //   The first batch yields the Core Hook; the remaining batches then run in
      //   PARALLEL (each only needs coreHook + context, not each other's output).
      const approxForProgress = Math.max(
        1,
        parseInt(String(call.input.approx_pages ?? '0'), 10) || pages.length || 1,
      )
      const planP: Promise<{ error?: string }> = (async () => {
        if (pages.length > 0) return {}
        const approx = approxForProgress
        if (!topic || !approx) {
          return {
            error:
              'generate_deck requires [topic + approx_pages] (system plans internally), or pass [core_hook + style + pages] directly.',
          }
        }
        if (!access.planDeckOutline) {
          return {
            error:
              'The current environment does not support internal planning; pass pages directly.',
          }
        }
        const mergedContext = await mergedContextP
        const styleHint = styleSkill || style || undefined // styleP may still be running; the variant catalog is inline anyway
        access.onProgress?.({
          stage: 'plan',
          label: t('aiStagePlan'),
          done: 0,
          total: approx,
          status: 'running',
          summary: t('aiStagePlanRunning'),
        })
        const planFailed = (err?: string) => {
          access.onProgress?.({
            stage: 'plan',
            label: t('aiStagePlan'),
            done: 0,
            total: approx,
            status: 'error',
            summary: t('aiStagePlanFailed'),
          })
          return { error: `Planning failed: ${err || 'outline is empty'}` }
        }
        const planBatch = (count: number, startPage: number, withHook: boolean) =>
          access.planDeckOutline!({
            topic,
            count,
            startPage,
            ...(mergedContext ? { context: mergedContext } : {}),
            ...(styleHint ? { styleSkill: styleHint } : {}),
            ...(withHook && coreHook ? { continueFrom: { coreHook } } : {}),
            ...(signal ? { signal } : {}),
          })
        type PlanResult = Awaited<ReturnType<NonNullable<typeof access.planDeckOutline>>>
        const batchOk = (
          r?: PlanResult | null,
        ): r is PlanResult & { outline: { core_hook?: unknown; pages: unknown[] } } =>
          !!(r?.ok && r.outline && Array.isArray(r.outline.pages) && r.outline.pages.length)
        // First batch — also yields the Core Hook the later batches continue from
        const count1 = Math.min(PLAN_BATCH, approx)
        if (cancelled()) return {}
        const r1 = await planBatch(count1, 1, false)
        if (!batchOk(r1)) return planFailed(r1?.error)
        coreHook = String(r1!.outline!.core_hook ?? coreHook).trim()
        pages.push(...(r1!.outline!.pages as Record<string, unknown>[]))
        let planned = r1!.outline!.pages.length
        access.onProgress?.({
          stage: 'plan',
          label: t('aiStagePlan'),
          done: planned,
          total: approx,
          status: 'running',
          summary: t('aiStagePlanProgress', { done: planned, total: approx }),
        })
        // Remaining batches in parallel — they continue from coreHook, not from each other
        if (planned < approx && r1!.outline!.pages.length >= count1) {
          const starts: number[] = []
          for (let s = planned; s < approx; s += PLAN_BATCH) starts.push(s)
          const rs = await Promise.all(
            starts.map(async (startPage) => {
              if (cancelled()) return null
              const count = Math.min(PLAN_BATCH, approx - startPage)
              return { count, r: await planBatch(count, startPage + 1, true) }
            }),
          )
          for (const item of rs) {
            if (!item || !batchOk(item.r)) continue
            pages.push(...(item.r!.outline!.pages as Record<string, unknown>[]))
            planned += item.r!.outline!.pages.length
            access.onProgress?.({
              stage: 'plan',
              label: t('aiStagePlan'),
              done: planned,
              total: approx,
              status: 'running',
              summary: t('aiStagePlanProgress', { done: planned, total: approx }),
            })
          }
        }
        access.onProgress?.({
          stage: 'plan',
          label: t('aiStagePlan'),
          done: pages.length,
          total: pages.length,
          status: 'done',
          summary: t('aiStagePlanDone', { n: pages.length }),
        })
        return {}
      })()

      const [styleOut, planOut, mergedContext] = await Promise.all([styleP, planP, mergedContextP])
      if (styleOut) styleSkill = styleOut
      else if (!styleSkill) styleSkill = style // Fallback: the user-passed style, or empty
      if (planOut.error) return fail(t('aiFailGenDeck'), planOut.error)
      if (cancelled()) return cancelResult(0, approxForProgress)
      const pageContext =
        mergedContext && mergedContext.length > PAGE_CONTEXT_MAX
          ? mergedContext.slice(0, PAGE_CONTEXT_MAX)
          : mergedContext

      // ── Step 1.2: outline confirmation card. For a NEW deck (replace mode) — whether
      //   the outline was planned internally or passed as explicit pages — pause and
      //   let the user review it: approve (optionally dropping/retitling pages), send
      //   back for revision, or cancel, before a single page is generated. Skipped
      //   only for append mode (added pages extend an already-reviewed deck).
      if (insertMode === 'replace' && access.proposeOutline && !cancelled()) {
        const proposal = await access.proposeOutline({
          coreHook: coreHook || topic,
          ...(topic ? { topic } : {}),
          pages: pages.map((p) => ({
            title: String(p.title ?? '').trim() || 'Untitled',
            brief: String(p.brief ?? ''),
            ...(p.layout ? { layout: String(p.layout) } : {}),
            visuals:
              (Array.isArray(p.image_queries) ? p.image_queries.length : 0) +
              (Array.isArray(p.image_prompts) ? p.image_prompts.length : 0),
          })),
          ...(signal ? { signal } : {}),
        })
        if (proposal.status === 'cancelled') {
          access.onProgress?.({
            stage: 'plan',
            label: t('aiStagePlan'),
            done: pages.length,
            total: pages.length,
            status: 'done',
            summary: t('aiSumOutlineCancelled'),
          })
          return {
            output:
              'The user cancelled at the outline review — nothing was generated. Ask what they would like to change, then call generate_deck again with the adjusted input.',
            mutated: false,
            summary: t('aiSumOutlineCancelled'),
          }
        }
        if (proposal.status === 'revise') {
          const planLines = pages
            .map(
              (p, i) =>
                `${i + 1}. [${String(p.layout ?? '')}] ${String(p.title ?? '')} — ${String(p.brief ?? '').slice(0, 120)}`,
            )
            .join('\n')
          return {
            output:
              `The user reviewed the outline and wants changes: "${proposal.feedback}".\n` +
              `Current plan (core hook: ${coreHook}):\n${planLines}\n` +
              'Re-plan with the feedback applied, then call generate_deck again (topic + approx_pages, or explicit pages). Nothing was generated yet.',
            mutated: false,
            summary: t('aiSumOutlineRevise'),
          }
        }
        // approved: apply page removals and title edits
        if (proposal.status === 'approved') {
          const removed = new Set(
            (proposal.removed ?? []).filter((i) => Number.isInteger(i) && i >= 0),
          )
          for (const i of [...removed].sort((a, b) => b - a)) {
            if (i < pages.length) pages.splice(i, 1)
          }
          if (Array.isArray(proposal.titles)) {
            proposal.titles.forEach((title, i) => {
              if (pages[i] && typeof title === 'string' && title.trim())
                pages[i]!.title = title.trim()
            })
          }
          if (Array.isArray(proposal.briefs)) {
            // Brief edits apply verbatim — including clearing to empty (the page
            // then generates from its title alone).
            proposal.briefs.forEach((brief, i) => {
              if (pages[i] && typeof brief === 'string') pages[i]!.brief = brief.trim()
            })
          }
          if (pages.length === 0) {
            return {
              output:
                'The user removed every page from the outline — nothing to generate. Ask what structure they want, then call generate_deck again.',
              mutated: false,
              summary: t('aiSumOutlineCancelled'),
            }
          }
        }
      }

      // ── Step 1.5: in-tool imagery. AI generation is the PRIMARY resolver for every
      //   visual slot — the image model renders each slot's description (image_queries
      //   and image_prompts alike), a real-photo search runs only as fallback: for the
      //   slots the generator missed, or for all of them when generation is unavailable.
      //   Entries that are already URLs (http(s), or file:// for BYOK-generated images)
      //   are respected, not re-resolved; unresolvable slots stay empty (fail-open).
      //   Draft mode skips this stage entirely — slots become labeled placeholder boxes.
      const isUrl = (s: string) => /^(https?|file):\/\//i.test(s)
      const normKw = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
      const unresolvedImageSlots: { page: number; slot: string }[] = []
      if (!draftMode && (access.searchImages || access.generateImage)) {
        const uniqueSlots: string[] = []
        const seenSlot = new Set<string>()
        for (const p of pages) {
          for (const field of ['image_queries', 'image_prompts'] as const) {
            for (const q of (Array.isArray(p[field]) ? p[field] : []) as unknown[]) {
              const s = String(q).trim()
              if (!s || isUrl(s)) continue
              const k = normKw(s)
              if (!seenSlot.has(k)) {
                seenSlot.add(k)
                uniqueSlots.push(s)
              }
            }
          }
        }
        const candidatesByKw = new Map<string, string[]>()
        const genByPrompt = new Map<string, string>()
        const canGenerate = !!access.generateImage && access.imageGenAvailable?.() !== false
        const totalSearches = uniqueSlots.length
        if (totalSearches > 0) {
          access.onProgress?.({
            stage: 'images',
            label: t('aiStageImages'),
            done: 0,
            total: totalSearches,
            status: 'running',
            summary: t('aiStageImagesRunning', { done: 0, total: totalSearches }),
          })
          let imagesDone = 0
          const tick = () => {
            imagesDone++
            const shown = Math.min(imagesDone, totalSearches)
            access.onProgress?.({
              stage: 'images',
              label: t('aiStageImages'),
              done: shown,
              total: totalSearches,
              status: 'running',
              summary: t('aiStageImagesRunning', { done: shown, total: totalSearches }),
            })
          }
          const missedPrompts: string[] = []
          const jobs: Promise<void>[] = []
          if (canGenerate) {
            // Pool of 3 concurrent generations — image calls are slow, but flooding the
            // provider trips rate limits; a missed slot falls back to an image search.
            let cursor = 0
            jobs.push(
              ...Array.from({ length: Math.min(3, uniqueSlots.length) }, async () => {
                while (cursor < uniqueSlots.length && !cancelled()) {
                  const pr = uniqueSlots[cursor++]!
                  try {
                    const r = await access.generateImage!({ prompt: pr, aspectRatio: '16:9' })
                    if (r.ok && r.url) genByPrompt.set(normKw(pr), r.url)
                    else missedPrompts.push(pr)
                  } catch {
                    missedPrompts.push(pr)
                  }
                  tick()
                }
              }),
            )
          } else if (access.searchImages) {
            // Generation unavailable: every slot resolves through image search
            // (each searched once, several candidates so cross-page dedup can pick unused images)
            jobs.push(
              ...uniqueSlots.map(async (kw) => {
                if (cancelled()) return
                try {
                  candidatesByKw.set(normKw(kw), await access.searchImages!(kw, 5))
                } catch {
                  /* fail-open */
                }
                tick()
              }),
            )
          }
          await Promise.all(jobs)
          // Fallback: slots the generator missed → a real-photo search on the slot text
          if (missedPrompts.length && access.searchImages) {
            await Promise.all(
              missedPrompts.map(async (pr) => {
                if (cancelled()) return
                try {
                  const urls = await access.searchImages!(pr, 5)
                  if (urls.length) candidatesByKw.set(normKw(pr), urls)
                } catch {
                  /* fail-open */
                }
              }),
            )
          }
        }
        // Allocate page by page in order: explicit URLs are kept as-is (and counted as used);
        // keywords/prompts pick from candidates preferring images the deck hasn't used yet.
        // Slots that resolve to nothing are reported in the tool output (a blank image
        // slot must never go unmentioned).
        const usedUrls = new Set<string>()
        for (const p of pages) {
          for (const field of ['image_queries', 'image_prompts'] as const) {
            const arr = p[field]
            if (!Array.isArray(arr)) continue
            for (const q of arr as unknown[]) {
              const s = String(q).trim()
              if (isUrl(s)) usedUrls.add(s)
            }
          }
        }
        for (const [pi, p] of pages.entries()) {
          for (const field of ['image_queries', 'image_prompts'] as const) {
            const arr = p[field]
            if (!Array.isArray(arr) || arr.length === 0) continue
            const resolvedUrls: string[] = []
            for (const q of arr as unknown[]) {
              const s = String(q).trim()
              if (!s) continue
              if (isUrl(s)) {
                resolvedUrls.push(s)
                continue
              }
              const k = normKw(s)
              // Generated URL first (the primary resolver), searched candidates after
              const gen = genByPrompt.get(k)
              const candidates = candidatesByKw.get(k) ?? []
              // If all candidates are used, fall back to reusing the first one (an image beats no image)
              const pick = gen ?? candidates.find((u) => !usedUrls.has(u)) ?? candidates[0]
              if (pick) {
                usedUrls.add(pick)
                resolvedUrls.push(pick)
              } else {
                unresolvedImageSlots.push({ page: pi + 1, slot: s })
              }
            }
            p[field] = resolvedUrls
          }
        }
        if (totalSearches > 0) {
          access.onProgress?.({
            stage: 'images',
            label: t('aiStageImages'),
            done: totalSearches,
            total: totalSearches,
            status: 'done',
            summary: t('aiStageImagesDone', { n: totalSearches }),
          })
        }
      }

      if (!coreHook) coreHook = topic || 'Presentation'
      if (!styleSkill)
        styleSkill =
          'Unified clean modern style: main background #FFFFFF, main text #1A1A2E, primary accent #2563EB, secondary accent #F59E0B, cards #F8FAFC, borders #E2E8F0; sans-serif fonts; titles 40-56px, body 16-20px'
      const total = pages.length
      if (total === 0) return fail(t('aiFailGenDeck'), 'No pages to generate (the plan is empty).')

      // Store the plan in the progress state (shared with the todolist mechanism; buildContext injects it every turn)
      // Also record styleSkill+topic for the save_style_template tool
      if (state) {
        state.plannedPages = total
        state.plannedTitles = pages.map((p) => String(p.title ?? '').trim() || 'Untitled')
        state.pageDone = new Array(total).fill(false)
        state.lastStyleSkill = styleSkill
        state.lastTopic = topic || coreHook || ''
        // Staged flow: remember the per-page visual slots so upgrade_deck can resolve
        // them later. For a draft these are the keyword/prompt descriptions (placeholder
        // labels on the canvas carry the same text as a backup source of truth); for a
        // full run the slots were already resolved above, so this stores the image URLs —
        // enough for a later style restyle to keep the same imagery.
        state.draftDeck = draftMode
        state.draftVisualsDone = false
        // Append keeps the pre-existing pages' remembered imagery (their canvas
        // indexes don't shift); a fresh deck invalidates it along with the slots
        // resolved for the previous deck's pages.
        if (insertMode !== 'append') {
          state.draftResolvedSlots = undefined
          state.draftPageImages = undefined
        }
        state.draftSlotsOffset = insertMode === 'append' ? slides.length : 0
        state.draftImageSlots = pages.map((p) =>
          (['image_queries', 'image_prompts'] as const).flatMap((f) =>
            (Array.isArray(p[f]) ? (p[f] as unknown[]) : []).map((x) => String(x).trim()).filter(Boolean),
          ),
        )
      }

      // Presentation name: prefer the cover (page 1) title, then the user-entered topic / coreHook.
      // New drafts are saved under this name instead of "Untitled-timestamp".
      const deckName = String(pages[0]?.title ?? '').trim() || topic || coreHook

      // ── Step 2: generate page by page + land as we go (frontend shows pages one by one).
      // Cloud (gsk slide_generate) and local (LLM spec → pptx-engine build) both produce a
      // one-slide pptx temp file; genOne returns its marker and landing reads the bytes.
      // Land strictly in page order: nextToLand pointer; a page lands only when its marker is ready, keeping page order intact.
      const markerByIndex: (string | null)[] = new Array(total).fill(null)
      // Per-page completion flags (aligned with pages; same reference as state.pageDone, used by buildContext progress injection)
      const doneFlags: boolean[] = state?.pageDone ?? new Array(total).fill(false)
      const genFailed: number[] = [] // Page indexes (0-based) whose page generation failed
      const landFailed: number[] = [] // Page indexes (0-based) whose HTML generated but conversion/landing failed
      const degraded: number[] = [] // Page indexes (0-based) that "landed" via the plain-text fallback — must be reported, otherwise dead pages appear silently
      const deckImageFails: { page: number; url: string }[] = [] // Image download/conversion failures (page numbers are deck-global 1-based)
      const pageErrors: (string | undefined)[] = new Array(total).fill(undefined) // Last failure reason per page
      let landedPages = 0
      let firstDone = false
      let baseOffset = 0 // Number of existing pages before generated page 0 in the deck (>0 in append mode); used to re-insert retries at their original position
      let nextToLand = 0 // Index of the next page to land (0-based)

      // Initialize per-page progress state (all pages pending)
      const pageProgressItems: PageProgressItem[] = pages.map((p) => ({
        title: String(p.title ?? '').trim() || t('aiPageN', { n: pages.indexOf(p) + 1 }),
        status: 'pending',
      }))

      // Send initial pages progress
      access.onProgress?.({
        stage: 'pages',
        label: t('aiStagePages'),
        done: 0,
        total,
        status: 'running',
        summary: t('aiStagePageRunning', { n: 1, total }),
        pages: [...pageProgressItems],
      })

      // Draft mode: visual slots stay descriptions (no resolution ran) — they are passed
      // to the draft generator as placeholder labels, and kept for upgrade_deck.
      const slotDescsOf = (p: Record<string, unknown>) =>
        (['image_queries', 'image_prompts'] as const).flatMap((f) =>
          (Array.isArray(p[f]) ? (p[f] as unknown[]) : [])
            .map((x) => String(x).trim())
            .filter(Boolean),
        )
      const markPageError = (idx: number, err?: string) => {
        markerByIndex[idx] = '' // Empty-string placeholder; doesn't block subsequent landings
        genFailed.push(idx)
        // Keep the concrete error genOne already recorded (e.g. the generator's own
        // message); only fall back to the generic label when nothing was captured.
        pageErrors[idx] = err ?? pageErrors[idx] ?? t('aiErrUnknown')
        pageProgressItems[idx] = {
          ...pageProgressItems[idx]!,
          status: 'error',
          error: pageErrors[idx],
        }
      }
      const draftPageInput = (p: Record<string, unknown>, pageIndex: number) => ({
        pageIndex,
        totalPages: total,
        title: String(p.title ?? ''),
        brief: String(p.brief ?? ''),
        layout: String(p.layout ?? ''),
        ...(p.type ? { type: String(p.type) } : {}),
        imageSlots: slotDescsOf(p),
      })

      const genOne = async (p: Record<string, unknown>, pageIndex: number) => {
        // Mark as running
        pageProgressItems[pageIndex - 1] = {
          ...pageProgressItems[pageIndex - 1]!,
          status: 'running',
        }
        access.onProgress?.({
          stage: 'pages',
          label: draftMode ? t('aiStageDraft') : t('aiStagePages'),
          done: landedPages,
          total,
          status: 'running',
          summary: t('aiStagePageRunning', { n: pageIndex, total }),
          pages: [...pageProgressItems],
        })
        // Resolved image slots: generated URLs (primary) + searched URLs (fallback) +
        // explicit URLs passed through. file:// (BYOK-generated) only works on the local
        // build path — the cloud service cannot reach the local image store.
        // Draft mode resolves nothing: slots go to the draft page as placeholder labels.
        const images = draftMode
          ? []
          : (['image_queries', 'image_prompts'] as const).flatMap((field) =>
              Array.isArray(p[field])
                ? (p[field] as unknown[])
                    .map((x) => String(x))
                    .filter((x) =>
                      useCloud ? /^https?:\/\//.test(x) : /^(https?|file):\/\//.test(x),
                    )
                : [],
            )
        let lastErr = ''
        const pageArgs = {
          pageIndex,
          totalPages: total,
          coreHook,
          style: styleSkill,
          title: String(p.title ?? ''),
          brief: String(p.brief ?? ''),
          layout: String(p.layout ?? ''),
          images,
          ...(pageContext ? { context: pageContext } : {}),
          ...(topic ? { topic } : {}),
          canvasW,
          canvasH,
          ...(signal ? { signal } : {}),
        }
        // Both paths return a marker pointing at a one-slide pptx temp file. One retry, then the
        // page is skipped for now (locally-failed pages get one more chance in the retry round)
        // and the rest of the deck keeps generating.
        const gen = draftMode
          ? // Single-page draft call — the retry-round path (the main loop uses multi-page
            // batches). Without the batch capability fall back to the regular local page
            // builder fed the draft style + placeholder instructions.
            async (args: typeof pageArgs) => {
              if (access.generateDraftPages) {
                const r = await access.generateDraftPages({
                  pages: [draftPageInput(p, pageIndex)],
                  coreHook,
                  ...(topic ? { topic } : {}),
                  ...(pageContext ? { context: pageContext } : {}),
                  canvasW,
                  canvasH,
                  ...(signal ? { signal } : {}),
                })
                const m = r.markers?.[0]
                return r.ok && m
                  ? { ok: true, marker: m }
                  : { ok: false, error: r.error ?? t('aiErrUnknown') }
              }
              const slotHint = slotDescsOf(p).length
                ? `\nDraft page: render each visual slot as a light-gray labeled placeholder box — ${slotDescsOf(p).map((s) => `"IMAGE: ${s}"`).join(', ')}.`
                : ''
              return access.generatePageLocal!({ ...args, brief: args.brief + slotHint })
            }
          : useCloud
            ? access.generatePageCloud!
            : access.generatePageLocal!
        for (let attempt = 0; attempt < 2; attempt++) {
          if (cancelled()) return null
          if (attempt > 0 && BACKOFF_MS > 0) await new Promise((r) => setTimeout(r, BACKOFF_MS))
          const res = await gen(pageArgs)
          if (res.ok && res.marker) {
            pageErrors[pageIndex - 1] = undefined
            if ('imageFailures' in res && Array.isArray(res.imageFailures))
              deckImageFails.push(...res.imageFailures.map((url) => ({ page: pageIndex, url })))
            return res.marker
          }
          lastErr = res.error ?? t('aiErrUnknown')
        }
        pageErrors[pageIndex - 1] = lastErr
        return null
      }

      // Land in page order: starting from nextToLand, land as many as possible (stop at a gap and wait for it to generate).
      const flushLanded = async () => {
        while (nextToLand < total && markerByIndex[nextToLand] !== null) {
          if (cancelled()) return
          const marker = markerByIndex[nextToLand] as string
          if (marker.length > 0) {
            const m: 'replace' | 'append' = firstDone ? 'append' : insertMode
            const r = await access.landGeneratedPages!([marker], m, deckName)
            if (r.ok) {
              if (r.fallbackReason) {
                degraded.push(nextToLand)
                pageErrors[nextToLand] = r.fallbackReason
              }
              if (r.imageFailures) deckImageFails.push(...r.imageFailures)
              if (!firstDone) baseOffset = r.appendedFrom ?? 0
              landedPages += 1
              firstDone = true
              doneFlags[nextToLand] = true
              pageProgressItems[nextToLand] = { ...pageProgressItems[nextToLand]!, status: 'done' }
              access.onProgress?.({
                stage: 'pages',
                label: t('aiStagePages'),
                done: landedPages,
                total,
                status: 'running',
                summary:
                  landedPages < total
                    ? t('aiStagePageRunning', { n: landedPages + 1, total })
                    : t('aiStageFinishing'),
                pages: [...pageProgressItems],
              })
            } else {
              landFailed.push(nextToLand)
              pageErrors[nextToLand] = t('aiErrLandFailed', { err: r.error ?? t('aiErrUnknown') })
              pageProgressItems[nextToLand] = {
                ...pageProgressItems[nextToLand]!,
                status: 'error',
                error: pageErrors[nextToLand],
              }
            }
          }
          nextToLand += 1
        }
      }

      if (draftMode && access.generateDraftPages) {
        // ── Draft fast path: ONE LLM call writes DRAFT_BATCH simple page specs;
        //    DRAFT_WAVES batch calls run concurrently. Ordered landing is unchanged.
        // 3, not 5: one LLM call writes the whole batch's JSON, and a 5-page spec
        // regularly came back as an empty stream ("Empty output") — losing the whole
        // batch at once. Smaller batches also land sooner, so pages appear faster.
        const DRAFT_BATCH = 3
        const DRAFT_WAVES = 2
        const chunks: number[][] = []
        for (let s = 0; s < total; s += DRAFT_BATCH) {
          chunks.push(
            Array.from({ length: Math.min(DRAFT_BATCH, total - s) }, (_, k) => s + k),
          )
        }
        let cursor = 0
        await Promise.all(
          Array.from({ length: Math.min(DRAFT_WAVES, chunks.length) }, async () => {
            while (cursor < chunks.length && !cancelled()) {
              const chunk = chunks[cursor++]!
              for (const idx of chunk) {
                pageProgressItems[idx] = { ...pageProgressItems[idx]!, status: 'running' }
              }
              access.onProgress?.({
                stage: 'pages',
                label: t('aiStageDraft'),
                done: landedPages,
                total,
                status: 'running',
                summary: t('aiStagePageRunning', { n: chunk[0]! + 1, total }),
                pages: [...pageProgressItems],
              })
              let res: Awaited<ReturnType<NonNullable<typeof access.generateDraftPages>>>
              try {
                res = await access.generateDraftPages!({
                  pages: chunk.map((i) => draftPageInput(pages[i]!, i + 1)),
                  coreHook,
                  ...(topic ? { topic } : {}),
                  ...(pageContext ? { context: pageContext } : {}),
                  canvasW,
                  canvasH,
                  ...(signal ? { signal } : {}),
                })
              } catch (e) {
                res = { ok: false, error: e instanceof Error ? e.message : String(e) }
              }
              chunk.forEach((idx, k) => {
                const m = res.ok ? (res.markers?.[k] ?? null) : null
                if (m) markerByIndex[idx] = m
                else markPageError(idx, res.ok ? undefined : res.error)
              })
              await flushLanded()
            }
          }),
        )
      } else {
        for (let start = 0; start < total; start += GEN_BATCH) {
          if (cancelled()) break
          const batchIdxs = []
          for (let k = start; k < Math.min(start + GEN_BATCH, total); k++) batchIdxs.push(k)
          const results = await Promise.all(
            batchIdxs.map(async (idx) => ({ idx, marker: await genOne(pages[idx], idx + 1) })),
          )
          if (cancelled()) break
          for (const { idx, marker } of results) {
            if (marker && marker.length > 0) {
              markerByIndex[idx] = marker
            } else {
              markPageError(idx)
            }
          }
          // Batch generated → immediately land everything that can land (frontend shows pages one by one)
          await flushLanded()
        }
      }
      if (!cancelled()) await flushLanded() // Finalize

      // ── Two retry rounds for failed pages, re-inserted at their original page position
      //   with insert_at (target position = existing-page offset + pages completed before
      //   this one). Landing-failed pages re-land (cheap: the one-slide pptx already
      //   exists). Cloud generation-failed pages already spent their single retry and stay
      //   skipped; local generation-failed pages get two more single-page attempts here —
      //   draft batches fail as a whole on an empty LLM stream, so one round leaves the
      //   whole batch missing when that failure was transient.
      for (let round = 0; round < 2 && !cancelled(); round++) {
        const retryIdxs = [...new Set([...(useCloud ? [] : genFailed), ...landFailed])].sort(
          (a, b) => a - b,
        )
        for (const idx of retryIdxs) {
          if (cancelled()) break
          let marker = markerByIndex[idx]
          if (!marker && !useCloud) marker = await genOne(pages[idx]!, idx + 1)
          if (!marker) {
            pageProgressItems[idx] = {
              ...pageProgressItems[idx]!,
              status: 'error',
              error: pageErrors[idx],
            }
            continue
          }
          const isFirstLand = !firstDone
          const r = isFirstLand
            ? await access.landGeneratedPages!([marker], insertMode, deckName)
            : await access.landGeneratedPages!(
                [marker],
                'insert_at',
                deckName,
                baseOffset + doneFlags.slice(0, idx).filter(Boolean).length,
              )
          if (r.ok) {
            if (isFirstLand) {
              baseOffset = r.appendedFrom ?? 0
              firstDone = true
            }
            landedPages += 1
            doneFlags[idx] = true
            markerByIndex[idx] = '' // marker spent — a later retry round must not re-land it
            genFailed.splice(0, genFailed.length, ...genFailed.filter((i) => i !== idx))
            landFailed.splice(0, landFailed.length, ...landFailed.filter((i) => i !== idx))
            pageErrors[idx] = r.fallbackReason
            if (r.fallbackReason) degraded.push(idx)
            if (r.imageFailures) deckImageFails.push(...r.imageFailures)
            pageProgressItems[idx] = {
              ...pageProgressItems[idx]!,
              status: 'done',
              error: undefined,
            }
            access.onProgress?.({
              stage: 'pages',
              label: t('aiStagePages'),
              done: landedPages,
              total,
              status: 'running',
              summary: t('aiStagePageRestored', { n: idx + 1 }),
              pages: [...pageProgressItems],
            })
          } else {
            pageErrors[idx] = t('aiErrReinsertFailed', { err: r.error ?? t('aiErrUnknown') })
            pageProgressItems[idx] = {
              ...pageProgressItems[idx]!,
              status: 'error',
              error: pageErrors[idx],
            }
          }
        }
      }

      // User stopped midway: keep landed pages and finish honestly (no more retries / no failed-page reporting)
      if (cancelled()) {
        if (state) state.htmlGenerated = landedPages > 0 || state.htmlGenerated
        access.onProgress?.({
          stage: 'done',
          total: landedPages,
          summary: t('aiSumStoppedKept', { n: landedPages }),
          outcome: 'cancelled',
        })
        return cancelResult(landedPages, total)
      }

      if (state) state.htmlGenerated = true

      // ── Sidecar persistence (fail-open): write styleSkill to .styleskill.json next to the draft
      if (landedPages > 0 && access.saveSidecar && styleSkill) {
        try {
          await access.saveSidecar({
            topic: topic || coreHook || '',
            styleSkill,
            createdAt: new Date().toISOString(),
          })
        } catch {
          /* fail-open: a sidecar failure doesn't block */
        }
      }

      if (landedPages === 0) {
        if (state) state.draftDeck = false
        access.onProgress?.({
          stage: 'done',
          total: 0,
          summary: t('aiStageAllFailed', { n: total }),
          outcome: 'failed',
        })
        return fail(
          t('aiFailGenDeck'),
          `All ${total} pages failed to generate; retry or check the AI model configuration.`,
        )
      }

      // Send completion progress event
      access.onProgress?.({
        stage: 'done',
        total: landedPages,
        summary: t('aiStageDoneSummary', { n: landedPages }),
      })

      const note = buildProgressNote(state)
      const progressTail = note ? `\n${note}` : ''
      // Faithfully report all unfinished pages (both HTML generation failures and conversion/landing failures; all already retried once)
      const stillFailed: number[] = []
      for (let i = 0; i < total; i++) if (!doneFlags[i]) stillFailed.push(i + 1)
      const briefErr = (s?: string) => (s ? (s.length > 80 ? `${s.slice(0, 80)}…` : s) : '')
      if (draftMode) {
        // The draft is on the canvas — hand the next-step choice to the UI's
        // upgrade card (visuals + style pending) instead of making the model
        // spell out tool syntax in its reply.
        access.onUpgradeOffer?.({ visuals: true, style: true })
      }
      const okMsg = draftMode
        ? `Draft deck landed: ${landedPages}/${total} pages — plain layout, real text, labeled placeholder boxes where visuals go. ` +
          `Reply to the user with ONE short sentence in their language: the draft is on the canvas for review — structure and texts are editable now. ` +
          `The next-step buttons (images/infographics first, then the unified design) are rendered by the UI itself — do NOT name tools, stages or JSON syntax in your reply. ` +
          `When the user asks for imagery/infographics → upgrade_deck(stage:"visuals"); for a unified design → upgrade_deck(stage:"style") (the slowest stage — always last); for both → stage:"full". Never run an upgrade unprompted.`
        : `Self-driven generation produced ${landedPages}/${total} pages (HTML written page by page, displayed as generated; failed pages were auto-retried).`
      const failDetail = stillFailed
        .map((n) => `page ${n}${pageErrors[n - 1] ? ` (${briefErr(pageErrors[n - 1])})` : ''}`)
        .join(', ')
      const failMsg = stillFailed.length
        ? ` ⚠️ ${failDetail} still failed after retry (these pages are missing from the deck; later pages shifted forward). To fill them in, call generate_deck again with briefs for just those pages and insert_mode:"append", and tell the user the page is at the end.`
        : ' Fine-tune with the set_element_* / add_* tools.'
      // Pages that went through the plain-text fallback: the page exists in the deck but all design is lost; the model must be told explicitly to redo it in place, not silently treat it as success
      const degradedMsg = degraded.length
        ? ` ⚠️ ${[...degraded]
            .sort((a, b) => a - b)
            .map(
              (i) =>
                `page ${i + 1} (canvas slideIndex=${baseOffset + doneFlags.slice(0, i).filter(Boolean).length})`,
            )
            .join(
              ', ',
            )} degraded to a plain-text fallback page after conversion failure (all layout and styling lost): immediately redo these pages in place with regenerate_slide following the original brief, then reply to the user.`
        : ''
      const imageMissMsg = unresolvedImageSlots.length
        ? `\n⚠️ Unresolved image slots: ${unresolvedImageSlots
            .map((m) => `page ${m.page} ("${m.slot.slice(0, 60)}")`)
            .join(
              ', ',
            )} — neither a searched nor a generated image was produced; those slots are blank. Fill them with insert_web_image after image_search or generate_image (slideIndex = page number - 1).`
        : ''
      return {
        output:
          okMsg + failMsg + degradedMsg + imageFailNote(deckImageFails) + imageMissMsg + progressTail,
        mutated: true,
        summary: t('aiSumDeckGenerated', { done: landedPages, total }),
      }
    }

    case 'upgrade_deck': {
      // ── Staged flow, second step: upgrade the pages of a landed draft IN PLACE.
      //   Every target page is regenerated (cloud or local path) with a brief that
      //   carries its current text verbatim plus the resolved imagery / the new
      //   Style Skill — the text the user already approved is preserved.
      const stage = String(call.input.stage ?? '')
      if (stage !== 'visuals' && stage !== 'style' && stage !== 'full')
        return fail(t('aiFailUpgrade'), 'upgrade_deck requires stage: "visuals" | "style" | "full"')
      if (!access.regenerateSlide)
        return fail(
          t('aiFailUpgrade'),
          'The current environment does not support in-place page landing',
        )
      const upCloud =
        !!access.generatePageCloud &&
        !!(await access.isCloudPageGenEnabled?.().catch(() => false))
      if (!upCloud && !access.generatePageLocal)
        return fail(
          t('aiFailUpgrade'),
          'No page generation pipeline is available in this environment',
        )
      const slidesNow = access.getSlides()
      if (!slidesNow.length)
        return fail(t('aiFailUpgrade'), 'The deck is empty — nothing to upgrade.')

      const wantVisuals = stage !== 'style'
      const wantStyle = stage !== 'visuals'
      const wasDraft = !!state?.draftDeck
      const rawPages = Array.isArray(call.input.pages) ? call.input.pages : null
      const targetSet = new Set<number>()
      if (rawPages) {
        for (const n of rawPages) {
          const i = Number(n) - 1
          if (Number.isInteger(i) && i >= 0 && i < slidesNow.length) targetSet.add(i)
        }
      }
      const targets = (
        targetSet.size ? [...targetSet] : slidesNow.map((_, i) => i)
      ).sort((a, b) => a - b)
      if (!targets.length)
        return fail(t('aiFailUpgrade'), 'No valid target pages (pages are 1-based).')

      const cancelled = () => signal?.aborted === true
      if (cancelled()) return { output: 'Stopped.', mutated: false, summary: t('aiErrStopped') }

      // ── Style resolution (style/full): saved template > fresh Style Skill > hint.
      let styleSkill = ''
      if (wantStyle) {
        const tmpl = String(call.input.style_template ?? '').trim()
        if (tmpl && access.loadStyleTemplate) {
          try {
            const tr = await access.loadStyleTemplate(tmpl)
            if (tr.ok && tr.styleSkill) styleSkill = tr.styleSkill
          } catch {
            /* fail-open */
          }
        }
        if (!styleSkill && access.generateStyleSkill) {
          access.onProgress?.({
            stage: 'style',
            label: t('aiStageStyle'),
            status: 'running',
            summary: t('aiStageStyleRunning'),
          })
          const sr = await access.generateStyleSkill({
            topic: state?.lastTopic || 'Presentation',
            ...(String(call.input.style_hint ?? '').trim()
              ? { styleHint: String(call.input.style_hint).trim() }
              : {}),
            ...(signal ? { signal } : {}),
          })
          access.onProgress?.({
            stage: 'style',
            label: t('aiStageStyle'),
            status: sr.ok ? 'done' : 'error',
            summary: sr.ok ? t('aiStageStyleDone') : (sr.error ?? t('aiErrUnknown')),
          })
          if (sr.ok && sr.styleSkill) styleSkill = sr.styleSkill
        }
        if (!styleSkill)
          styleSkill =
            String(call.input.style_hint ?? '').trim() ||
            state?.lastStyleSkill ||
            'Unified clean modern style: light background, dark text, one primary accent color, sans-serif fonts, generous whitespace'
      }
      const styleForPages = wantStyle
        ? styleSkill
        : 'Keep the page\'s current minimal neutral look (white background, dark text, single blue accent) — this stage only fills the visual slots.'

      // ── Visual slots per page: the draft plan captured at generation + the labeled
      //    placeholder boxes still on the canvas (the labels ARE the slot descriptions —
      //    works even when the deck was edited or the session state was lost).
      const pageTexts: string[] = []
      const pageSlots: string[][] = []
      for (const slide of slidesNow) {
        const infos = collectNodeInfos(slide.nodes)
        pageTexts.push(
          infos
            .filter((n) => n.text && n.text.trim())
            .map((n) => n.text!.trim())
            .join('\n'),
        )
        const found = infos
          .flatMap((n) => (n.text ?? '').split('\n'))
          .map((line) => line.trim())
          .filter((line) => DRAFT_SLOT_RE.test(line))
          .map((line) => line.replace(DRAFT_SLOT_RE, '').trim())
          .filter(Boolean)
        pageSlots.push(found)
      }
      // Merge in the draft-time plan — but ONLY while the draft's labeled placeholders
      // may still be on the canvas (a draft deck that never ran a visuals pass; covers
      // slots whose placeholder was edited/renamed). Once a visuals pass regenerated a
      // page, its labels were consumed by real visuals — merging the remembered
      // descriptions back would resurrect the very placeholder boxes they replaced.
      if (state?.draftImageSlots && state.draftDeck && !state.draftVisualsDone) {
        state.draftImageSlots.forEach((slots, i) => {
          if (i < pageSlots.length) pageSlots[i] = [...new Set([...pageSlots[i]!, ...slots])]
        })
      }

      // ── Resolve the slots to real image URLs (visuals/full): AI generation first,
      //    photo search as fallback; entries already carrying a URL pass through.
      const isUrlStr = (s: string) => /^(https?|file):\/\//i.test(s)
      const normKey = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
      const resolvedByKey = new Map<string, string>()
      const unresolvedSlots: { page: number; slot: string }[] = []
      if (wantVisuals && (access.generateImage || access.searchImages)) {
        const uniqueSlots = [
          ...new Set(targets.flatMap((i) => pageSlots[i] ?? []).map(normKey)),
        ].filter(Boolean)
        const original = new Map<string, string>() // normKey → original text
        for (const i of targets)
          for (const s of pageSlots[i] ?? []) if (!original.has(normKey(s))) original.set(normKey(s), s)
        const pending = uniqueSlots.filter((k) => !isUrlStr(original.get(k) ?? ''))
        for (const k of uniqueSlots) {
          const o = original.get(k) ?? k
          if (isUrlStr(o)) resolvedByKey.set(k, o)
        }
        const canGenerate = !!access.generateImage && access.imageGenAvailable?.() !== false
        if (pending.length) {
          access.onProgress?.({
            stage: 'images',
            label: t('aiStageImages'),
            done: 0,
            total: pending.length,
            status: 'running',
            summary: t('aiStageImagesRunning', { done: 0, total: pending.length }),
          })
          let done = 0
          const tick = () => {
            done++
            access.onProgress?.({
              stage: 'images',
              label: t('aiStageImages'),
              done,
              total: pending.length,
              status: 'running',
              summary: t('aiStageImagesRunning', { done, total: pending.length }),
            })
          }
          const missed: string[] = []
          if (canGenerate) {
            let cur = 0
            await Promise.all(
              Array.from({ length: Math.min(3, pending.length) }, async () => {
                while (cur < pending.length && !cancelled()) {
                  const k = pending[cur++]!
                  try {
                    const r = await access.generateImage!({
                      prompt: original.get(k) ?? k,
                      aspectRatio: '16:9',
                    })
                    if (r.ok && r.url) resolvedByKey.set(k, r.url)
                    else missed.push(k)
                  } catch {
                    missed.push(k)
                  }
                  tick()
                }
              }),
            )
          }
          const toSearch = canGenerate ? missed : pending
          if (toSearch.length && access.searchImages) {
            await Promise.all(
              toSearch.map(async (k) => {
                if (cancelled()) return
                try {
                  const urls = await access.searchImages!(original.get(k) ?? k, 3)
                  if (urls.length) resolvedByKey.set(k, urls[0]!)
                } catch {
                  /* fail-open */
                }
              }),
            )
          }
          access.onProgress?.({
            stage: 'images',
            label: t('aiStageImages'),
            done: pending.length,
            total: pending.length,
            status: 'done',
            summary: t('aiStageImagesDone', { n: pending.length }),
          })
        }
      }
      // Persist slot→URL resolutions across upgrade calls: the "IMAGE:"/"CHART:" labels
      // disappear from the canvas once a page regenerates, and without this map a later
      // style/design restyle would lose the imagery the user already paid to generate.
      if (state && resolvedByKey.size) {
        const merged = { ...(state.draftResolvedSlots ?? {}) }
        for (const [k, u] of resolvedByKey) merged[k] = u
        state.draftResolvedSlots = merged
      }

      // ── Regenerate the target pages in place (batched, ordered by index).
      const GEN_BATCH = upCloud ? 4 : 2
      const upTotal = targets.length
      const upItems: PageProgressItem[] = targets.map((i) => ({
        title: pageTexts[i]?.split('\n')[0]?.slice(0, 40) || t('aiPageN', { n: i + 1 }),
        status: 'pending',
      }))
      access.onProgress?.({
        stage: 'pages',
        label: t('aiStageUpgrade'),
        done: 0,
        total: upTotal,
        status: 'running',
        summary: t('aiStagePageRunning', { n: 1, total: upTotal }),
        pages: [...upItems],
      })
      const upgraded: number[] = []
      const upFailed: number[] = []
      const upErrors: Record<number, string> = {}
      for (let s = 0; s < targets.length; s += GEN_BATCH) {
        if (cancelled()) break
        const batch = targets.slice(s, s + GEN_BATCH)
        await Promise.all(
          batch.map(async (idx) => {
            const pos = targets.indexOf(idx)
            upItems[pos] = { ...upItems[pos]!, status: 'running' }
            const slotList = (pageSlots[idx] ?? []).filter(Boolean)
            // Every visual this page already carries: slots resolved in this run
            // (resolvedByKey), slots resolved by an earlier visuals pass — the labels
            // are gone from the canvas but the generated image must survive a design
            // restyle (state.draftResolvedSlots via the remembered slot descriptions) —
            // plus explicit URLs that were passed through.
            const slotDescs = [
              ...new Set([
                ...slotList,
                // draftImageSlots indexes the pages THIS state generated — for an
                // append run that's only the appended tail, so shift by the offset;
                // earlier canvas pages must not inherit the appended pages' slots.
                ...(idx >= (state?.draftSlotsOffset ?? 0)
                  ? (state?.draftImageSlots?.[idx - (state?.draftSlotsOffset ?? 0)] ?? [])
                  : []),
              ]),
            ]
            const preserved = slotDescs
              .map(
                (s) =>
                  resolvedByKey.get(normKey(s)) ??
                  state?.draftResolvedSlots?.[normKey(s)] ??
                  (isUrlStr(s) ? s : ''),
              )
              .filter(Boolean) as string[]
            // Images recorded for this page by an earlier upgrade pass (covers decks
            // with no draft slots at all).
            const remembered = [...new Set([...preserved, ...(state?.draftPageImages?.[idx] ?? [])])]
            // No recoverable URL at all (imported deck, manual inserts, lost session):
            // re-feed the pictures themselves — the renderer materializes the embedded
            // data: bytes into the generated-image store. Local path only; the cloud
            // service cannot reach local bytes, so those pages keep today's behavior.
            const canvasImgs: string[] = []
            if (!remembered.length && !upCloud && access.storeImageData) {
              for (const d of pictureDataUrls(slidesNow[idx]?.nodes).slice(0, 4)) {
                try {
                  const r = await access.storeImageData(d)
                  if (r.ok && r.url) canvasImgs.push(r.url)
                } catch {
                  /* fail-open */
                }
              }
            }
            const imageUrls = [...new Set([...remembered, ...canvasImgs])].filter((u) =>
              upCloud ? /^https?:\/\//.test(u) : isUrlStr(u),
            )
            for (const s2 of slotList) {
              if (
                !resolvedByKey.has(normKey(s2)) &&
                !isUrlStr(s2) &&
                !state?.draftResolvedSlots?.[normKey(s2)]
              )
                unresolvedSlots.push({ page: idx + 1, slot: s2 })
            }
            const keepPlaceholders =
              !wantVisuals && slotList.length
                ? '\nBoxes labeled "IMAGE:"/"CHART:" are intentional visual placeholders — recreate them as light-gray labeled boxes in the new style (same labels).'
                : ''
            const fillSlots =
              wantVisuals && slotList.length
                ? imageUrls.length
                  ? `\nThis page has labeled visual placeholders ("IMAGE:"/"CHART:" boxes). Replace each with a real visual: use these images where they fit — ${imageUrls.join(', ')} — and render "CHART:"/"INFOGRAPHIC:" slots as real composed visuals (bars/timeline/diagram shapes from the described data). Remove the placeholder boxes and labels.`
                  : '\nThis page has labeled visual placeholders ("IMAGE:"/"CHART:" boxes). No images resolved — render each slot as a real composed visual from shapes (bars/timeline/diagram matching the described content), or as a clean styled box without the "IMAGE:"/"CHART:" label. Remove the placeholder labels.'
                : ''
            const keepImages =
              !fillSlots && imageUrls.length
                ? `\nThis page already has imagery — reuse these exact images as its real visuals: ${imageUrls.join(', ')}. Do not swap them for placeholder boxes or different pictures.`
                : ''
            const brief =
              `Rewrite this page${wantStyle ? " applying the deck's new unified style" : ''}. ` +
              `Keep ALL existing text content verbatim — do not shorten, drop or translate any of it.\n` +
              `Current page content:\n${pageTexts[idx] || '(empty page)'}` +
              fillSlots +
              keepImages +
              keepPlaceholders +
              '\nKeep the same general layout structure and page role (cover/content/closing).'
            const genArgs = {
              pageIndex: idx + 1,
              totalPages: slidesNow.length,
              coreHook: '',
              style: styleForPages,
              title: pageTexts[idx]?.split('\n')[0]?.slice(0, 80) ?? '',
              brief,
              layout: '',
              images: imageUrls,
              canvasW: 1280,
              canvasH: 720,
              ...(signal ? { signal } : {}),
            }
            const gen = upCloud ? access.generatePageCloud! : access.generatePageLocal!
            let marker: string | null = null
            let lastErr = ''
            for (let attempt = 0; attempt < 2 && !marker; attempt++) {
              if (cancelled()) return
              if (attempt > 0) await new Promise((r) => setTimeout(r, access.retryBackoffMs ?? 2000))
              const res = await gen(genArgs)
              if (res.ok && res.marker) marker = res.marker
              else lastErr = res.error ?? t('aiErrUnknown')
            }
            if (!marker) {
              upFailed.push(idx)
              upErrors[idx] = lastErr
              upItems[pos] = { ...upItems[pos]!, status: 'error', error: lastErr }
              return
            }
            const r = await access.regenerateSlide!(idx, marker)
            if (r.ok) {
              upgraded.push(idx)
              if (state) {
                state.draftPageImages ??= new Array(slidesNow.length).fill([])
                state.draftPageImages[idx] = imageUrls
              }
              upItems[pos] = { ...upItems[pos]!, status: 'done' }
            } else {
              upFailed.push(idx)
              upErrors[idx] = r.error ?? t('aiErrUnknown')
              upItems[pos] = { ...upItems[pos]!, status: 'error', error: upErrors[idx] }
            }
            access.onProgress?.({
              stage: 'pages',
              label: t('aiStageUpgrade'),
              done: upgraded.length,
              total: upTotal,
              status: 'running',
              summary: t('aiStagePageRunning', { n: Math.min(upgraded.length + 1, upTotal), total: upTotal }),
              pages: [...upItems],
            })
          }),
        )
      }
      if (upgraded.length && wantVisuals && state) state.draftVisualsDone = true
      if (upgraded.length && wantStyle && state) {
        state.draftDeck = false
        // draftImageSlots / draftResolvedSlots / draftPageImages stay: the slot
        // descriptions are what let a LATER restyle (e.g. another style preset) find
        // the resolved image URLs again — clearing them would lose imagery under the
        // cloud path, where canvas data: bytes can't be re-fed.
        if (styleSkill) state.lastStyleSkill = styleSkill
      }
      // Offer the remaining stages as UI buttons (a draft that just got visuals
      // still needs its design pass, and vice versa).
      if (wasDraft && upgraded.length) {
        access.onUpgradeOffer?.({
          visuals: !state?.draftVisualsDone,
          style: !!state?.draftDeck,
        })
      }
      access.onProgress?.({
        stage: 'done',
        total: upgraded.length,
        summary: t('aiSumUpgrade', { done: upgraded.length, total: upTotal }),
      })
      if (!upgraded.length) {
        return fail(
          t('aiFailUpgrade'),
          `Upgrade failed for all ${upTotal} page(s)${upFailed.length ? ` — first error: ${upErrors[upFailed[0]!]}` : ''}. The deck was not modified; retry or tell the user to try again in a few minutes.`,
        )
      }
      const stageLabel =
        stage === 'visuals' ? 'visuals' : stage === 'style' ? 'style' : 'visuals + style'
      const failNote = upFailed.length
        ? ` ⚠️ ${upFailed.map((i) => `page ${i + 1}`).join(', ')} failed (${upErrors[upFailed[0]!] ?? 'error'}) — those pages keep their previous content; retry them with upgrade_deck(pages:[${upFailed.map((i) => i + 1).join(',')}]).`
        : ''
      const slotNote = unresolvedSlots.length
        ? ` Unresolved visual slots: ${unresolvedSlots.map((u) => `page ${u.page} "${u.slot.slice(0, 40)}"`).join(', ')} — fill them with generate_image/image_search + insert_web_image.`
        : ''
      const nextNote =
        wasDraft && state?.draftDeck && !state?.draftVisualsDone
          ? ' The deck still needs visuals and design — the UI is showing the corresponding buttons; mention them in plain words only.'
          : wasDraft && state?.draftDeck
            ? ' The deck still has the draft look — the UI is showing a "design" button; mention it in plain words only (do not name tools or syntax).'
            : wasDraft && !state?.draftVisualsDone
              ? ' The design is applied but visual placeholders may remain — the UI shows the visuals button; mention it in plain words only.'
              : ''
      return {
        output:
          `Upgraded ${upgraded.length}/${upTotal} page(s) in place (${stageLabel}); each landing is undoable.` +
          failNote +
          slotNote +
          nextNote,
        mutated: true,
        summary: t('aiSumUpgrade', { done: upgraded.length, total: upTotal }),
      }
    }

    case 'edit_chart': {
      const idx = Number(call.input.slideIndex)
      const sourceId = String(call.input.sourceId ?? '')
      if (!slides[idx])
        return fail(t('aiFailChartEdit'), `slideIndex out of range (0-${slides.length - 1})`)
      const op: import('../../shared/ipc').EditChartOp = { slideIndex: idx, sourceId }
      if (call.input.kind != null)
        op.kind = String(call.input.kind) as import('../../shared/ipc').EditChartOp['kind']
      if (Array.isArray(call.input.categories))
        op.categories = (call.input.categories as unknown[]).map(String)
      if (Array.isArray(call.input.series)) {
        const gateErr = dataSourceGateError(call, state)
        if (gateErr) return fail(t('aiFailChartEdit'), gateErr)
        op.series = (call.input.series as Array<{ name: unknown; values: unknown[] }>).map((s) => ({
          name: String(s.name ?? ''),
          values: (Array.isArray(s.values) ? s.values : []).map(Number),
        }))
      }
      if (call.input.colorScheme != null) op.colorScheme = String(call.input.colorScheme)
      if (call.input.title != null) op.title = String(call.input.title)
      if (call.input.legendPos != null)
        op.legendPos = String(
          call.input.legendPos,
        ) as import('../../shared/ipc').EditChartOp['legendPos']
      if (typeof call.input.dataLabels === 'boolean') op.dataLabels = call.input.dataLabels
      if (typeof call.input.gridlines === 'boolean') op.gridlines = call.input.gridlines
      if (call.input.switchRowCol === true) op.switchRowCol = true
      const updated = await window.slidesApi.editChart(op)
      if (!updated)
        return fail(
          t('aiFailChartEdit'),
          `Operation failed (element ${sourceId} does not exist or is not a chart)`,
        )
      access.applySlide(idx, updated.slide)
      const sampleNote = op.series && call.input.dataSource === 'sample' ? SAMPLE_DATA_NOTE : ''
      return {
        output: `Updated chart ${sourceId} on page ${idx + 1}.${sampleNote}`,
        mutated: true,
        summary: t('aiSumChartEdit', { n: idx + 1 }),
      }
    }

    case 'apply_ops': {
      const opsIn = Array.isArray(call.input.ops) ? (call.input.ops as unknown[]) : null
      if (!opsIn || opsIn.length === 0)
        return fail(t('aiFailApplyOps'), 'ops must be a non-empty array')
      const pre = preflightOps(opsIn, slides, state)
      if (!('ops' in pre)) return pre
      const r = await window.slidesApi.applyTxn?.({
        ops: pre.ops,
        ...(call.input.dry_run === true ? { dryRun: true } : {}),
        ...(call.input.isolation === 'per_op' ? { isolation: 'per_op' as const } : {}),
      })
      if (!r) return fail(t('aiFailApplyOps'), 'The transaction could not be executed')
      const failLines = (r.failures ?? []).map((f) => `- ops[${f.index}]: ${f.error}`).join('\n')
      if (r.dryRun) {
        const planStr = (r.plan ?? []).join('\n')
        return {
          output:
            `Dry run — the deck was NOT modified.\n` +
            (planStr ? `Valid plan:\n${planStr}\n` : '') +
            (failLines ? `Rejected ops:\n${failLines}\n` : 'All ops validated.\n') +
            `Resend with dry_run omitted to apply.`,
          mutated: false,
          summary: t('aiSumApplyOpsDryRun'),
        }
      }
      if (!r.applied) {
        return fail(
          t('aiFailApplyOps'),
          `Nothing was applied${call.input.isolation === 'per_op' ? '' : ' (atomic)'}:\n${failLines || 'unknown failure'}`,
        )
      }
      // Ops can delete slides — clamp the current index into the rebuilt deck
      // (page deletion may leave the current index past the end)
      access.applyDeck(r.slides!, Math.max(0, Math.min(access.getCurrent(), r.slides!.length - 1)))
      const created = (r.records ?? []).flatMap((rec) => rec.created ?? [])
      const doneStr = (r.records ?? [])
        .map((rec) => `${rec.op}${rec.target ? ` @${rec.target}` : ''}`)
        .join(', ')
      return {
        output:
          `Applied ${r.records?.length ?? 0} op(s): ${doneStr}.` +
          (created.length ? ` New element ids: ${created.join(', ')}.` : '') +
          (failLines ? `\nSkipped (per_op):\n${failLines}` : '') +
          (pre.sampleData ? SAMPLE_DATA_NOTE : '') +
          auditTouchedPages(r.records, r.slides!),
        mutated: true,
        summary: applyOpsSummary(pre.ops, r.records?.length ?? 0),
      }
    }

    case 'load_guide': {
      const raw = Array.isArray(call.input.groups) ? call.input.groups.map(String) : []
      if (raw.length === 0) return fail(t('aiFailLoadGuide'), 'groups must be a non-empty array')
      const unknown = raw.filter((g) => !opGuide(g))
      if (unknown.length > 0) {
        return fail(
          t('aiFailLoadGuide'),
          `Unknown guide group(s): ${unknown.join(', ')}. Available: ${OP_GROUPS.join(', ')}.`,
        )
      }
      const groups = [...new Set(raw)]
      return {
        output: groups.map((g) => opGuide(g)!).join('\n\n---\n\n'),
        mutated: false,
        summary: t('aiSumLoadGuide', { names: groups.join(', ') }),
      }
    }

    case 'save_style_template': {
      const name = String(call.input.name ?? '').trim()
      if (!name) return fail(t('aiFailSaveTemplate'), 'name must not be empty')
      if (!access.saveStyleTemplate)
        return fail(
          t('aiFailSaveTemplate'),
          'The current environment does not support template saving',
        )
      const styleSkillToSave = state?.lastStyleSkill ?? ''
      const topicToSave = state?.lastTopic ?? ''
      if (!styleSkillToSave)
        return fail(
          t('aiFailSaveTemplate'),
          'The current deck has no Style Skill to save (generate a presentation with generate_deck first)',
        )
      const r = await access.saveStyleTemplate(name, {
        topic: topicToSave,
        styleSkill: styleSkillToSave,
        createdAt: new Date().toISOString(),
      })
      if (!r.ok) return fail(t('aiFailSaveTemplate'), r.error ?? 'Save failed')
      return {
        output: `Saved the style "${name}" as a template; next time pass style_template:"${name}" to reuse it directly.`,
        mutated: false,
        summary: t('aiSumSaveTemplate', { name }),
      }
    }

    case 'list_style_templates': {
      if (!access.listStyleTemplates)
        return fail(
          t('aiFailListTemplates'),
          'The current environment does not support template listing',
        )
      const templates = await access.listStyleTemplates()
      if (templates.length === 0) {
        return {
          output:
            'No saved style templates yet. After generating a deck, call save_style_template(name) to save the current style.',
          mutated: false,
          summary: t('aiSumTemplatesEmpty'),
        }
      }
      const lines = templates.map(
        (t) => `- ${t.name} (topic: ${t.topic || 'unknown'}, saved ${t.createdAt.slice(0, 10)})`,
      )
      return {
        output: `Saved style templates (${templates.length}):\n${lines.join('\n')}\n\nPass style_template:"<template name>" to generate_deck to reuse that style directly.`,
        mutated: false,
        summary: t('aiSumListTemplates', { count: templates.length }),
      }
    }

    default:
      return fail(call.name, `Unknown tool: ${call.name}`)
  }
}
