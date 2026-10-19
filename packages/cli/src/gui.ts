import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { realizedPath } from './fs'
import { CliError, EXIT } from './result'

function userDataBase(env: NodeJS.ProcessEnv): string {
  // Resolve the home from the env we were given (as os.homedir() does with process.env.HOME), so
  // an in-process caller with a substituted HOME never lands in the real user directories.
  const home = env.HOME || homedir()
  if (process.platform === 'darwin') return join(home, 'Library', 'Application Support')
  if (process.platform === 'win32') return env.APPDATA || join(home, 'AppData', 'Roaming')
  return env.XDG_CONFIG_HOME || join(home, '.config')
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
 * userData dirs to probe, newest first: the packaged dir, then the dev
 * profiles, then the same triple for the pre-rename "VegaOffice" install
 * whose files the app has not migrated yet.
 *
 * The dev profile has been spelled two ways. It was "<name> Dev" until the
 * shell moved to "<name>-Dev" — a space breaks XDG config entries, which are
 * meant to be one token (genoffice#1817) — and the shell renames the old
 * directory on first run after that (apps/shell/src/main/index.ts). Both
 * spellings are scanned here, new first, because a profile that was never
 * migrated still has to be reachable: a shell that has not run since the
 * rename, or a migration that could not move a busy directory.
 */
export function userDataDirCandidates(env: NodeJS.ProcessEnv): string[] {
  const override = env.OFFICEVEGA_USER_DATA || env.VEGAOFFICE_USER_DATA
  if (override) return [override]
  const dir = officeVegaUserDataDir(env)
  const legacy = legacyUserDataDir(env)
  return [dir, `${dir}-Dev`, `${dir} Dev`, legacy, `${legacy}-Dev`, `${legacy} Dev`]
}

export interface GuiOpenDocuments {
  pid: number
  paths: string[]
}

/**
 * Files the running OfficeVega shells have open, from the registries they publish
 * on every tab change (apps/shell/src/main/open-documents.ts). Empty when no
 * shell is running: a registry whose pid is gone is a crash leftover.
 */
export function guiOpenDocuments(
  env: NodeJS.ProcessEnv,
  dirs = userDataDirCandidates(env),
): GuiOpenDocuments[] {
  const live: GuiOpenDocuments[] = []
  for (const dir of dirs) {
    const path = join(dir, 'open-documents.json')
    if (!existsSync(path)) continue
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<GuiOpenDocuments>
      if (typeof raw.pid !== 'number' || !Array.isArray(raw.paths)) continue
      if (!processAlive(raw.pid)) continue
      live.push({
        pid: raw.pid,
        paths: raw.paths.filter((p): p is string => typeof p === 'string'),
      })
    } catch {
      continue
    }
  }
  return live
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
  const target = realizedPath(abs)
  for (const open of guiOpenDocuments(env)) {
    if (!open.paths.some((p) => realizedPath(p) === target)) continue
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
}
