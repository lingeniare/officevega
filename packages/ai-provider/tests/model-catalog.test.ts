import { afterEach, describe, expect, it, vi } from 'vitest'
import { listGatewayModels } from '../src/model-catalog'
import { jsonResponse } from './test-utils'

afterEach(() => {
  vi.unstubAllGlobals()
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
    expect(models.map((m) => m.id)).toEqual([
      'vendor/text-model',
      'google/gemini-3.1-flash-image',
    ])
  })
})
