import { describe, expect, it } from 'vitest'
import { aiErrorKey } from '../src/ai-error'

describe('aiErrorKey', () => {
  it('maps auth failures', () => {
    expect(aiErrorKey('HTTP 401: {"error":{"message":"Invalid or expired token"}}')).toBe(
      'aiErrorAuth',
    )
    expect(aiErrorKey('401 Unauthorized')).toBe('aiErrorAuth')
    expect(aiErrorKey('invalid_api_key')).toBe('aiErrorAuth')
  })

  it('maps credit/quota-exhausted failures', () => {
    expect(aiErrorKey('HTTP 402: {"error":{"message":"Insufficient credits"}}')).toBe(
      'aiErrorCredits',
    )
    expect(aiErrorKey('insufficient_quota')).toBe('aiErrorCredits')
  })

  it('maps rate-limit failures', () => {
    expect(aiErrorKey('HTTP 429: rate limit exceeded')).toBe('aiErrorRate')
    expect(aiErrorKey('Rate limit reached for tokens per minute')).toBe('aiErrorRate')
  })

  it('maps server failures', () => {
    expect(aiErrorKey('HTTP 500: Internal Server Error')).toBe('aiErrorServer')
    expect(aiErrorKey('HTTP 503: service unavailable')).toBe('aiErrorServer')
  })

  it('maps connectivity failures', () => {
    expect(aiErrorKey('fetch failed')).toBe('aiErrorNetwork')
    expect(aiErrorKey('request to https://api.vega.chat failed: ECONNREFUSED')).toBe(
      'aiErrorNetwork',
    )
  })

  it('leaves unknown errors untouched', () => {
    expect(aiErrorKey('The model refused the request')).toBeNull()
    expect(aiErrorKey('')).toBeNull()
    expect(aiErrorKey(null)).toBeNull()
    expect(aiErrorKey(undefined)).toBeNull()
  })
})
