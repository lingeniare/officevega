/**
 * Dev entry point for the shell that scrubs ELECTRON_RUN_AS_NODE.
 *
 * Electron-hosted terminals (IDE/agent shells such as Devin Desktop) export
 * ELECTRON_RUN_AS_NODE=1; when the spawned electron binary inherits it, it
 * boots as plain Node.js, so the bundled `require('electron')` resolves to the
 * npm package shim (the executable path string) and the main process dies on
 * the first `ipcMain` access — which concurrently -k turns into a full
 * shutdown of every dev server. The variable must be deleted outright:
 * Electron treats even an empty value as "set".
 *
 * Spawns electron-vite's JS bin via process.execPath instead of npm: on
 * Windows npm resolves to npm.cmd, and Node refuses to spawn .cmd without a
 * shell (EINVAL), while shell:true trips DEP0190.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

delete process.env.ELECTRON_RUN_AS_NODE

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const electronViteBin = join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')

const child = spawn(process.execPath, [electronViteBin, 'dev', '--watch'], {
  cwd: join(root, 'apps', 'shell'),
  stdio: 'inherit',
})
child.on('close', (code) => process.exit(code ?? 1))
