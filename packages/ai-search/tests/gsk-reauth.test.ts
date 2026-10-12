import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// the shared gsk CLI login (~/.genspark-tool-cli) is the only key source
// besides GSK_API_KEY: point homedir at an empty dir so the developer's real
// login cannot leak in
const home = vi.hoisted(() => ({ dir: '' }))
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal<typeof import('node:os')>()
  return { ...os, homedir: () => home.dir || os.homedir() }
})

import {
  GskAuthError,
  gskApiKey,
  gskSlideGenerate,
  gskWebSearch,
  hasGskAuth,
  isGskUnauthorizedText,
  noteGskCallFailure,
  noteGskKeyRejected,
  resetGskRejectedKeys,
} from '../src/gsk'

let dir: string
let configPath: string

function writeSharedConfig(key: string): void {
  mkdirSync(join(dir, '.genspark-tool-cli'), { recursive: true })
  writeFileSync(configPath, JSON.stringify({ api_key: key }))
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gsk-reauth-'))
  home.dir = dir
  configPath = join(dir, '.genspark-tool-cli', 'config.json')
  process.env.GSK_CLI_PATH = '/fake/gsk.js'
  delete process.env.GSK_API_KEY
  delete process.env.AI_SEARCH_DISABLE_GSK
  resetGskRejectedKeys()
  writeSharedConfig('gsk-expired')
  process.env.GSK_REAUTH_CONFIG = configPath
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetGskRejectedKeys()
  rmSync(dir, { recursive: true, force: true })
  home.dir = ''
  delete process.env.GSK_CLI_PATH
  delete process.env.GSK_REAUTH_CONFIG
})

function response(body: unknown, status = 200): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return new Response(text, { status })
}

const ndjsonOk = (data: unknown) => response(`${JSON.stringify({ status: 'ok', data })}\n`)

/**
 * tool_cli answers 401 for the expired key and succeeds for any other. When
 * `rotate` is set the 401 also rewrites the shared config — another app that
 * re-logged into gsk between our calls is the recovery path this fork owns.
 */
function stubServer(opts: { rotate?: boolean } = {}) {
  const toolKeys: string[] = []
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/api/tool_cli/')) {
      const key = (init?.headers as Record<string, string>)['X-Api-Key']!
      toolKeys.push(key)
      if (key === 'gsk-expired') {
        if (opts.rotate) writeSharedConfig('gsk-new')
        return response('{"detail":"invalid api key"}', 401)
      }
      if (url.endsWith('/slide_generate')) return ndjsonOk({ pptx_url: 'https://x/api/files/1' })
      return ndjsonOk({ download_url: 'https://93.184.216.34/deck.pptx' })
    }
    if (url.endsWith('/deck.pptx')) return response('PK')
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, toolKeys }
}

describe('isGskUnauthorizedText', () => {
  it('matches the 401 shapes of gsk CLI, tool_cli and the LLM proxy', () => {
    expect(isGskUnauthorizedText('HTTP 401: Unauthorized')).toBe(true)
    expect(isGskUnauthorizedText('tool_cli /x HTTP 401: {}')).toBe(true)
    expect(isGskUnauthorizedText('Claude HTTP 401: {"error":"invalid key"}')).toBe(true)
    expect(isGskUnauthorizedText('HTTP 4011')).toBe(false)
    expect(isGskUnauthorizedText('HTTP 403: forbidden')).toBe(false)
  })
})

describe('tool_cli 401 recovery', () => {
  it('retries once when the shared config rotated to a fresh key', async () => {
    const { toolKeys } = stubServer({ rotate: true })
    await expect(gskSlideGenerate({ brief: 'x' })).resolves.toMatchObject({
      bytes: expect.any(Uint8Array),
    })
    expect(toolKeys).toEqual(['gsk-expired', 'gsk-new', 'gsk-new'])
    expect(gskApiKey()).toBe('gsk-new')
  })

  it('drops the key and reports signed-out when nothing rotated', async () => {
    const { toolKeys } = stubServer()
    await expect(gskSlideGenerate({ brief: 'x' })).rejects.toBeInstanceOf(GskAuthError)
    // the expired key is not retried and ai:gsk-status now reports signed-out
    expect(toolKeys).toEqual(['gsk-expired'])
    expect(gskApiKey()).toBe('')
    expect(hasGskAuth()).toBe(false)
    // with no key left, the next action fails fast instead of looping
    await expect(gskSlideGenerate({ brief: 'x' })).rejects.toThrow(/Not logged in/)
  })

  it('leaves non-401 failures alone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response('boom', 500)),
    )
    await expect(gskSlideGenerate({ brief: 'x' })).rejects.toThrow(/HTTP 500/)
    expect(gskApiKey()).toBe('gsk-expired')
  })
})

