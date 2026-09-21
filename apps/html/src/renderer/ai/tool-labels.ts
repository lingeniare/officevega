import { t, type StringKey } from '../i18n/locale'

/**
 * Tool name → i18n key for the live "running" chip. Reuses the short aiTool/aiSum
 * labels (already localized for every tool) — no separate running-string set.
 */
const TOOL_LABEL_KEYS: Record<string, StringKey> = {
  get_outline: 'aiToolOutline',
  read_source: 'aiToolReadSource',
  apply_ops: 'aiToolApplyOpsRunning',
  ask_clarification: 'aiToolClarify',
  plan_page: 'aiDraftingBrief',
  write_document: 'aiToolWritePage',
  web_search: 'aiToolWebSearch',
  read_attachment: 'aiSumReadAttachment',
}

/** Short localized label for a tool; unmapped names fall back to the prettified raw name. */
export function toolLabel(name: string): string {
  const key = TOOL_LABEL_KEYS[name]
  return key ? t(key) : name.replace(/[_-]+/g, ' ')
}

/**
 * agent-core error paths (unparsable input, thrown tool, unknown tool) pass the raw
 * tool name through as the summary — swap it for the localized label.
 */
export function localizedToolSummary(name: string, summary: string): string {
  return summary === name ? toolLabel(name) : summary
}
