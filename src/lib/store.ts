'use client'

import { create } from 'zustand'

export interface User {
  id: string
  username: string
  avatar: string
  customAvatar?: string | null
  isAdmin?: boolean
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  gamesDraw: number
  winRate?: number
  createdAt?: string
}

export type ViewName = 'login' | 'register' | 'menu' | 'matchmaking' | 'game' | 'profile' | 'settings' | 'players' | 'chat' | 'player-profile' | 'private-chats' | 'private-chat'

export interface MatchData {
  gameId: string
  player1: { userId: string; username: string; avatar: string; symbol: 'X' | 'O'; isAdmin?: boolean }
  player2: { userId: string; username: string; avatar: string; symbol: 'X' | 'O'; isAdmin?: boolean }
  isVsBot?: boolean
  board: string[]
  currentTurn: 'X' | 'O'
}

export interface GameState {
  gameId: string
  board: string[]
  currentTurn: 'X' | 'O'
  status: 'active' | 'finished'
  winner: 'X' | 'O' | 'draw' | null
  winningLine: number[] | null
  forfeit?: boolean
}

interface ChatMessage {
  id: string
  userId: string | null
  username: string
  avatar: string
  text: string
  createdAt: number
}

export interface DirectMessage {
  id: string
  senderId: string
  recipientId: string
  text: string
  read: boolean
  createdAt: string
}

export interface Contact {
  userId: string
  username: string
  avatar: string
  customAvatar?: string | null
  isAdmin?: boolean
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  isOnline: boolean
}

interface AppStore {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Navigation
  view: ViewName
  setView: (view: ViewName) => void
  // For viewing other player's profile or private chat
  selectedPlayerId: string | null
  setSelectedPlayerId: (id: string | null) => void

  // Match
  currentMatch: MatchData | null
  setCurrentMatch: (match: MatchData | null) => void

  // Game state
  gameState: GameState | null
  setGameState: (state: GameState | null) => void

  // Matchmaking
  queueCount: number
  setQueueCount: (n: number) => void
  botAvailable: boolean
  setBotAvailable: (b: boolean) => void

  // Online
  onlineCount: number
  setOnlineCount: (n: number) => void
  onlineUserIds: Set<string>
  setOnlineUserIds: (ids: Set<string>) => void

  // Chat (global)
  messages: ChatMessage[]
  setMessages: (m: ChatMessage[]) => void
  addMessage: (m: ChatMessage) => void

  // Direct messages
  directMessages: DirectMessage[]
  setDirectMessages: (m: DirectMessage[]) => void
  addDirectMessage: (m: DirectMessage) => void
  // Contacts list
  contacts: Contact[]
  setContacts: (c: Contact[]) => void

  // Toast notifications
  toast: { id: number; type: 'info' | 'success' | 'error'; message: string } | null
  showToast: (type: 'info' | 'success' | 'error', message: string) => void
  clearToast: () => void
}

let toastIdCounter = 0

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  view: 'login',
  setView: (view) => set({ view }),
  selectedPlayerId: null,
  setSelectedPlayerId: (id) => set({ selectedPlayerId: id }),

  currentMatch: null,
  setCurrentMatch: (match) => set({ currentMatch: match }),

  gameState: null,
  setGameState: (state) => set({ gameState: state }),

  queueCount: 0,
  setQueueCount: (n) => set({ queueCount: n }),
  botAvailable: false,
  setBotAvailable: (b) => set({ botAvailable: b }),

  onlineCount: 0,
  setOnlineCount: (n) => set({ onlineCount: n }),
  onlineUserIds: new Set<string>(),
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),

  messages: [],
  setMessages: (m) => set({ messages: m }),
  addMessage: (m) => set((state) => {
    // Dedup: if a message with the same id already exists, skip it.
    // This happens when socket.io delivers a message between the
    // `chat_history` request and response.
    if (state.messages.some(x => x.id === m.id)) return state
    return { messages: [...state.messages.slice(-49), m] }
  }),

  directMessages: [],
  setDirectMessages: (m) => set({ directMessages: m }),
  addDirectMessage: (m) => set((state) => ({ directMessages: [...state.directMessages.slice(-199), m] })),
  contacts: [],
  setContacts: (c) => set({ contacts: c }),

  toast: null,
  showToast: (type, message) => {
    const id = ++toastIdCounter
    set({ toast: { id, type, message } })
    setTimeout(() => {
      set((state) => (state.toast?.id === id ? { toast: null } : {}))
    }, 3000)
  },
  clearToast: () => set({ toast: null }),
}))
