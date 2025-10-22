'use client'

import { useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  image: { file: File; preview: string } | null
  onImageSelect: (file: File) => void
  onImageRemove: () => void
  disabled?: boolean
}

export default function ImageUploadCard({
  title,
  description,
  icon,
  image,
  onImageSelect,
  onImageRemove,
  disabled = false,
}: ImageUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const triggerFileDialog = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      return
    }
    onImageSelect(file)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (disabled) return
    const file = event.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    onImageSelect(file)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 border-indigo-100/70 backdrop-blur-sm bg-white/80 transition-all duration-300',
        !disabled && 'hover:shadow-xl hover:border-indigo-200 hover:scale-[1.02]',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-indigo-50/40 pointer-events-none" />
      <CardHeader className="pb-3 relative">
        <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
          {icon ?? <Upload className="w-4 h-4 text-indigo-500" />}
          {title}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-500">{description}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {image ? (
          <div className="relative group">
            <img
              src={image.preview}
              alt={title}
              className="w-full h-48 sm:h-64 object-cover rounded-xl border-2 border-indigo-100 shadow-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onImageRemove}
              disabled={disabled}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={triggerFileDialog}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              'border-2 border-dashed border-indigo-200 rounded-xl p-8 sm:p-12 text-center transition-all duration-300 bg-gradient-to-br from-indigo-50/60 to-purple-50/60',
              !disabled && 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-lg'
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-medium text-slate-700 mb-1">クリックして写真を選択</p>
                <p className="text-xs text-slate-500">またはドラッグ＆ドロップ</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
