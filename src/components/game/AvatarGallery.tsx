'use client'

import { AVATARS, getAvatar } from '@/lib/avatars'
import { motion } from 'framer-motion'
import { Check, Upload, Image as ImageIcon } from 'lucide-react'
import { useRef, useState } from 'react'

interface AvatarGalleryProps {
  selected: string
  onSelect: (id: string) => void
  // Optional: show custom avatar preview if one is uploaded
  customAvatarPreview?: string | null
  // Optional: callback for custom avatar upload
  onUpload?: (dataUri: string) => void
}

export function AvatarGallery({ selected, onSelect, customAvatarPreview, onUpload }: AvatarGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Выбери изображение')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Поддерживаются только JPEG, PNG, WebP')
      return
    }
    // Validate size (max 1.5MB)
    if (file.size > 1_500_000) {
      setError('Файл слишком большой (макс 1.5MB)')
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (onUpload) {
        onUpload(result)
      } else {
        // Default: just select 'custom' and let parent handle upload
        onSelect('custom')
      }
      setUploading(false)
    }
    reader.onerror = () => {
      setError('Не удалось прочитать файл')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const isCustomSelected = selected === 'custom'

  return (
    <div className="w-full">
      <div className="text-sm font-medium mb-3 text-muted-foreground">
        Выбери аватарку
      </div>
      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scroll p-1">
        {/* Custom upload option */}
        <motion.button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.9 }}
          className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
            isCustomSelected
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/10'
              : 'ring-1 ring-border hover:ring-primary/50 bg-secondary/30'
          }`}
          aria-label="Загрузить своё фото"
        >
          {customAvatarPreview && isCustomSelected ? (
            <img
              src={customAvatarPreview}
              alt="Custom avatar"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <>
              {uploading ? (
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-primary mb-1" />
              )}
              <span className="text-[9px] text-muted-foreground text-center px-1">Загрузить</span>
            </>
          )}
          {isCustomSelected && customAvatarPreview && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5"
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </motion.div>
          )}
        </motion.button>

        {/* Preset avatars */}
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

      {error && (
        <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {selected && selected !== 'custom' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 text-sm"
        >
          <span className="text-2xl">{getAvatar(selected).emoji}</span>
          <span className="text-muted-foreground">Выбрано: <span className="text-foreground font-medium">{getAvatar(selected).label}</span></span>
        </motion.div>
      )}
      {isCustomSelected && customAvatarPreview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 text-sm"
        >
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Загруженное фото</span>
        </motion.div>
      )}
    </div>
  )
}
