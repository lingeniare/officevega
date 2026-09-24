import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { realizedPath } from './fs'
import { CliError, EXIT } from './result'

function userDataBase(env: NodeJS.ProcessEnv): string {
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support')
  if (process.platform === 'win32') return env.APPDATA || join(homedir(), 'AppData', 'Roaming')
  return env.XDG_CONFIG_HOME || join(homedir(), '.config')
}

/** The shell's Electron userData directory, located without Electron (OFFICEVEGA_USER_DATA, or the pre-rename VEGAOFFICE_USER_DATA, overrides). */
export function officeVegaUserDataDir(env: NodeJS.ProcessEnv): string {
  const override = env.OFFICEVEGA_USER_DATA || env.VEGAOFFICE_USER_DATA
  if (override) return override
  return join(userDataBase(env), 'OfficeVega')
}

/** userData of pre-rename installs — same file layout under "<base>/VegaOffice". */
export function legacyUserDataDir(env: NodeJS.ProcessEnv): string {
  return join(userDataBase(env), 'VegaOffice')
}

/**
 * userData dirs to probe, newest first: the packaged dir, a checkout's
 * "<name> Dev" twin, then the same pair for the pre-rename "VegaOffice"
 * install whose files the app has not migrated yet.
 */
export function userDataDirCandidates(env: NodeJS.ProcessEnv): string[] {
  const override = env.OFFICEVEGA_USER_DATA || env.VEGAOFFICE_USER_DATA
  if (override) return [override]
  const dir = officeVegaUserDataDir(env)
  const legacy = legacyUserDataDir(env)
  return [dir, `${dir} Dev`, legacy, `${legacy} Dev`]
}

export interface GuiOpenDocuments {
  pid: number
  paths: string[]
}

/**
 * Files the running OfficeVega shell has open, from the registry it publishes
 * on every tab change (apps/shell/src/main/open-documents.ts). Null when no
 * shell is running: a registry whose pid is gone is a crash leftover.
 */
export function guiOpenDocuments(env: NodeJS.ProcessEnv): GuiOpenDocuments | null {
  for (const dir of userDataDirCandidates(env)) {
    const path = join(dir, 'open-documents.json')
    if (!existsSync(path)) continue
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<GuiOpenDocuments>
      if (typeof raw.pid !== 'number' || !Array.isArray(raw.paths)) continue
      if (!processAlive(raw.pid)) continue
      return { pid: raw.pid, paths: raw.paths.filter((p): p is string => typeof p === 'string') }
    } catch {
      continue
    }
  }
  return null
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** Refuses to write a document the editor is showing; `--force` skips this. */
export function assertNotOpenInGui(abs: string, env: NodeJS.ProcessEnv): void {
  const open = guiOpenDocuments(env)
  if (!open || open.paths.length === 0) return
  const target = realizedPath(abs)
  if (!open.paths.some((p) => realizedPath(p) === target)) return
  throw new CliError(
    EXIT.file,
    `OfficeVega has this file open: ${abs}`,
    { gui_pid: open.pid },
    {
      reason: 'file_open_in_gui',
      suggestion:
        'close the tab in OfficeVega first, or pass --force to write anyway (the editor may overwrite your change on its next save)',
    },
  )
}
