import { describe, expect, it } from 'vitest'
import {
  AI_PROVIDER_ADAPTERS,
  getProviderAdapter,
  modelEchoesReasoning,
  modelHasFixedSampling,
  modelLacksVision,
} from '../src/registry'
import { AI_PROVIDERS, GENSPARK_LLM_BASE_URLS } from '../src/providers'
import type { AiProviderConfig, AiProviderId } from '../src/types'

function config(model: string, baseUrl?: string): AiProviderConfig {
  return { apiKey: 'k', model, baseUrl }
}

describe('provider registry', () => {
  it('covers every provider in AI_PROVIDERS with matching meta', () => {
    for (const meta of AI_PROVIDERS) {
      expect(AI_PROVIDER_ADAPTERS[meta.id].meta).toBe(meta)
    }
    expect(Object.keys(AI_PROVIDER_ADAPTERS).sort()).toEqual(AI_PROVIDERS.map((m) => m.id).sort())
  })

  it('routes genspark by model id prefix onto the two proxy endpoints', () => {
    const resolve = (model: string) => AI_PROVIDER_ADAPTERS.genspark.resolveEndpoint(config(model))
    expect(resolve('claude-opus-4-7')).toEqual({
      protocol: 'anthropic',
      baseUrl: GENSPARK_LLM_BASE_URLS.anthropic,
    })
    // gpt-5.x fixes sampling, so the proxy's OpenAI route also drops temperature
    expect(resolve('gpt-5.2')).toEqual({
      protocol: 'openai-compatible',
      baseUrl: GENSPARK_LLM_BASE_URLS.openai,
      omitTemperature: true,
    })
  })

  it('resolves direct providers to their official endpoints', () => {
    expect(AI_PROVIDER_ADAPTERS.anthropic.resolveEndpoint(config('claude-sonnet-5'))).toEqual({
      protocol: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
    })
    expect(AI_PROVIDER_ADAPTERS.gemini.resolveEndpoint(config('gemini-2.5-flash'))).toEqual({
      protocol: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    })
    expect(AI_PROVIDER_ADAPTERS.gemini.resolveEndpoint(config('gemini-3.7-flash'))).toEqual({
      protocol: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      omitTemperature: true,
    })
    expect(AI_PROVIDER_ADAPTERS.openai.resolveEndpoint(config('gpt-4.1-mini'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      useMaxCompletionTokens: true,
    })
  })

  it('marks the GPT-5/GPT-6 families as fixed-sampling (reject any non-default temperature)', () => {
    for (const model of ['gpt-6-astra', 'gpt-5.6', 'gpt-5.6-terra', 'gpt-5.5', 'gpt-5.4-mini']) {
      expect(AI_PROVIDER_ADAPTERS.openai.resolveEndpoint(config(model))).toEqual({
        protocol: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        omitTemperature: true,
        useMaxCompletionTokens: true,
      })
    }
  })

  it('marks the OpenAI o-series reasoning models as fixed-sampling', () => {
    for (const model of ['o1', 'o1-mini', 'o1-preview', 'o3', 'o3-mini', 'o4-mini']) {
      expect(AI_PROVIDER_ADAPTERS.openai.resolveEndpoint(config(model))).toEqual({
        protocol: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        omitTemperature: true,
        useMaxCompletionTokens: true,
      })
    }
    // Non-reasoning models still carry the configured temperature.
    expect(AI_PROVIDER_ADAPTERS.openai.resolveEndpoint(config('gpt-4o'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      useMaxCompletionTokens: true,
    })
  })

  it('does not over-match fixed-sampling prefixes (o10, o30, o4-minix)', () => {
    expect(modelHasFixedSampling('o10')).toBe(false)
    expect(modelHasFixedSampling('o30')).toBe(false)
    expect(modelHasFixedSampling('o4-minix')).toBe(false)
    expect(modelHasFixedSampling('gpt-50')).toBe(false)
  })

  it('resolves the catalog additions to their OpenAI-compatible endpoints', () => {
    const cases: Array<[AiProviderId, string, string]> = [
      ['xai', 'grok-4.6', 'https://api.x.ai/v1'],
      ['openrouter', 'openrouter/auto', 'https://openrouter.ai/api/v1'],
      ['atlascloud', 'deepseek-ai/deepseek-v4-pro', 'https://api.atlascloud.ai/v1'],
      ['yandex', 'gpt://b1folder/yandexgpt-lite', 'https://llm.api.cloud.yandex.net/v1'],
    ]
    for (const [id, model, baseUrl] of cases) {
      expect(AI_PROVIDER_ADAPTERS[id].resolveEndpoint(config(model))).toEqual({
        protocol: 'openai-compatible',
        baseUrl,
      })
    }
  })

  it('marks Sber as gigachat-oauth (the stored key is exchanged for an access token)', () => {
    expect(AI_PROVIDER_ADAPTERS.sber.resolveEndpoint(config('GigaChat-2-Max'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://api.giga.chat/v1',
      authScheme: 'gigachat-oauth',
    })
    // a stored base URL still overrides (regional gateways), keeping the scheme
    expect(
      AI_PROVIDER_ADAPTERS.sber.resolveEndpoint(config('GigaChat-2', 'https://mirror.example/v1')),
    ).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://mirror.example/v1',
      authScheme: 'gigachat-oauth',
    })
  })

  it('lets a stored base URL override a fixed endpoint (regional mirrors)', () => {
    expect(
      AI_PROVIDER_ADAPTERS.xai.resolveEndpoint(config('grok-4.6', 'https://x-ai-mirror.example/v1')),
    ).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://x-ai-mirror.example/v1',
    })
    // empty string falls back to the default
    expect(AI_PROVIDER_ADAPTERS.anthropic.resolveEndpoint(config('claude-sonnet-5', ''))).toEqual({
      protocol: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
    })
  })

  it('routes OpenCode Zen per model onto the protocol the gateway serves it on', () => {
    const resolve = (model: string, baseUrl?: string) =>
      AI_PROVIDER_ADAPTERS['opencode-zen'].resolveEndpoint(config(model, baseUrl))
    expect(resolve('claude-sonnet-5')).toEqual({
      protocol: 'anthropic',
      baseUrl: 'https://opencode.ai/zen',
    })
    expect(resolve('qwen3.6-plus')).toEqual({
      protocol: 'anthropic',
      baseUrl: 'https://opencode.ai/zen',
    })
    // the Gemini 3 family keeps Google's default sampling on this route too
    expect(resolve('gemini-3.7-flash')).toEqual({
      protocol: 'gemini',
      baseUrl: 'https://opencode.ai/zen/v1',
      omitTemperature: true,
    })
    expect(resolve('gemini-2.5-flash')).toEqual({
      protocol: 'gemini',
      baseUrl: 'https://opencode.ai/zen/v1',
    })
    for (const model of ['deepseek-v4-pro', 'glm-5.2', 'minimax-m3']) {
      expect(resolve(model)).toEqual({
        protocol: 'openai-compatible',
        baseUrl: 'https://opencode.ai/zen/v1',
      })
    }
    // Kimi fixes sampling on the K2 line as well as K3
    for (const model of ['kimi-k3', 'kimi-k2.7-code']) {
      expect(resolve(model)).toEqual({
        protocol: 'openai-compatible',
        baseUrl: 'https://opencode.ai/zen/v1',
        omitTemperature: true,
      })
    }
    // a stored base URL replaces the gateway root, with or without the documented /v1
    expect(resolve('claude-sonnet-5', 'https://mirror.example/zen/v1/')).toEqual({
      protocol: 'anthropic',
      baseUrl: 'https://mirror.example/zen',
    })
    expect(resolve('glm-5.2', 'https://mirror.example/zen')).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://mirror.example/zen/v1',
    })
  })

  it('routes OpenCode Go with its own table (MiniMax rides Messages there, not chat-completions)', () => {
    const resolve = (model: string) =>
      AI_PROVIDER_ADAPTERS['opencode-go'].resolveEndpoint(config(model))
    for (const model of ['minimax-m3', 'minimax-m2.7', 'qwen3.8-flash']) {
      expect(resolve(model)).toEqual({
        protocol: 'anthropic',
        baseUrl: 'https://opencode.ai/zen/go',
      })
    }
    for (const model of [
      'glm-5.3',
      'glm-5.2',
      'deepseek-v4-flash',
      'deepseek-v4.1-flash',
      'qwen3.8-max',
      'longcat-2.0',
      'longcat-2.5-preview-free',
      'mimo-v2.6-pro',
      'mimo-v2.6-flash',
      'hy4-preview',
      'hy3',
    ]) {
      expect(resolve(model)).toEqual({
        protocol: 'openai-compatible',
        baseUrl: 'https://opencode.ai/zen/go/v1',
      })
    }
    expect(resolve('kimi-k2.7-code')).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://opencode.ai/zen/go/v1',
      omitTemperature: true,
    })
    expect(resolve('kimi-k2.6')).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://opencode.ai/zen/go/v1',
      omitTemperature: true,
    })
    // Go has no Gemini route
    expect(resolve('gemini-3.7-flash').protocol).toBe('openai-compatible')
  })

  it('does not crash the opencode route on a missing model id', () => {
    const zen = AI_PROVIDER_ADAPTERS['opencode-zen'].resolveEndpoint({
      apiKey: 'k',
      model: undefined as unknown as string,
    })
    expect(zen.protocol).toBe('openai-compatible')
    expect(zen.omitTemperature).toBeUndefined()
  })

  it('uses the configured base URL for custom and rejects a missing one', () => {
    expect(
      AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('m', 'http://localhost:1234/v1')),
    ).toEqual({ protocol: 'openai-compatible', baseUrl: 'http://localhost:1234/v1' })
    expect(() => AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('m'))).toThrow(
      'A custom provider requires a Base URL',
    )
  })

  it('rejects non-http and oversized custom base URLs', () => {
    const resolve = (baseUrl: string) =>
      AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('m', baseUrl))
    expect(() => resolve('javascript:alert(1)')).toThrow('http or https')
    expect(() => resolve('file:///etc/passwd')).toThrow('http or https')
    expect(() => resolve('not a url')).toThrow('valid http')
    expect(() => resolve(`https://x/${'a'.repeat(3000)}`)).toThrow('2048')
    // a regional mirror with whitespace still resolves to the trimmed URL
    expect(
      AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('m', '  https://mirror/v1  ')).baseUrl,
    ).toBe('https://mirror/v1')
  })

  it('only genspark authenticates through the gsk login', () => {
    for (const [id, adapter] of Object.entries(AI_PROVIDER_ADAPTERS)) {
      expect(adapter.capabilities.auth).toBe(
        id === 'genspark' ? 'gsk-login' : id === 'codex' ? 'codex-chatgpt' : 'api-key',
      )
    }
  })

  it('routes Codex to the auto-discovered local process bridge', () => {
    expect(
      AI_PROVIDER_ADAPTERS.codex.resolveEndpoint({
        apiKey: '',
        model: 'gpt-5.6-terra',
        cliPath: 'C:\\Tools\\codex.exe',
      }),
    ).toEqual({ protocol: 'codex-app-server', baseUrl: '' })
    expect(AI_PROVIDER_ADAPTERS.codex.resolveEndpoint(config('gpt-5.6-terra'))).toEqual({
      protocol: 'codex-app-server',
      baseUrl: '',
    })
  })

  it('throws a typed error for ids outside the registry', () => {
    expect(() => getProviderAdapter('nonsense' as AiProviderId)).toThrow(
      'Unknown provider: nonsense',
    )
  })
})

