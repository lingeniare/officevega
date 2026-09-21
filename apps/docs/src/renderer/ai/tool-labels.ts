import { t, type StringKey } from '../i18n/locale'

/**
 * Tool name → i18n key for the live "running" chip. Reuses the short aiSum*
 * labels (already localized for every tool) — no separate running-string set.
 */
const TOOL_LABEL_KEYS: Record<string, StringKey> = {
  get_document_context: 'aiSumReadDocContext',
  read_blocks: 'aiSumReadBlocks',
  insert_content: 'aiSumInsertContent',
  write_document: 'aiSumWriteDocument',
  replace_blocks: 'aiSumReplaceContent',
  replace_selection: 'aiSumReplaceSelection',
  apply_ops: 'aiSumApplyCommands',
  read_revisions: 'aiSumReadRevisions',
  accept_changes: 'aiSumAcceptChanges',
  reject_changes: 'aiSumRejectChanges',
  read_comments: 'aiSumReadComments',
  reply_comment: 'aiSumReplyComment',
  resolve_comment: 'aiSumResolveComment',
  insert_footnote: 'aiSumInsertFootnote',
  insert_endnote: 'aiSumInsertEndnote',
  delete_note: 'aiSumDeleteNote',
  read_notes: 'aiSumReadNotes',
  add_comment: 'aiSumAddComment',
  delete_comment: 'aiSumDeleteComment',
  web_search: 'aiSumWebSearch',
  image_search: 'aiSumImageSearch',
  insert_image: 'aiSumInsertWebImage',
  generate_image: 'aiSumGenerateImage',
  insert_chart: 'aiSumInsertChart',
  edit_chart: 'aiSumEditChart',
  set_header_footer: 'aiSumSetHeaderFooter',
  create_document: 'aiSumCreateDocument',
  define_style: 'aiSumDefineStyle',
  list_styles: 'aiSumListStyles',
  set_page_setup: 'aiSumSetPageSetup',
  insert_section_break: 'aiSumInsertSectionBreak',
  set_watermark: 'aiSumSetWatermark',
  insert_picture: 'aiSumInsertPicture',
  insert_text_box: 'aiSumInsertTextBox',
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
