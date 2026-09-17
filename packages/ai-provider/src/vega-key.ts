/**
 * Runtime credential getters registered by @genoffice/ai-search (the package
 * that owns the sign-in state — it can't be imported from here without a
 * dependency cycle). A signed-in VEGA key counts as a configured BYOK key
 * everywhere the providers/media/search resolution asks "does this slot have
 * a credential"; the legacy gsk login key keeps the 'genspark' provider pick
 * meaningful while it exists. Renderer bundles register nothing, so the
 * getters return ''.
 */

let vegaKeyGetter: () => string = () => ''
let gskKeyGetter: () => string = () => ''

/** main-process hookup: ai-search registers getofficeApiKey here at import time */
export function setIssuedVegaKeyGetter(fn: () => string): void {
  vegaKeyGetter = fn
}

/** the sign-in-issued sk-apivega-… key; '' when signed out (or in a renderer bundle) */
export function issuedVegaKey(): string {
  return vegaKeyGetter().trim()
}

/** main-process hookup: ai-search registers gskApiKey here at import time */
export function setLegacyGskKeyGetter(fn: () => string): void {
  gskKeyGetter = fn
}

/** the Genspark CLI credential (env / shared login); '' when unavailable */
export function legacyGskKey(): string {
  return gskKeyGetter().trim()
}
