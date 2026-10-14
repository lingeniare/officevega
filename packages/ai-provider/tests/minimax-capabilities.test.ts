import { describe, expect, it } from 'vitest'
import { AI_PROVIDER_ADAPTERS, modelLacksVision } from '../src/registry'

describe('MiniMax input capabilities', () => {
  it('supports M3 vision while excluding M2.7, including qualified model ids', () => {
    // MiniMax rides the OpenCode Go gateway; the vision split lives on the
    // model id there, not on a dedicated provider
    expect(AI_PROVIDER_ADAPTERS['opencode-go'].capabilities.vision).toBe(true)
    for (const model of [
      'MiniMax-M2.7',
      'minimax-m2.7',
      'minimax/MiniMax-M2.7',
      'MiniMax-M2.7-6bit',
    ]) {
      expect(modelLacksVision(model)).toBe(true)
    }
    expect(modelLacksVision('MiniMax-M3')).toBe(false)
    expect(modelLacksVision('minimax/MiniMax-M3')).toBe(false)
  })
})
