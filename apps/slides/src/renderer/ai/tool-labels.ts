import { t, type StringKey } from '../i18n/locale'

/**
 * Tool name → i18n key for the live "running" chip. Reuses the short aiFail/aiSum
 * labels (already localized for every tool) — no separate running-string set.
 */
const TOOL_LABEL_KEYS: Record<string, StringKey> = {
  read_slide: 'aiFailReadSlide',
  execute_slide_script: 'aiFailScript',
  execute_layout_script: 'aiFailScript',
  web_search: 'aiFailWebSearch',
  image_search: 'aiFailImageSearch',
  generate_image: 'aiFailGenImage',
  analyze_media: 'aiFailMedia',
  insert_web_image: 'aiFailInsertImage',
  replace_image: 'aiFailReplaceImage',
  ask_clarification: 'aiFailClarify',
  plan_deck: 'aiFailPlan',
  regenerate_slide: 'aiFailRegen',
  generate_deck: 'aiFailGenDeck',
  upgrade_deck: 'aiFailUpgrade',
  save_style_template: 'aiFailSaveTemplate',
  list_style_templates: 'aiFailListTemplates',
  edit_chart: 'aiFailChartEdit',
  apply_ops: 'aiFailApplyOps',
  load_guide: 'aiFailLoadGuide',
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
