'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarGallery } from './AvatarGallery'
import { useAppStore } from '@/lib/store'
import { Loader2, UserPlus, User, Lock, ArrowLeft } from 'lucide-react'

export function RegisterView() {
  const { setUser, setView, showToast } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('avatar-1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, avatar }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации')
        return
      }
      setUser(data.user)
      setView('menu')
      showToast('success', `Добро пожаловать, ${data.user.username}!`)
    } catch (err) {
      setError('Сетевая ошибка. Попробуй ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[100dvh] flex items-center justify-center p-4 gradient-bg safe-top safe-bottom"
    >
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <div className="text-5xl mb-2">🎮</div>
          <h1 className="text-2xl font-bold">Создать аккаунт</h1>
          <p className="text-muted-foreground text-sm mt-1">Это займёт меньше минуты</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          <div className="space-y-2">
            <Label htmlFor="reg-username" className="text-sm font-medium">Имя пользователя</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="reg-username"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12"
                disabled={loading}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_-]+"
              />
            </div>
            <p className="text-xs text-muted-foreground">3-20 символов: буквы, цифры, _ -</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-password" className="text-sm font-medium">Пароль</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                disabled={loading}
                required
                minLength={4}
              />
            </div>
          </div>

          <AvatarGallery selected={avatar} onSelect={setAvatar} />

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-sm text-destructive bg-destructive/10 rounded-lg p-3"
            >
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Создание...</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" /> Создать аккаунт</>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setView('login')}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Назад ко входу
          </button>
        </motion.form>
      </div>
    </motion.div>
  )
}