describe('fixed-sampling models on indirect routes', () => {
  it('omits temperature for kimi-k3 via OpenRouter and via a custom endpoint', () => {
    expect(AI_PROVIDER_ADAPTERS.openrouter.resolveEndpoint(config('moonshotai/kimi-k3'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      omitTemperature: true,
    })
    expect(
      AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('kimi-k3', 'https://api.moonshot.cn/v1')),
    ).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://api.moonshot.cn/v1',
      omitTemperature: true,
    })
    expect(AI_PROVIDER_ADAPTERS.openrouter.resolveEndpoint(config('openrouter/auto'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
    })
  })

  it('omits temperature for gpt-5 via OpenRouter and via a custom endpoint', () => {
    expect(AI_PROVIDER_ADAPTERS.openrouter.resolveEndpoint(config('openai/gpt-5.6-sol'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      omitTemperature: true,
    })
    expect(
      AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('gpt-5.6-terra', 'https://mirror/v1')),
    ).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://mirror/v1',
      omitTemperature: true,
    })
  })

})

describe('modelLacksVision', () => {
  it('flags text-only DeepSeek V4 models but not the vision branch', () => {
    expect(modelLacksVision('deep-seek-v4-flash')).toBe(true)
    expect(modelLacksVision('deep-seek-v4-flash-baseten')).toBe(true)
    expect(modelLacksVision('deepseek-v4-pro')).toBe(true)
    expect(modelLacksVision('deepseek-v4-flash')).toBe(true)
    expect(modelLacksVision('deep-seek-v4-pro')).toBe(true)
    expect(modelLacksVision('deep-seek-v4.1-flash')).toBe(false)
    expect(modelLacksVision('deepseek-v4-flash-vision-exp')).toBe(false)
    expect(modelLacksVision('deepseek-flash')).toBe(false)
    expect(modelLacksVision('deep-seek-v4-flash-vision-exp-openrouter')).toBe(false)
    expect(modelLacksVision('claude-opus-4-7')).toBe(false)
  })

  it('holds back the text-only Atlas Cloud ids but not its multimodal ones', () => {
    expect(modelLacksVision('zai-org/glm-5.3')).toBe(true)
    expect(modelLacksVision('minimaxai/minimax-m3')).toBe(true)
    expect(modelLacksVision('minimaxai/minimax-m2.5')).toBe(true)
    expect(modelLacksVision('deepseek-ai/deepseek-v4-pro')).toBe(true)
    expect(modelLacksVision('deepseek-ai/deepseek-v4-flash')).toBe(true)
    expect(modelLacksVision('zai-org/glm-5.3-flash')).toBe(false)
    expect(modelLacksVision('moonshotai/kimi-k3')).toBe(false)
    expect(modelLacksVision('moonshotai/kimi-k3.1-pro')).toBe(false)
    expect(modelLacksVision('moonshotai/kimi-k2.6')).toBe(false)
    expect(modelLacksVision('qwen/qwen3.8-max')).toBe(false)
    expect(modelLacksVision('qwen/qwen3.5-flash')).toBe(false)
  })

  it('leaves the direct GLM and MiniMax providers untouched by the Atlas Cloud rule', () => {
    expect(modelLacksVision('glm-5.3')).toBe(false)
    expect(modelLacksVision('MiniMax-M3')).toBe(false)
  })

  it('holds back the text-only lab-namespaced ids but not their multimodal siblings', () => {
    expect(modelLacksVision('zai-org/GLM-5.3')).toBe(true)
    expect(modelLacksVision('Qwen/Qwen3.8-Flash')).toBe(true)
    expect(modelLacksVision('openai/gpt-oss-120b')).toBe(true)
    expect(modelLacksVision('deepseek-ai/DeepSeek-V4.1-Flash')).toBe(false)
    expect(modelLacksVision('deepseek-ai/DeepSeek-V4.1-Flash-1017')).toBe(false)
    expect(modelLacksVision('zai-org/GLM-5.3-Flash')).toBe(false)
    expect(modelLacksVision('moonshotai/Kimi-K2.6')).toBe(false)
  })

  it('records the existing vision heuristics for the bare lab ids', () => {
    expect(modelLacksVision('deepseek-v4.1-flash')).toBe(false)
    expect(modelLacksVision('deepseek-v4-pro')).toBe(true)
    expect(modelLacksVision('glm-5.3-flash')).toBe(false)
    expect(modelLacksVision('kimi-k2.6')).toBe(false)
    expect(modelLacksVision('minimax-m3')).toBe(false)
  })

  it('matches case-insensitively like its sibling matchers', () => {
    expect(modelLacksVision('DeepSeek-V4-Pro')).toBe(true)
    expect(modelLacksVision('DEEPSEEK-V4-FLASH')).toBe(true)
    expect(modelLacksVision('DeepSeek-V4-Flash-Vision-Exp')).toBe(false)
  })

  it('holds back the text-only Ling ids but not the VL branch', () => {
    for (const model of [
      'Ling-3.0-flash',
      'Ling-3.0-tiny',
      'Ling-2.6-1T',
      'Ring-2.6-1T',
      'Ling-2.6-flash',
      'ling-3.0-flash',
      'LING-2.6-1T',
    ]) {
      expect(modelLacksVision(model)).toBe(true)
    }
    expect(modelLacksVision('Ling-3.0-flash-VL')).toBe(false)
    expect(modelLacksVision('ling-3.0-flash-vl')).toBe(false)
  })

  it('flags LongCat-2.0 but not the multimodal 2.5 preview', () => {
    expect(modelLacksVision('LongCat-2.0')).toBe(true)
    expect(modelLacksVision('longcat-2.0')).toBe(true)
    expect(modelLacksVision('LongCat-2.5-Preview')).toBe(false)
    expect(modelLacksVision('longcat-2.5-preview-free')).toBe(false)
  })
})

