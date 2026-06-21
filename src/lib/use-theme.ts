'use client'

import { useEffect, useState, useCallback } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'

const THEME_KEY = 'ttt_theme'

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  return 'dark' // Default to dark theme (looks better per user request)
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  // Remove both classes first
  html.classList.remove('dark', 'light')
  if (mode === 'dark') {
    html.classList.add('dark')
  } else if (mode === 'light') {
    html.classList.add('light')
  }
  // For 'system', leave no class — CSS media query handles it
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('dark')

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = getStoredTheme()
    setThemeState(stored)
    applyTheme(stored)
  }, [])

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    applyTheme(mode)
    localStorage.setItem(THEME_KEY, mode)
  }, [])

  return { theme, setTheme }
}
