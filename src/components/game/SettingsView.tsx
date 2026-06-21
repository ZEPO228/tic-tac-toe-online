'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Volume2, Vibrate, Moon, Info } from 'lucide-react'
import { useState, useEffect } from 'react'

export function SettingsView() {
  const { setView, showToast } = useAppStore()
  const [settings, setSettings] = useState({
    sound: true,
    vibrate: true,
    darkTheme: true,
    autoQueue: false,
  })

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ttt_settings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
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
            <div className="border-t border-border" />
            <SettingRow
              icon={<Moon className="w-4 h-4" />}
              title="Тёмная тема"
              desc="Всегда использовать тёмную тему"
            >
              <Switch
                checked={settings.darkTheme}
                onCheckedChange={(v) => update('darkTheme', v)}
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
            <div className="text-3xl mb-2">⭕❌</div>
            <div className="font-semibold">Крестики-Нолики Онлайн</div>
            <div className="text-xs text-muted-foreground mt-1">
              Версия 1.0.0 · Next.js + Socket.io + Prisma
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