describe('modelEchoesReasoning', () => {
  it('flags interleaved-thinking families on any route, case-insensitively', () => {
    expect(modelEchoesReasoning('MiniMax-M3')).toBe(true)
    expect(modelEchoesReasoning('minimax-m2p7')).toBe(true)
    expect(modelEchoesReasoning('deep-seek-v4-flash')).toBe(true)
    expect(modelEchoesReasoning('deepseek-v4-pro')).toBe(true)
    expect(modelEchoesReasoning('deepseek-flash')).toBe(true)
    expect(modelEchoesReasoning('gpt-5.6-luna')).toBe(false)
    expect(modelEchoesReasoning('kimi-k3')).toBe(false)
  })

  it('flags Hunyuan (hy4-preview thinks by default) without swallowing other ids', () => {
    expect(modelEchoesReasoning('hy3')).toBe(true)
    expect(modelEchoesReasoning('hy4-preview')).toBe(true)
    expect(modelEchoesReasoning('HY3')).toBe(true)
    // a model id that merely starts with the same letters must not match
    expect(modelEchoesReasoning('hunyuan-turbo')).toBe(false)
    expect(modelEchoesReasoning('phy3')).toBe(false)
    expect(modelEchoesReasoning('mimo-v2.6-pro')).toBe(false)
  })
})

