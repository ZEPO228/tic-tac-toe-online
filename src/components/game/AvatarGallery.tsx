'use client'

import { AVATARS, getAvatar } from '@/lib/avatars'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AvatarGalleryProps {
  selected: string
  onSelect: (id: string) => void
}

export function AvatarGallery({ selected, onSelect }: AvatarGalleryProps) {
  return (
    <div className="w-full">
      <div className="text-sm font-medium mb-3 text-muted-foreground">
        Выбери аватарку
      </div>
      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scroll p-1">
        {AVATARS.map((avatar, idx) => {
          const isSelected = selected === avatar.id
          return (
            <motion.button
              key={avatar.id}
              type="button"
              onClick={() => onSelect(avatar.id)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              whileTap={{ scale: 0.9 }}
              className={`relative aspect-square rounded-xl flex items-center justify-center text-3xl transition-all ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'ring-1 ring-border hover:ring-primary/50'
              }`}
              style={{ backgroundColor: avatar.color + '30' }}
              aria-label={avatar.label}
              aria-pressed={isSelected}
            >
              <span className="drop-shadow-lg">{avatar.emoji}</span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5"
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 text-sm"
        >
          <span className="text-2xl">{getAvatar(selected).emoji}</span>
          <span className="text-muted-foreground">Выбрано: <span className="text-foreground font-medium">{getAvatar(selected).label}</span></span>
        </motion.div>
      )}
    </div>
  )
}
