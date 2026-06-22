'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, Contact } from '@/lib/store'
import { AvatarDisplay } from './AvatarDisplay'
import { ArrowLeft, MessageCircle, Mail, Trash2 } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

export function PrivateChatsView() {
  const { setView, setSelectedPlayerId, onlineUserIds, showToast } = useAppStore()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadContacts() {
    try {
      const res = await fetch('/api/direct-messages/contacts')
      const data = await res.json()
      if (data.contacts) {
        setContacts(data.contacts)
      }
    } catch (e) {
      console.error('Failed to load contacts:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContacts()
    // Refresh contacts every 30 seconds (was 10s — too aggressive).
    // Most updates come via socket.io 'dm_message' events anyway; polling is just a fallback.
    refreshTimerRef.current = setInterval(loadContacts, 30_000)
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [])

  function openChat(contact: Contact) {
    setSelectedPlayerId(contact.userId)
    setView('private-chat')
  }

  function formatTime(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'сейчас'
    if (minutes < 60) return `${minutes}м`
    if (hours < 24) return `${hours}ч`
    if (days < 7) return `${days}д`
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="min-h-[100dvh] gradient-bg"
    >
      <div className="max-w-md mx-auto p-4">
        {/* Header — uses same gradient as background to blend seamlessly */}
        <div className="flex items-center gap-3 mb-6 sticky top-0 gradient-bg -mx-4 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 z-10">
          <button
            onClick={() => setView('menu')}
            className="p-2 rounded-lg hover:bg-card/50"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Личные чаты</h1>
            <p className="text-xs text-muted-foreground">
              {contacts.length > 0 ? `${contacts.length} контактов` : 'Нет диалогов'}
            </p>
          </div>
        </div>

        {/* Contacts list */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-card/30 rounded-2xl animate-pulse" />
            ))
          ) : contacts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 text-muted-foreground"
            >
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">Нет диалогов</p>
              <p className="text-sm mb-4">
                Чтобы начать личный чат, зайди в раздел «Игроки»
                <br />и нажми «Личный чат» в профиле игрока
              </p>
              <button
                onClick={() => setView('players')}
                className="text-primary hover:underline text-sm font-medium"
              >
                Перейти к игрокам →
              </button>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {contacts.map((contact, idx) => {
                const isOnline = onlineUserIds.has(contact.userId)
                return (
                  <motion.button
                    key={contact.userId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => openChat(contact)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border bg-card/40 hover:bg-card/60 hover:border-primary/30 transition-all text-left"
                  >
                    <div className="relative shrink-0">
                      <AvatarDisplay
                        avatar={contact.avatar}
                        customAvatar={contact.customAvatar}
                        size={48}
                      />
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                          isOnline ? 'bg-primary' : 'bg-muted-foreground/40'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">{contact.username}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTime(contact.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground truncate flex-1">
                          {contact.lastMessage}
                        </p>
                        {contact.unreadCount > 0 && (
                          <span className="bg-destructive text-destructive-foreground rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold shrink-0">
                            {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                        <span className="text-[10px] text-muted-foreground">
                          {isOnline ? 'онлайн' : 'офлайн'}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  )
}
