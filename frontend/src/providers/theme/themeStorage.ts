import type { ThemeMode } from './types'

const THEME_KEY = 'defect_ai.theme'

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null

  const value = window.localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : null
}

export function setStoredTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_KEY, theme)
}
