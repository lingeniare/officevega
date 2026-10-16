/**
 * The user guide as model context for the Home "Ask AI" panel: the chat
 * answers how-to questions about VEGA Office itself, not only about the
 * starred files. The manual ships as one markdown topic per feature under
 * i18n/help/topics — this module loads all of them once per manual edition
 * (ru/en, see manualLangFor), stitches them into a single document, and the
 * app-manual skill exposes it through a live systemPrompt getter: the guide
 * is part of every prompt but never lands in the chat history, where it
 * would be re-sent on every turn.
 */
import type { AgentSkill } from '@genoffice/agent-core'
import {
  HELP_TOPICS,
  helpBody,
  manualLangFor,
  type ManualLang,
} from './i18n/help/help-registry'
import { topicTitle } from './i18n/help/help-titles'
import authorMd from '../../../../../AUTHOR.md?raw'

/** one stitched manual per edition; lazy — each topic body is its own chunk */
const manualCache = new Map<ManualLang, Promise<string>>()

function loadManual(lang: ManualLang): Promise<string> {
  const cached = manualCache.get(lang)
  if (cached) return cached
  const loading = Promise.all(
    HELP_TOPICS.map(async (topic) => {
      const body = await helpBody(topic.id, lang)
      if (!body) return ''
      // screenshots are for the human reader; the refs are dead weight here
      const text = body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim()
      return `### ${topicTitle(topic.id, lang)}\n\n${text}`
    }),
  ).then((parts) => parts.filter(Boolean).join('\n\n---\n\n'))
  manualCache.set(lang, loading)
  return loading
}

/**
 * Everything the model needs about the product: the full user guide plus the
 * author card (AUTHOR.md at the repo root, inlined at build time).
 */
export function preloadAskManual(): Promise<string> {
  return loadManual(manualLangFor(navigator.language)).then(
    (manual) => `${manual}\n\n---\n\n${authorMd.trim()}`,
  )
}

const MANUAL_SYSTEM_PROMPT = `## Product manual
You also answer questions about using VEGA Office itself: features, settings,
shortcuts, file formats, AI providers, and who made the app. The user guide
markdown below is the reference — answer from it plainly and briefly, in the
user's language, and say so when the guide does not cover the question.`

/**
 * No tools: the guide rides the composed system prompt via a live getter, so
 * it is always in the prompt yet never accumulates inside the chat history.
 */
export function createAppManualSkill(getManual: () => string): AgentSkill {
  return {
    id: 'app-manual',
    get systemPrompt() {
      const manual = getManual()
      return manual ? `${MANUAL_SYSTEM_PROMPT}\n\n${manual}` : ''
    },
    tools: [],
    executeTool: () => ({
      output: 'no app-manual tool',
      isError: true,
      summary: 'app manual',
    }),
  }
}
