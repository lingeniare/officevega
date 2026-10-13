import { useSyncExternalStore } from 'react'
import { normalizeUiScale } from './ui-scale'

let factor = 1
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Renderer-side mirror of the shell's interface zoom: apps feed it from
 * getUiScale()/onUiScaleChanged at bootstrap, then read `uiScaleFactor()` to
 * divide their document zoom (or `useUiScale()` inside React trees).
 */
export function applyUiScale(raw: unknown): void {
  const next = normalizeUiScale(raw)
  if (next === factor) return
  factor = next
  for (const listener of listeners) listener()
}

export function uiScaleFactor(): number {
  return factor
}

export function useUiScale(): number {
  return useSyncExternalStore(
    subscribe,
    () => factor,
    () => 1,
  )
}
