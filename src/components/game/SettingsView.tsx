'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Volume2, Vibrate, Sun, Moon, Monitor, Info, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme, ThemeMode } from '@/lib/use-theme'
import { AnimatedLogo } from './AnimatedLogo'

export function SettingsView() {
  const { setView, showToast } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState({
    sound: true,
    vibrate: true,
    autoQueue: false,
  })

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
      } catch {}
    }
  }, [])

  function update(key: keyof typeof settings, value: boolean) {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('ttt_settings', JSON.stringify(newSettings))
    if (value && 'vibrate' in navigator && key === 'vibrate') {
      navigator.vibrate(50)
    }
    showToast('success', 'Настройки сохранены')
  }

  function handleThemeChange(mode: ThemeMode) {
    setTheme(mode)
    const labels = { dark: 'Тёмная тема', light: 'Светлая тема', system: 'Системная тема' }
    showToast('success', labels[mode] + ' включена')
  }

  const themeOptions: { mode: ThemeMode; label: string; icon: any; desc: string }[] = [
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
              desc="Звуковые эффекты в игре"
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
              desc="Сразу искать игру при входе"
            >
              <Switch
                checked={settings.autoQueue}
                onCheckedChange={(v) => update('autoQueue', v)}
              />
            </SettingRow>
          </div>

          {/* About */}
          <div className="bg-card/30 border border-border rounded-2xl p-4 text-center">
            <AnimatedLogo size="sm" className="mx-auto mb-2" />
            <div className="font-semibold">Крестики-Нолики Онлайн</div>
            <div className="text-xs text-muted-foreground mt-1">
              Версия 2.1.0 · Next.js + Socket.io + Prisma
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
