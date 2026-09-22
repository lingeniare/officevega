import { app } from 'electron'
import type { WebContents } from 'electron'

/**
 * Dev-only renderer diagnostics: mirrors a webContents' console messages plus
 * the failure signals that never reach the console (crashes, preload errors,
 * hung renderers) into the main process stderr, so they show up in the
 * `npm run dev` terminal. No-op in packaged builds.
 */
export function forwardRendererConsole(wc: WebContents, tag: string): void {
  if (app.isPackaged) return
  wc.on('console-message', (details) => {
    const loc = details.sourceId ? ` (${details.sourceId}:${details.lineNumber})` : ''
    process.stderr.write(`[${tag}:${details.level}] ${details.message}${loc}\n`)
  })
  wc.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit')
      process.stderr.write(
        `[${tag}] render process gone: ${details.reason} (exitCode=${details.exitCode})\n`,
      )
  })
  wc.on('unresponsive', () => process.stderr.write(`[${tag}] renderer unresponsive\n`))
  wc.on('preload-error', (_event, path, error) => {
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)
    process.stderr.write(`[${tag}] preload error (${path}): ${detail}\n`)
  })
}
