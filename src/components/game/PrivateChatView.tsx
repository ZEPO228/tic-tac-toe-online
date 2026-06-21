'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, DirectMessage } from '@/lib/store'
import { getSocket } from '@/lib/socket-client'
import { AvatarDisplay } from './AvatarDisplay'
import { ArrowLeft, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

interface OtherUser {
  id: string
  username: string
  avatar: string
  customAvatar?: string | null
}

export function PrivateChatView() {
  const { selectedPlayerId, setView, user, onlineUserIds, showToast } = useAppStore()
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
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

    // Try socket.io first for real-time
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('dm_send', { recipientId: selectedPlayerId, text: trimmed })
      // Optimistically add message — it'll come back via dm_message echo
    } else {
      // Fallback: HTTP API
      try {
        const res = await fetch('/api/direct-messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientId: selectedPlayerId, text: trimmed }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.message) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) return prev
              return [...prev, data.message]
            })
          }
        } else {
          showToast('error', 'Не удалось отправить сообщение')
          setText(trimmed) // Restore text
        }
      } catch (e) {
        showToast('error', 'Сетевая ошибка')
        setText(trimmed)
      }
    }

    setTimeout(() => setSending(false), 200)
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
      className="min-h-[100dvh] gradient-bg flex flex-col safe-top safe-bottom"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <button
          onClick={() => setView('private-chats')}
          className="p-2 rounded-lg hover:bg-card/50"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative shrink-0">
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
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{otherUser.username}</h1>
          <p className="text-xs text-muted-foreground">
            {isOnline ? (
              <span className="text-primary">онлайн</span>
            ) : (
              'офлайн'
            )}
          </p>
        </div>
      </div>

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
        className="p-3 border-t border-border bg-card/30 backdrop-blur-md flex gap-2 items-end"
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
