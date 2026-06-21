'use client'

import { useAppStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import { useEffect } from 'react'

export function ToastContainer() {
  const { toast, clearToast } = useAppStore()

  // Auto-clear is handled by the store, but we also clear on click
  useEffect(() => {
    // Just ensure the component re-renders when toast changes
  }, [toast])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-primary" />,
    error: <XCircle className="w-5 h-5 text-destructive" />,
    info: <Info className="w-5 h-5 text-muted-foreground" />,
  }

  const bgColors = {
    success: 'border-primary/40 bg-card',
    error: 'border-destructive/40 bg-card',
    info: 'border-border bg-card',
  }

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 60, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 60, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={() => clearToast()}
          className={`fixed bottom-6 left-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-[90vw] cursor-pointer ${bgColors[toast.type]}`}
        >
          {icons[toast.type]}
          <span className="text-sm font-medium selectable">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
