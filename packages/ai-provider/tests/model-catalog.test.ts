import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearModelCatalogCache, listGatewayModels } from '../src/model-catalog'
import { jsonResponse } from './test-utils'

afterEach(() => {
  vi.unstubAllGlobals()
  clearModelCatalogCache()
})

const entry = (id: string, outputModalities: string[]) => ({
  id,
  name: id,
  architecture: { input_modalities: ['text'], output_modalities: outputModalities },
})

function stubCatalog(entries: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(jsonResponse({ data: entries, total_count: entries.length })),
  )
}

describe('listGatewayModels excludeOutput', () => {
  it('drops models that emit the excluded modality even when they also emit text', async () => {
    stubCatalog([
      entry('vendor/text-model', ['text']),
      entry('google/gemini-3.1-flash-image', ['image', 'text']),
      entry('openrouter/auto', ['text', 'image']),
    ])
    const models = await listGatewayModels('https://x/v1', 'k', {
      output: 'text',
      excludeOutput: ['image'],
    })
    expect(models.map((m) => m.id)).toEqual(['vendor/text-model'])
  })

  it('keeps mixed-output models without the flag — output:"text" only requires text to be present', async () => {
    stubCatalog([
      entry('vendor/text-model', ['text']),
      entry('google/gemini-3.1-flash-image', ['image', 'text']),
      entry('openai/gpt-image-2', ['image']),
    ])
    const models = await listGatewayModels('https://x/v1', 'k', { output: 'text' })
    expect(models.map((m) => m.id)).toEqual(['vendor/text-model', 'google/gemini-3.1-flash-image'])
  })
})

describe('listGatewayModels paging', () => {
  it('pages a multi-page catalog and keeps offset order', async () => {
    const page0 = [entry('m/1', ['text']), entry('m/2', ['text'])]
    const page1 = [entry('m/3', ['text'])]
    const fetch = vi.fn(async (url: string) => {
      const offset = Number(new URL(url).searchParams.get('offset') ?? '0')
      const data = offset === 0 ? page0 : page1
      return jsonResponse({ data, total_count: 3 })
    })
    vi.stubGlobal('fetch', fetch)
    const models = await listGatewayModels('https://paged/v1', 'k', { output: 'text' })
    expect(models.map((m) => m.id)).toEqual(['m/1', 'm/2', 'm/3'])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('serves repeat callers from cache without refetching', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [entry('m/1', ['text'])], total_count: 1 }))
    vi.stubGlobal('fetch', fetch)
    await listGatewayModels('https://cached/v1', 'k', { output: 'text' })
    await listGatewayModels('https://cached/v1', 'k', { output: 'text' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