describe('modelHasFixedSampling case handling', () => {
  it('matches fixed-sampling families case-insensitively like modelEchoesReasoning does', () => {
    expect(modelHasFixedSampling('GPT-5.6-sol')).toBe(true)
    expect(modelHasFixedSampling('KIMI-K3')).toBe(true)
    expect(modelHasFixedSampling('Gemini-3.7-flash')).toBe(true)
    expect(modelHasFixedSampling('O1-mini')).toBe(true)
    expect(modelHasFixedSampling('gpt-4o-mini')).toBe(false)
  })

  it('omits temperature for upper-case fixed-sampling ids on mirror routes', () => {
    expect(
      AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('GPT-5.6-terra', 'https://mirror/v1')),
    ).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://mirror/v1',
      omitTemperature: true,
    })
    expect(AI_PROVIDER_ADAPTERS.openrouter.resolveEndpoint(config('MOONSHOTAI/KIMI-K3'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://openrouter.ai/api/v1',
      omitTemperature: true,
    })
  })

  it('carries omitTemperature onto every opencode route, including upper-case mirrors', () => {
    // minimax rides Messages on Go; it is not fixed-sampling, so no flag
    expect(AI_PROVIDER_ADAPTERS['opencode-go'].resolveEndpoint(config('minimax-m2'))).toEqual({
      protocol: 'anthropic',
      baseUrl: 'https://opencode.ai/zen/go',
    })
    // upper-case fixed-sampling ids via the Zen openai-compatible route must omit
    expect(AI_PROVIDER_ADAPTERS['opencode-zen'].resolveEndpoint(config('GPT-5.6-sol'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://opencode.ai/zen/v1',
      omitTemperature: true,
    })
    expect(AI_PROVIDER_ADAPTERS['opencode-zen'].resolveEndpoint(config('KIMI-K3'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://opencode.ai/zen/v1',
      omitTemperature: true,
    })
    // KIMI prefix check is case-insensitive on opencode routes (all Kimi ids omit there)
    expect(AI_PROVIDER_ADAPTERS['opencode-go'].resolveEndpoint(config('KIMI-K2.7-code'))).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://opencode.ai/zen/go/v1',
      omitTemperature: true,
    })
    expect(
      AI_PROVIDER_ADAPTERS.custom.resolveEndpoint(config('KIMI-K3', 'https://mirror/v1')),
    ).toEqual({
      protocol: 'openai-compatible',
      baseUrl: 'https://mirror/v1',
      omitTemperature: true,
    })
  })
})
