'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getSocket, disconnectSocket, resetSocket } from '@/lib/socket-client'
import { LoginView } from '@/components/game/LoginView'
import { RegisterView } from '@/components/game/RegisterView'
import { MenuView } from '@/components/game/MenuView'
import { MatchmakingView } from '@/components/game/MatchmakingView'
import { GameView } from '@/components/game/GameView'
import { ProfileView } from '@/components/game/ProfileView'
import { SettingsView } from '@/components/game/SettingsView'
import { PlayersView } from '@/components/game/PlayersView'
import { ChatView } from '@/components/game/ChatView'
import { PlayerProfileView } from '@/components/game/PlayerProfileView'
import { PrivateChatsView } from '@/components/game/PrivateChatsView'
import { PrivateChatView } from '@/components/game/PrivateChatView'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, setUser, view, setView, setOnlineCount, setOnlineUserIds } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [socketReady, setSocketReady] = useState(false)

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          setView('menu')
        } else {
          setView('login')
        }
      })
      .catch(() => setView('login'))
      .finally(() => setLoading(false))
  }, [])

  // Initialize socket when user logs in
  useEffect(() => {
    if (!user) {
      disconnectSocket()
      setSocketReady(false)
      return
    }

    // Force-recreate the socket so the new auth token is used.
    // This fixes the bug where re-login as a different user kept the old
    // socket (with the old token) cached in the singleton.
    resetSocket()
    const socket = getSocket()
    if (!socket) {
      setSocketReady(false)
      return
    }

    if (!socket.connected) {
      socket.connect()
    }

    const onConnect = () => setSocketReady(true)
    const onDisconnect = () => setSocketReady(false)
    const onConnectError = (err: Error) => {
      console.warn('[socket] connect error:', err.message)
    }
    const onOnlineCount = ({ count }: { count: number }) => {
      setOnlineCount(count)
    }
    const onOnlineUsers = ({ userIds }: { userIds: string[] }) => {
      setOnlineUserIds(new Set(userIds))
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('online_count', onOnlineCount)
    socket.on('online_users', onOnlineUsers)

    if (socket.connected) setSocketReady(true)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('online_count', onOnlineCount)
      socket.off('online_users', onOnlineUsers)
    }
  }, [user])

  useEffect(() => {
    return () => disconnectSocket()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[100dvh] gradient-bg flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Render current view directly — each view handles its own animations
  if (!user) {
    return view === 'register' ? <RegisterView /> : <LoginView />
  }

  let currentView: React.ReactNode
  switch (view) {
    case 'matchmaking': currentView = <MatchmakingView />; break
    case 'game': currentView = <GameView />; break
    case 'profile': currentView = <ProfileView />; break
    case 'settings': currentView = <SettingsView />; break
    case 'players': currentView = <PlayersView />; break
    case 'chat': currentView = <ChatView />; break
    case 'player-profile': currentView = <PlayerProfileView />; break
    case 'private-chats': currentView = <PrivateChatsView />; break
    case 'private-chat': currentView = <PrivateChatView />; break
    default: currentView = <MenuView />
  }

  return (
    <>
      {currentView}
      {user && !socketReady && view !== 'matchmaking' && view !== 'game' && view !== 'private-chat' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 text-xs flex items-center gap-2 z-50 shadow-lg">
          <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
          <span>Подключение к серверу...</span>
        </div>
      )}
    </>
  )
}