describe('gsk CLI 401 recovery', () => {
  /**
   * fake CLI: a 401 for the expired key (printed on stdout like the real
   * CLI), results otherwise; `rotate` rewrites the shared config on the
   * rejection, mimicking a concurrent gsk login in another app.
   */
  function fakeCli(rotate: boolean): string {
    const log = join(dir, 'cli-keys.log')
    const script = join(dir, 'fake-gsk.mjs')
    writeFileSync(
      script,
      [
        "import { appendFileSync, writeFileSync } from 'node:fs'",
        `appendFileSync(${JSON.stringify(log)}, process.env.GSK_API_KEY + '\\n')`,
        "if (process.env.GSK_API_KEY === 'gsk-expired') {",
        ...(rotate
          ? [
              // GSK_REAUTH_CONFIG points at the shared config our parent reads:
              // the child's os.homedir() is the real home, the mock is not
              // inherited, so the path arrives through the env we control
              `  writeFileSync(process.env.GSK_REAUTH_CONFIG, JSON.stringify({ api_key: 'gsk-new' }))`,
            ]
          : []),
        "  console.log(JSON.stringify({ status: 'error', message: 'HTTP 401: Unauthorized', data: null }))",
        '  process.exit(1)',
        '}',
        "console.log(JSON.stringify({ status: 'ok', data: { organic_results: [{ title: 't', link: 'https://e.x', snippet: 's' }] } }))",
      ].join('\n'),
    )
    process.env.GSK_CLI_PATH = script
    return log
  }

  it('reruns the command with the rotated key after a CLI 401', async () => {
    const log = fakeCli(true)
    const out = await gskWebSearch('q')
    expect(out.results).toHaveLength(1)
    expect(readFileSync(log, 'utf-8').trim().split('\n')).toEqual(['gsk-expired', 'gsk-new'])
  })

  it('reports the auth failure and signs out when no rotated key appears', async () => {
    fakeCli(false)
    await expect(gskWebSearch('q')).rejects.toBeInstanceOf(GskAuthError)
    expect(hasGskAuth()).toBe(false)
  })
})

describe('noteGskCallFailure (LLM proxy chat/stream)', () => {
  it('marks the injected key invalid on a 401 so the sign-in affordance appears', () => {
    expect(noteGskCallFailure('gsk-expired', new Error('Claude HTTP 401: invalid'))).toBe(true)
    expect(hasGskAuth()).toBe(false)
  })

  it('ignores non-auth failures and calls made without the gsk key', () => {
    expect(noteGskCallFailure('gsk-expired', new Error('HTTP 500: busy'))).toBe(false)
    expect(noteGskCallFailure('', new Error('HTTP 401: bad byok key'))).toBe(false)
    expect(hasGskAuth()).toBe(true)
  })

  it('stops offering a rejected env key without touching anyone else’s file', () => {
    process.env.GSK_API_KEY = 'gsk-env'
    try {
      expect(gskApiKey()).toBe('gsk-env')
      noteGskCallFailure('gsk-env', 'HTTP 401: Unauthorized')
      // falls through to the shared config key (still valid)
      expect(gskApiKey()).toBe('gsk-expired')
    } finally {
      delete process.env.GSK_API_KEY
    }
  })
})

describe('passive calls', () => {
  it('a 401 from a background call drops the key without starting a login', async () => {
    await expect(noteGskKeyRejected('gsk-expired', { allowLogin: false })).resolves.toBe(
      'login_required',
    )
    expect(hasGskAuth()).toBe(false)
  })
})
