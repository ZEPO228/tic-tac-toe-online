'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'
import { Loader2, LogIn, User, Lock } from 'lucide-react'

export function LoginView() {
  const { setUser, setView, showToast } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ошибка входа')
        return
      }
      setUser(data.user)
      setView('menu')
      showToast('success', `С возвращением, ${data.user.username}!`)
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
          className="text-center mb-8"
        >
          <div className="text-6xl mb-3">⭕❌</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
            Крестики-Нолики
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Онлайн мультиплеер</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">Имя пользователя</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                disabled={loading}
                required
              />
            </div>
          </div>

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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Вход...</>
            ) : (
              <><LogIn className="w-4 h-4 mr-2" /> Войти</>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <button
              type="button"
              onClick={() => setView('register')}
              className="text-primary hover:underline font-medium"
              disabled={loading}
            >
              Зарегистрироваться
            </button>
          </div>
        </motion.form>
      </div>
    </motion.div>
  )
}
