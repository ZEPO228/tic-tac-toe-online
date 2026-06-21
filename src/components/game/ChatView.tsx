'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getSocket } from '@/lib/socket-client'
import { AvatarDisplay } from './AvatarDisplay'
import { ArrowLeft, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

interface ChatMsg {
  id: string
  userId: string | null
  username: string
  avatar: string
  text: string
  createdAt: number
}

export function ChatView() {
  const { setView, user, messages, setMessages, addMessage } = useAppStore()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef(getSocket())

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // Request chat history
    socket.emit('chat_history')

    const onHistory = ({ messages: msgs }: { messages: ChatMsg[] }) => {
      setMessages(msgs)
    }
    const onMessage = (msg: ChatMsg) => {
      addMessage(msg)
    }

    socket.on('chat_history', onHistory)
    socket.on('chat_message', onMessage)

    return () => {
      socket.off('chat_history', onHistory)
      socket.off('chat_message', onMessage)
    }
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    const socket = socketRef.current
    if (socket) {
      socket.emit('chat_message', { text: trimmed })
      setText('')
    }
    setTimeout(() => setSending(false), 200)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="min-h-[100dvh] gradient-bg flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] border-b border-border gradient-bg z-10">
        <button
          onClick={() => setView('menu')}
          className="p-2 rounded-lg hover:bg-card/50"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Общий чат</h1>
          <p className="text-xs text-muted-foreground">{messages.length} сообщений</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Live</span>
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
            <p className="text-sm">Сообщений пока нет</p>
            <p className="text-xs">Будь первым!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMe = msg.userId === user?.id
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <AvatarDisplay
                    avatar={msg.avatar}
                    size={36}
                  />
                  <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${isMe ? 'text-primary' : ''}`}>
                        {isMe ? 'Ты' : msg.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`rounded-2xl px-3 py-2 text-sm break-words selectable ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border rounded-bl-md'
                    }`}>
                      {msg.text}
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
          maxLength={500}
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
