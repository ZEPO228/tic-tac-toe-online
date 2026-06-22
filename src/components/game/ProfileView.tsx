'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getAvatar, AVATARS } from '@/lib/avatars'
import { AvatarDisplay } from './AvatarDisplay'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { ArrowLeft, Trophy, Target, TrendingUp, Calendar, Save, Loader2 } from 'lucide-react'
import { AvatarGallery } from './AvatarGallery'

interface ProfileData {
  id: string
  username: string
  avatar: string
  customAvatar?: string | null
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  gamesDraw: number
  winRate: number
  createdAt: string
}

export function ProfileView() {
  const { user, setView, setUser, showToast } = useAppStore()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'avatar-1')
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(user?.customAvatar || null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/profile', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) {
          setData(d.user)
          setSelectedAvatar(d.user.avatar)
          setCustomAvatarPreview(d.user.customAvatar || null)
        }
      })
      .catch((e) => { if (e.name !== 'AbortError') console.warn('profile fetch failed:', e) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-[100dvh] gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  async function handleSaveAvatar() {
    setSaving(true)
    try {
      const currentAvatar = user?.avatar || ''
      const currentCustom = user?.customAvatar || null
      const hasAvatarChanged = selectedAvatar !== currentAvatar
      const hasCustomChanged = customAvatarPreview !== currentCustom

      // Case 1: Custom avatar selected with new image to upload
      if (selectedAvatar === 'custom' && customAvatarPreview && hasCustomChanged) {
        const uploadRes = await fetch('/api/avatar/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: customAvatarPreview }),
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          setUser(uploadData.user)
          setData(prev => prev ? { ...prev, ...uploadData.user, winRate: prev.winRate } : null)
          setEditingAvatar(false)
          showToast('success', 'Аватарка обновлена!')
        } else {
          const errData = await uploadRes.json().catch(() => ({}))
          showToast('error', errData.error || 'Не удалось загрузить фото')
        }
      }
      // Case 2: Preset avatar selected (or switching from custom to preset)
      else if (hasAvatarChanged) {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: selectedAvatar }),
        })
        const d = await res.json()
        if (res.ok) {
          setUser(d.user)
          setData(prev => prev ? { ...prev, ...d.user, winRate: prev.winRate } : null)
          setCustomAvatarPreview(d.user.customAvatar || null)
          setEditingAvatar(false)
          showToast('success', 'Аватарка обновлена!')
        } else {
          showToast('error', d.error || 'Не удалось сохранить')
        }
      }
      // Case 3: Custom avatar already saved (no new upload), just close editor
      else if (selectedAvatar === 'custom' && currentCustom && !hasCustomChanged) {
        setEditingAvatar(false)
      }
      // Case 4: No changes at all
      else {
        setEditingAvatar(false)
        showToast('info', 'Нет изменений')
      }
    } catch (e) {
      console.error('Save avatar error:', e)
      showToast('error', 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const avatar = getAvatar(data?.avatar || user.avatar)
  const winRate = data?.winRate ?? (user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0)

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
          <h1 className="text-xl font-bold">Профиль</h1>
        </div>

        {/* Avatar + username */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-6 mb-4 text-center"
        >
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => setEditingAvatar(true)}
            className="inline-block cursor-pointer relative mb-3"
            role="button"
            aria-label="Изменить аватар"
          >
            <AvatarDisplay
              avatar={user.avatar}
              customAvatar={user.customAvatar}
              size={96}
              rounded="rounded-3xl"
            />
            <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-xs">
              ✎
            </div>
          </motion.div>
          <h2 className="text-xl font-bold">{user.username}</h2>
          <p className="text-sm text-muted-foreground">
            {user.avatar === 'custom' ? 'Своё фото' : avatar.label}
          </p>
          {data?.createdAt && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              С нами с {new Date(data.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </motion.div>

        {/* Avatar editor */}
        {editingAvatar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-card/50 border border-border rounded-2xl p-4 mb-4 overflow-hidden"
          >
            <AvatarGallery
              selected={selectedAvatar}
              onSelect={setSelectedAvatar}
              customAvatarPreview={customAvatarPreview}
              onUpload={(dataUri) => {
                setCustomAvatarPreview(dataUri)
                setSelectedAvatar('custom')
              }}
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSaveAvatar}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Сохранить</>
                )}
              </Button>
              <Button
                onClick={() => {
                  setEditingAvatar(false)
                  setSelectedAvatar(user.avatar)
                  setCustomAvatarPreview(user.customAvatar || null)
                }}
                variant="ghost"
              >
                Отмена
              </Button>
            </div>
          </motion.div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            icon={<Trophy className="w-4 h-4" />}
            label="Победы"
            value={user.gamesWon}
            color="text-primary"
          />
          <StatCard
            icon={<Target className="w-4 h-4" />}
            label="Поражения"
            value={user.gamesLost}
            color="text-destructive"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Ничьи"
            value={user.gamesDraw}
            color="text-muted-foreground"
          />
          <StatCard
            icon={<Trophy className="w-4 h-4" />}
            label="Всего игр"
            value={user.gamesPlayed}
            color="text-foreground"
          />
        </div>

        {/* Win rate progress */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 border border-border rounded-2xl p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Винрейт</span>
            <span className="text-2xl font-bold text-primary">{winRate}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${winRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {user.gamesPlayed === 0
              ? 'Сыграй первую игру, чтобы увидеть статистику'
              : user.gamesPlayed < 10
              ? 'Сыграй больше 10 игр для точной статистики'
              : winRate >= 60
              ? 'Отличный результат! Ты в топе!'
              : winRate >= 40
              ? 'Хороший результат, есть куда расти'
              : 'Тренируйся чаще!'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-card/50 border border-border rounded-2xl p-4">
      <div className={`flex items-center gap-1.5 text-xs ${color} mb-1`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
