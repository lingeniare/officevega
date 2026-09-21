import { t, type StringKey } from '../i18n/locale'

/**
 * Tool name → i18n key for the live "running" chip. Reuses the short aiTool*
 * labels (already localized for every tool) — no separate running-string set.
 */
const TOOL_LABEL_KEYS: Record<string, StringKey> = {
  get_workbook_context: 'aiToolWorkbookContext',
  read_range: 'aiToolReadRange',
  aggregate_range: 'aiToolAggregate',
  load_guide: 'aiToolLoadGuide',
  read_formats: 'aiToolReadFormats',
  read_sheet_features: 'aiToolSheetFeatures',
  read_cells: 'aiToolReadCells',
  find_cells: 'aiToolFindCells',
  select_range: 'aiToolSelectRange',
  trace_precedents: 'aiToolTracePrecedents',
  trace_dependents: 'aiToolTraceDependents',
  propose_operations: 'aiToolPropose',
  create_document: 'aiToolCreateDocument',
  web_search: 'aiToolWebSearch',
  image_search: 'aiToolImageSearch',
  generate_image: 'aiToolGenImage',
  merge_attached_workbooks: 'aiToolMerge',
  read_attachment: 'aiToolReadAttachment',
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
