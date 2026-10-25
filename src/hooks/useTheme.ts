import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ThemeSetting } from '../types'

const STORAGE_KEY = 'lifeos.theme'
type ResolvedTheme = 'dark' | 'light'

/**
 * Small module-level store so every consumer (sidebar toggle, settings page)
 * sees the same theme without prop drilling or context boilerplate.
 */
let currentSetting: ThemeSetting = readStoredSetting()
const listeners = new Set<() => void>()

function readStoredSetting(): ThemeSetting {
  return getStoredTheme() ?? 'dark'
}

/**
 * The theme this device has explicitly chosen, or null if the user never
 * picked one. Null lets a freshly-signed-in device adopt the theme saved on
 * the account profile (see usePreferences).
 */
export function getStoredTheme(): ThemeSetting | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'dark' || value === 'light' || value === 'system') return value
  } catch {
    // Storage can be unavailable (private mode).
  }
  return null
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function currentResolved(): ResolvedTheme {
  if (currentSetting !== 'system') return currentSetting
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function applyToDom(setting: ThemeSetting): void {
  const next: ResolvedTheme = setting === 'system' ? systemTheme() : setting
  document.documentElement.dataset.theme = next
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ThemeSetting {
  return currentSetting
}

/** Set the theme preference (dark, light, or follow the system). */
export function setTheme(next: ThemeSetting): void {
  currentSetting = next
  applyToDom(next)
  try {
    // Only explicit choices are persisted, so a device that never chose a
    // theme still reads as "unset" and can inherit the account's profile.
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Persisting is best-effort; the theme still applies for this session.
  }
  listeners.forEach((listener) => listener())
}

/**
 * Theme state: dark by default, optional light, plus "follow system".
 * index.html applies the stored value before first paint to avoid a flash.
 */
export function useTheme(): {
  theme: ThemeSetting
  resolved: ResolvedTheme
  setTheme: (next: ThemeSetting) => void
} {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [resolved, setResolved] = useState<ResolvedTheme>(currentResolved)

  useEffect(() => {
    // Applies only — persisting happens in setTheme (explicit choices),
    // so merely rendering the app doesn't mark the device as "chosen".
    applyToDom(theme)
    setResolved(currentResolved())

    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      applyToDom('system')
      setResolved(currentResolved())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return { theme, resolved, setTheme }
}
