'use client'

import { create } from 'zustand'

export interface User {
  id: string
  username: string
  avatar: string
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  gamesDraw: number
  winRate?: number
  createdAt?: string
}

export type ViewName = 'login' | 'register' | 'menu' | 'matchmaking' | 'game' | 'profile' | 'settings' | 'players' | 'chat'

export interface MatchData {
  gameId: string
  player1: { userId: string; username: string; avatar: string; symbol: 'X' | 'O' }
  player2: { userId: string; username: string; avatar: string; symbol: 'X' | 'O' }
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

interface AppStore {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Navigation
  view: ViewName
  setView: (view: ViewName) => void

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

  // Chat
  messages: ChatMessage[]
  setMessages: (m: ChatMessage[]) => void
  addMessage: (m: ChatMessage) => void

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

  messages: [],
  setMessages: (m) => set({ messages: m }),
  addMessage: (m) => set((state) => ({ messages: [...state.messages.slice(-49), m] })),

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
