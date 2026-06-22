'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Volume2, Vibrate, Sun, Moon, Monitor, Info, Check, Lock, type LucideIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme, ThemeMode } from '@/lib/use-theme'
import { AnimatedLogo } from './AnimatedLogo'
import { invalidateSettingsCache, playMove } from '@/lib/game-feedback'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

export function SettingsView() {
  const { setView, showToast, setUser } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState({
    sound: true,
    vibrate: true,
    autoQueue: false,
  })

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ttt_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Don't load darkTheme anymore — use the new theme system
        setSettings({
          sound: parsed.sound ?? true,
          vibrate: parsed.vibrate ?? true,
          autoQueue: parsed.autoQueue ?? false,
        })
      } catch (e) {
        console.warn('Failed to parse settings from localStorage:', e)
      }
    }
  }, [])

  function update(key: keyof typeof settings, value: boolean) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('ttt_settings', JSON.stringify(newSettings))
    // Invalidate the in-memory cache so the next read picks up the new value.
    invalidateSettingsCache()
    // Provide immediate feedback for the toggled feature:
    if (key === 'sound' && value) playMove() // play a sample sound
    if (key === 'vibrate' && value && 'vibrate' in navigator) navigator.vibrate(50)
    showToast('success', 'Настройки сохранены')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Заполни все поля')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Новый пароль минимум 6 символов')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Новый пароль и подтверждение не совпадают')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('Новый пароль должен отличаться от текущего')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Пароль изменён. Войдите заново.')
        // Clear local state — the server already cleared the cookie.
        // Force the user back to the login screen.
        setTimeout(() => {
          setUser(null)
          setView('login')
        }, 1500)
      } else {
        setPasswordError(data.error || 'Не удалось изменить пароль')
      }
    } catch {
      setPasswordError('Сетевая ошибка. Попробуй ещё раз.')
    } finally {
      setChangingPassword(false)
    }
  }

  function handleThemeChange(mode: ThemeMode) {
    setTheme(mode)
    const labels = { dark: 'Тёмная тема', light: 'Светлая тема', system: 'Системная тема' }
    showToast('success', labels[mode] + ' включена')
  }

  const themeOptions: { mode: ThemeMode; label: string; icon: LucideIcon; desc: string }[] = [
    { mode: 'system', label: 'Системная', icon: Monitor, desc: 'Как в ОС' },
    { mode: 'dark', label: 'Тёмная', icon: Moon, desc: 'Тёмная тема' },
    { mode: 'light', label: 'Светлая', icon: Sun, desc: 'Светлая тема' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="min-h-[100dvh] gradient-bg safe-top safe-bottom"
    >
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('menu')}
            className="p-2 rounded-lg hover:bg-card/50"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Настройки</h1>
        </div>

        {/* Settings groups */}
        <div className="space-y-4">
          {/* Theme selector */}
          <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Тема оформления
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.mode
                return (
                  <button
                    key={opt.mode}
                    onClick={() => handleThemeChange(opt.mode)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40 bg-secondary/30'
                    }`}
                  >
                    <opt.icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5"
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </motion.div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Other settings */}
          <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
            <SettingRow
              icon={<Volume2 className="w-4 h-4" />}
              title="Звук"
              desc="Звуковые эффекты хода и победы"
            >
              <Switch
                checked={settings.sound}
                onCheckedChange={(v) => update('sound', v)}
              />
            </SettingRow>
            <div className="border-t border-border" />
            <SettingRow
              icon={<Vibrate className="w-4 h-4" />}
              title="Вибрация"
              desc="Тактильная отдача на мобильных"
            >
              <Switch
                checked={settings.vibrate}
                onCheckedChange={(v) => update('vibrate', v)}
              />
            </SettingRow>
          </div>

          <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
            <SettingRow
              icon={<Info className="w-4 h-4" />}
              title="Авто-поиск"
              desc="Сразу искать игру при входе в меню"
            >
              <Switch
                checked={settings.autoQueue}
                onCheckedChange={(v) => update('autoQueue', v)}
              />
            </SettingRow>
          </div>

          {/* Password change */}
          <form
            onSubmit={handleChangePassword}
            className="bg-card/50 border border-border rounded-2xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Смена пароля
            </div>
            <div className="p-3 space-y-2">
              <Input
                type="password"
                placeholder="Текущий пароль"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                disabled={changingPassword}
                className="h-11"
                required
              />
              <Input
                type="password"
                placeholder="Новый пароль (мин. 6 символов)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                disabled={changingPassword}
                className="h-11"
                required
              />
              <Input
                type="password"
                placeholder="Подтвердите новый пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={changingPassword}
                className="h-11"
                required
              />
              {passwordError && (
                <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">
                  {passwordError}
                </div>
              )}
              <Button
                type="submit"
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full h-11"
                size="lg"
              >
                {changingPassword ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Изменение...</>
                ) : (
                  <>Изменить пароль</>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                После смены пароля вы выйдете из аккаунта
              </p>
            </div>
          </form>

          {/* About */}
          <div className="bg-card/30 border border-border rounded-2xl p-4 text-center">
            <AnimatedLogo size="sm" className="mx-auto mb-2" />
            <div className="font-semibold">Крестики-Нолики Онлайн</div>
            <div className="text-xs text-muted-foreground mt-1">
              Версия 2.2.0 · Next.js + Socket.io + Prisma
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Деплой: Railway · GitHub: ZEPO228
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SettingRow({
  icon,
  title,
  desc,
  children
}: {
  icon: React.ReactNode
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  )
}
