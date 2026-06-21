'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, DirectMessage } from '@/lib/store'
import { getSocket } from '@/lib/socket-client'
import { AvatarDisplay } from './AvatarDisplay'
import { ArrowLeft, Send, Trash2, MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface OtherUser {
  id: string
  username: string
  avatar: string
  customAvatar?: string | null
}

export function PrivateChatView() {
  const { selectedPlayerId, setView, user, onlineUserIds, showToast, setSelectedPlayerId } = useAppStore()
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef(getSocket())
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Load messages via HTTP (more reliable than socket.io on Railway)
  async function loadMessages() {
    if (!selectedPlayerId) return
    try {
      const res = await fetch(`/api/direct-messages/${selectedPlayerId}`)
      const data = await res.json()
      if (data.otherUser) {
        setOtherUser(data.otherUser)
      }
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch (e) {
      console.error('Failed to load messages:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedPlayerId) {
      setView('private-chats')
      return
    }
    setLoading(true)
    loadMessages()

    // Poll for new messages every 3 seconds (fallback for socket.io)
    pollingRef.current = setInterval(loadMessages, 3000)

    // Also listen for real-time messages via socket
    const socket = socketRef.current
    if (socket) {
      const onDmMessage = (msg: any) => {
        if (
          (msg.senderId === selectedPlayerId && msg.recipientId === user?.id) ||
          (msg.senderId === user?.id && msg.recipientId === selectedPlayerId)
        ) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, {
              id: msg.id,
              senderId: msg.senderId,
              recipientId: msg.recipientId,
              text: msg.text,
              read: msg.read,
              createdAt: new Date(msg.createdAt).toISOString(),
            }]
          })
        }
      }

      socket.on('dm_message', onDmMessage)

      return () => {
        socket.off('dm_message', onDmMessage)
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }
  }, [selectedPlayerId, user?.id])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending || !selectedPlayerId) return

    setSending(true)
    setText('')

    // Always use HTTP API for sending (reliable) — socket.io is only for real-time notification
    try {
      const res = await fetch('/api/direct-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedPlayerId, text: trimmed }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          // Add to local messages immediately (with dedup)
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev
            return [...prev, data.message]
          })
          // Note: we do NOT emit dm_send via socket here — the HTTP API already
          // saved the message. The socket 'dm_message' listener will handle
          // real-time updates if the other user is online.
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast('error', errData.error || 'Не удалось отправить сообщение')
        setText(trimmed) // Restore text
      }
    } catch (e) {
      showToast('error', 'Сетевая ошибка')
      setText(trimmed)
    }

    setTimeout(() => setSending(false), 200)
  }

  async function handleDeleteChat() {
    if (!selectedPlayerId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/direct-messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: selectedPlayerId }),
      })
      if (res.ok) {
        showToast('success', 'Чат удалён')
        setConfirmDelete(false)
        setView('private-chats')
      } else {
        const data = await res.json().catch(() => ({}))
        showToast('error', data.error || 'Не удалось удалить чат')
      }
    } catch (e) {
      showToast('error', 'Сетевая ошибка')
    } finally {
      setDeleting(false)
    }
  }

  function openUserProfile() {
    if (!otherUser) return
    // selectedPlayerId is already set to otherUser.id
    setView('player-profile')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="min-h-[100dvh] gradient-bg flex items-center justify-center">
        <p className="text-muted-foreground">Пользователь не найден</p>
      </div>
    )
  }

  const isOnline = onlineUserIds.has(otherUser.id)

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="min-h-[100dvh] gradient-bg flex flex-col"
    >
      {/* Header — opaque background, covers safe area */}
      <div className="flex items-center gap-3 p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] border-b border-border gradient-bg z-20">
        <button
          onClick={() => setView('private-chats')}
          className="p-2 rounded-lg hover:bg-card/50"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={openUserProfile}
          className="relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Открыть профиль"
        >
          <AvatarDisplay
            avatar={otherUser.avatar}
            customAvatar={otherUser.customAvatar}
            size={40}
          />
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
              isOnline ? 'bg-primary' : 'bg-muted-foreground/40'
            }`}
          />
        </button>
        <button
          onClick={openUserProfile}
          className="flex-1 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity"
        >
          <h1 className="text-base font-bold truncate">{otherUser.username}</h1>
          <p className="text-xs text-muted-foreground">
            {isOnline ? (
              <span className="text-primary">онлайн</span>
            ) : (
              'офлайн'
            )}
          </p>
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-lg hover:bg-card/50"
          aria-label="Меню"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-40 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
            >
              <button
                onClick={() => {
                  setShowMenu(false)
                  openUserProfile()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary/50 transition-colors text-left"
              >
                <AvatarDisplay avatar={otherUser.avatar} customAvatar={otherUser.customAvatar} size={20} />
                <span>Профиль игрока</span>
              </button>
              <div className="border-t border-border" />
              <button
                onClick={() => {
                  setShowMenu(false)
                  setConfirmDelete(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить чат</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            onClick={() => !deleting && setConfirmDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card border border-border rounded-3xl p-6 max-w-xs w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-3">🗑️</div>
              <h2 className="text-lg font-bold mb-2">Удалить чат?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Все сообщения с {otherUser.username} будут удалены у вас и у собеседника. Это действие нельзя отменить.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handleDeleteChat}
                  disabled={deleting}
                  variant="destructive"
                  className="w-full h-12"
                  size="lg"
                >
                  {deleting ? 'Удаление...' : 'Удалить чат'}
                </Button>
                <Button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  variant="ghost"
                  className="w-full h-12"
                  size="lg"
                >
                  Отмена
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">Начни беседу</p>
            <p className="text-xs">Напиши первое сообщение!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.id
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} max-w-[80%]`}>
                    {!isMe && (
                      <AvatarDisplay
                        avatar={otherUser.avatar}
                        customAvatar={otherUser.customAvatar}
                        size={32}
                        rounded="rounded-lg"
                      />
                    )}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl px-3 py-2 text-sm break-words selectable ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card border border-border rounded-bl-md'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-border bg-card flex gap-2 items-end"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение..."
          maxLength={1000}
          className="flex-1 h-11 selectable"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0"
          aria-label="Отправить"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  )
}
