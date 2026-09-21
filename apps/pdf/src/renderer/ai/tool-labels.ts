import { t, type StringKey } from '../i18n/locale'

/**
 * Tool name → i18n key for a short chip label. Most pdf aiTool* summaries are
 * parameterized ({page}/{count}) so they can't double as labels; only the
 * param-less ones are mapped — everything else falls back to aiToolGeneric.
 */
const TOOL_LABEL_KEYS: Record<string, StringKey> = {
  read_annotations: 'aiToolReadAnnots',
  list_inserted_text: 'aiToolListInsertedText',
  edit_inserted_text: 'aiToolEditInsertedText',
  move_inserted_text: 'aiToolMoveInsertedText',
  delete_inserted_text: 'aiToolDeleteInsertedText',
  generate_image: 'aiToolGenImage',
  list_page_images: 'aiToolListImages',
  get_outline: 'aiToolOutline',
  set_watermark: 'aiToolWatermark',
  set_header_footer: 'aiToolHeaderFooter',
  create_document: 'aiToolCreateDocument',
}

/** Short localized label for a tool; unmapped names get the generic localized label. */
export function toolLabel(name: string): string {
  const key = TOOL_LABEL_KEYS[name]
  return key ? t(key) : t('aiToolGeneric')
}

/**
 * agent-core error paths (unparsable input, thrown tool, unknown tool) pass the raw
 * tool name through as the summary — swap it for the localized label.
 */
export function localizedToolSummary(name: string, summary: string): string {
  return summary === name ? toolLabel(name) : summary
}
