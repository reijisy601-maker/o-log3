'use client'

import imageCompression from 'browser-image-compression'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, History, LogOut, Loader2, Truck, Wrench, Sparkles, Info } from 'lucide-react'
import { toast } from 'sonner'
import ImageUploadCard from '@/components/image-upload-card'
import { EvaluationResult } from '@/components/evaluation-result'
import HistoryTab from '@/components/history-tab'
import { createClient } from '@/lib/supabase/client'

interface UploadedImage {
  file: File
  preview: string
}

type EvaluationErrorDetails = {
  suggestions?: string[]
  error?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return ''
}

const getEvaluationDetails = (error: unknown): EvaluationErrorDetails | null => {
  if (!isRecord(error) || !('details' in error)) {
    return null
  }

  const rawDetails = (error as { details?: unknown }).details
  if (!isRecord(rawDetails)) {
    return null
  }

  const suggestionsValue = (rawDetails as Record<string, unknown>).suggestions
  const errorValue = (rawDetails as Record<string, unknown>).error

  const suggestions = Array.isArray(suggestionsValue)
    ? suggestionsValue.filter((item): item is string => typeof item === 'string')
    : undefined
  const errorMessage = typeof errorValue === 'string' ? errorValue : undefined

  if (!suggestions?.length && !errorMessage) {
    return null
  }

  return {
    suggestions,
    error: errorMessage,
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [userLoaded, setUserLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'evaluate' | 'history'>('evaluate')
  const [luggageImage, setLuggageImage] = useState<UploadedImage | null>(null)
const [toolboxImage, setToolboxImage] = useState<UploadedImage | null>(null)
const [isUploading, setIsUploading] = useState(false)
const [isEvaluating, setIsEvaluating] = useState(false)
const [isCompressing, setIsCompressing] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState({
    totalScore: 0,
    luggageScore: 0,
    luggageComment: '',
    toolboxScore: 0,
    toolboxComment: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUserLoaded(true)
      }
    })
  }, [router, supabase])

  useEffect(() => {
    return () => {
      if (luggageImage?.preview) URL.revokeObjectURL(luggageImage.preview)
      if (toolboxImage?.preview) URL.revokeObjectURL(toolboxImage.preview)
    }
  }, [luggageImage, toolboxImage])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const compressionOptions = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
  }

  const handleImageSelect = async (type: 'luggage' | 'toolbox', file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png']

    if (!allowedTypes.includes(file.type)) {
      toast.error('アップロードできません', {
        description: '❌ JPEG または PNG 形式の画像のみアップロード可能です',
      })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('ファイルサイズが大きすぎます', {
        description: '10MB以下の画像をアップロードしてください。',
      })
      return
    }

    setIsCompressing(true)

    try {
      console.log('=== 画像圧縮開始 ===')
      console.log('元のサイズ:', (file.size / 1024 / 1024).toFixed(2), 'MB')
      const compressedFile = await imageCompression(file, compressionOptions)
      console.log('圧縮後:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB')

      const preview = URL.createObjectURL(compressedFile)
      const payload = { file: compressedFile, preview }

      if (type === 'luggage') {
        if (luggageImage?.preview) URL.revokeObjectURL(luggageImage.preview)
        setLuggageImage(payload)
      } else {
        if (toolboxImage?.preview) URL.revokeObjectURL(toolboxImage.preview)
        setToolboxImage(payload)
      }
    } catch (error) {
      console.error('=== 画像処理エラー ===')
      console.error(error)
      toast.error('画像の最適化に失敗しました', {
        description: '再度お試しください。',
      })
      setIsEvaluating(false)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleImageRemove = (type: 'luggage' | 'toolbox') => {
    if (type === 'luggage' && luggageImage) {
      URL.revokeObjectURL(luggageImage.preview)
      setLuggageImage(null)
    }
    if (type === 'toolbox' && toolboxImage) {
      URL.revokeObjectURL(toolboxImage.preview)
      setToolboxImage(null)
    }
  }

  const uploadImages = async () => {
    if (!luggageImage || !toolboxImage) {
      toast.error('画像が不足しています', {
        description: '車両の荷物スペースと道具収納の写真を両方選択してください。',
      })
      return null
    }

    setIsUploading(true)
    console.log('=== アップロード試行 ===')

    try {
      const uploadImage = async (file: File, type: 'luggage' | 'toolbox') => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)

        console.log(`--- ${type} アップロード開始 ---`)
        console.log('ファイルサイズ:', (file.size / 1024 / 1024).toFixed(2), 'MB')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? '画像のアップロードに失敗しました')
        }

        return payload.url as string
      }

      const [luggageUrl, toolboxUrl] = await Promise.all([
        uploadImage(luggageImage.file, 'luggage'),
        uploadImage(toolboxImage.file, 'toolbox'),
      ])

      console.log('=== アップロード完了 ===')

      toast.success('画像をアップロードしました', {
        description: 'AI評価を開始します。',
      })

      return { luggageUrl, toolboxUrl }
    } catch (error: unknown) {
      console.error('[dashboard] image upload error:', error)
      const message =
        getErrorMessage(error) || '時間をおいて再試行してください。'
      toast.error('アップロードに失敗しました', {
        description: message,
      })
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const evaluateImage = async (imageUrl: string, imageType: 'luggage' | 'toolbox') => {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, imageType }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload) {
      throw Object.assign(new Error(payload?.error ?? '評価に失敗しました'), { details: payload })
    }

    if (!payload.valid) {
      throw Object.assign(new Error(payload.error ?? '画像が評価対象として認識できませんでした'), { details: payload })
    }

    return payload
  }

  const handleEvaluate = async () => {
    console.log('=== 提出処理開始 ===')
    if (luggageImage && toolboxImage) {
      console.log('=== ファイル情報 ===')
      console.log('ラゲッジ:', {
        name: luggageImage.file.name,
        sizeMB: (luggageImage.file.size / 1024 / 1024).toFixed(2),
        type: luggageImage.file.type,
      })
      console.log('ツールボックス:', {
        name: toolboxImage.file.name,
        sizeMB: (toolboxImage.file.size / 1024 / 1024).toFixed(2),
        type: toolboxImage.file.type,
      })
    }
    const urls = await uploadImages()
    if (!urls) return

    setIsEvaluating(true)

    try {
      console.log('=== 評価リクエスト送信 ===')
      const [luggageData, toolboxData] = await Promise.all([
        evaluateImage(urls.luggageUrl, 'luggage'),
        evaluateImage(urls.toolboxUrl, 'toolbox'),
      ])

      const totalScore = Math.round((Number(luggageData.score) + Number(toolboxData.score)) / 2)

      const submissionResponse = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          luggageUrl: urls.luggageUrl,
          toolboxUrl: urls.toolboxUrl,
          luggageScore: luggageData.score,
          toolboxScore: toolboxData.score,
          luggageComment: luggageData.comment,
          toolboxComment: toolboxData.comment,
        }),
      })

      const submissionPayload = await submissionResponse.json().catch(() => null)

      if (!submissionResponse.ok || !submissionPayload?.success) {
        const errorMessage =
          submissionPayload?.error ||
          submissionPayload?.details ||
          '提出履歴の保存に失敗しました'
        throw Object.assign(new Error(errorMessage), {
          details: submissionPayload,
        })
      }

      setEvaluationResult({
        totalScore,
        luggageScore: luggageData.score,
        luggageComment: luggageData.comment,
        toolboxScore: toolboxData.score,
        toolboxComment: toolboxData.comment,
      })
      setShowResult(true)
      setRefreshTrigger((prev) => prev + 1)

      toast.success('評価が完了しました', {
        description: `総合スコア: ${totalScore}点。履歴タブで詳細を確認できます。`,
      })
    } catch (error: unknown) {
      console.error('[dashboard] evaluation error:', error)
      const details = getEvaluationDetails(error)
      if (details?.suggestions?.length) {
        toast.error(details.error ?? '評価を完了できませんでした', {
          description: details.suggestions.join(' / '),
        })
      } else {
        toast.error('評価を完了できませんでした', {
          description:
            getErrorMessage(error) || '通信状況を確認し、再度お試しください。',
        })
      }
    } finally {
      setIsEvaluating(false)
    }
  }

  const canEvaluate =
    Boolean(luggageImage && toolboxImage) && !isUploading && !isEvaluating && !isCompressing

  if (!userLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="backdrop-blur-md bg-white/70 border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  OrderLog
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">整理整頓記録システム</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-indigo-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ログアウト</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'evaluate' | 'history')}>
          <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-14 bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-lg border border-white/20">
            <TabsTrigger
              value="evaluate"
              className="flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 text-sm sm:text-base font-medium"
            >
              <Upload className="w-4 h-4" />
              <span>評価</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 text-sm sm:text-base font-medium"
            >
              <History className="w-4 h-4" />
              <span>履歴</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluate" className="space-y-6 mt-0">
            <Card className="border-2 border-indigo-100 shadow-2xl backdrop-blur-sm bg-white/90 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-30 -z-10" />
              <CardHeader className="space-y-2 relative">
                <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  今月の評価
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-slate-600">
                  車両の荷物スペースと道具収納の写真を撮影してアップロードしてください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <ImageUploadCard
                    title="車両の荷物スペース"
                    description="ラゲッジスペース、トランク、荷台などの写真"
                    icon={<Truck className="w-5 h-5 text-indigo-500" />}
                    image={luggageImage}
                    onImageSelect={(file) => handleImageSelect('luggage', file)}
                    onImageRemove={() => handleImageRemove('luggage')}
                    disabled={isUploading || isEvaluating || isCompressing}
                  />
                  <ImageUploadCard
                    title="道具収納"
                    description="工具箱、ツールボックス、収納ケースなどの写真"
                    icon={<Wrench className="w-5 h-5 text-purple-500" />}
                    image={toolboxImage}
                    onImageSelect={(file) => handleImageSelect('toolbox', file)}
                    onImageRemove={() => handleImageRemove('toolbox')}
                    disabled={isUploading || isEvaluating || isCompressing}
                  />
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-base">📸</span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 font-medium">アップロード前に自動で最適化します</p>
                        <p className="text-xs text-gray-500 mt-1">
                          最大ファイルサイズ: 10MB / 圧縮後は約1〜2MB程度に軽量化されます
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="text-base">🖼️</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">
                          対応形式：<span className="font-semibold">JPEG, PNG</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {isCompressing && (
                    <p className="mt-3 text-sm font-medium text-purple-600 animate-pulse">
                      🔄 画像を最適化中...
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleEvaluate}
                  disabled={!canEvaluate}
                  size="lg"
                  className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> アップロード中...
                    </>
                  ) : isEvaluating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> AI評価中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" /> 評価を受ける
                    </>
                  )}
                </Button>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 text-sm sm:text-base">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-indigo-900 font-semibold mb-2">撮影のポイント</p>
                      <ul className="text-indigo-800 space-y-1">
                        <li>・明るい場所で全体が見えるように撮影</li>
                        <li>・月に1回のみ提出可能（同月は上書き更新）</li>
                        <li>・鮮明な写真を使用し、対象が中心になるよう調整</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryTab refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </main>

      <EvaluationResult open={showResult} onClose={() => setShowResult(false)} {...evaluationResult} />
    </div>
  )
}
