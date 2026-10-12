/// "Export …" of renderer-produced text (AI chat transcripts, reports): a save
/// dialog that remembers its folder, then a UTF-8 write — the same shape as
/// saveImageFromUrl but for text payloads.
import { writeFile } from 'node:fs/promises'
import type { BrowserWindow } from 'electron'
import { showSaveDialogWithMemory } from './dialog-memory'

export interface SaveTextResult {
  ok: boolean
  path?: string
  error?: string
}

export async function saveTextFileWithDialog(
  parent: BrowserWindow | null | undefined,
  opts: {
    title: string
    /** suggested file name including the extension */
    defaultName: string
    /** extension without the dot, used for the filter and a missing-suffix fix-up */
    ext: string
    /** human-readable filter name ("Markdown") */
    filterName: string
    content: string
    fallbackDir?: string
  },
): Promise<SaveTextResult> {
  try {
    const { dialog } = await import('electron')
    const picked = await showSaveDialogWithMemory(
      dialog,
      parent,
      {
        title: opts.title,
        defaultPath: opts.defaultName,
        filters: [{ name: opts.filterName, extensions: [opts.ext] }],
      },
      opts.fallbackDir,
    )
    if (picked.canceled || !picked.filePath) return { ok: false }
    let filePath = picked.filePath
    if (!filePath.toLowerCase().endsWith(`.${opts.ext}`)) filePath += `.${opts.ext}`
    await writeFile(filePath, opts.content, 'utf8')
    return { ok: true, path: filePath }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
