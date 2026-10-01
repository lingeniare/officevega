/**
 * Licence gate for the chat-provider choice. Without a licence only the VEGA
 * provider (and its legacy 'genspark' sign-in pick, which resolves to VEGA)
 * is usable; every other provider needs an activated licence.
 *
 * The shell's main process registers the real check at startup. Renderer
 * bundles register nothing and the default is permissive, so a renderer-side
 * call never downgrades a pick on its own — the main process is the authority.
 */

let licensedGetter: () => boolean = () => true

export function setLicenseGetter(fn: () => boolean): void {
  licensedGetter = fn
}

export function isLicensed(): boolean {
  return licensedGetter()
}

/** providers that stay available without a licence */
export function isFreeProvider(provider: string): boolean {
  return provider === 'vega' || provider === 'genspark'
}
