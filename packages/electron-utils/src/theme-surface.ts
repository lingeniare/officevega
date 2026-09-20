import { nativeTheme } from 'electron'

/**
 * The fill a window or WebContentsView paints until its renderer's first
 * frame — kept in sync with the --surface design token
 * (packages/ui/src/tokens.css) so opening a window/tab under the dark theme
 * shows a dark placeholder instead of flashing white.
 */
export function themedSurfaceColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff'
}
