"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, CheckCircle2, Package, Briefcase, TrendingUp, AlertCircle, Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

interface UploadCardProps {
  month: string
  userId: string
}

interface AnalysisResult {
  averageScore: number
  luggageScore: number
  toolBagScore: number
  luggageAnalysis: string
  toolBagAnalysis: string
}

type UploadState = "idle" | "uploading" | "analyzing" | "complete"

export function UploadCard({ month, userId }: UploadCardProps) {
  const [luggageFile, setLuggageFile] = useState<File | null>(null)
  const [toolBagFile, setToolBagFile] = useState<File | null>(null)
  const [luggagePreview, setLuggagePreview] = useState<string | null>(null)
  const [toolBagPreview, setToolBagPreview] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const router = useRouter()

  const compressAndEncodeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Canvas context not available"))
            return
          }

          const maxWidth = 1024
          const maxHeight = 1024
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8)
          resolve(compressedDataUrl)
        }
        img.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"))
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "luggage" | "toolbag") => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.type.startsWith("image/")) {
      setMessage({ type: "error", text: "画像ファイルを選択してください" })
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "ファイルサイズは10MB以下にしてください" })
      return
    }

    setMessage(null)

    try {
      const compressedDataUrl = await compressAndEncodeImage(selectedFile)
      if (type === "luggage") {
        setLuggageFile(selectedFile)
        setLuggagePreview(compressedDataUrl)
      } else {
        setToolBagFile(selectedFile)
        setToolBagPreview(compressedDataUrl)
      }
    } catch (error) {
      console.error("[v0] Image compression error:", error)
      setMessage({ type: "error", text: "画像の処理に失敗しました" })
    }
  }

  const handleUpload = async () => {
    if (!luggageFile || !toolBagFile) {
      setMessage({ type: "error", text: "両方の画像をアップロードしてください" })
      return
    }

    if (!luggagePreview || !toolBagPreview) {
      setMessage({ type: "error", text: "画像のプレビューに失敗しました" })
      return
    }

    setUploadState("uploading")
    setProgress(10)
    setMessage(null)

    try {
      console.log("[v0] Starting image upload and analysis")

      setProgress(30)

      setUploadState("analyzing")

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          luggageSpaceImageUrl: luggagePreview,
          toolBagImageUrl: toolBagPreview,
          userId,
          month,
        }),
      })

      setProgress(80)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "画像の解析に失敗しました")
      }

      const result = await response.json()
      console.log("[v0] Analysis result:", result)

      setProgress(100)
      setUploadState("complete")
      setAnalysisResult(result)
      setMessage({ type: "success", text: "解析が完了しました！" })
    } catch (error) {
      console.error("[v0] Upload error:", error)
      setMessage({ type: "error", text: error instanceof Error ? error.message : "アップロードに失敗しました" })
      setProgress(0)
      setUploadState("idle")
    }
  }

  const handleBackToDashboard = () => {
    router.refresh()
  }

  const bothImagesUploaded = luggageFile && toolBagFile
  const isProcessing = uploadState === "uploading" || uploadState === "analyzing"

  if (analysisResult) {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            解析結果
          </CardTitle>
          <CardDescription>AIによる第一印象スコアと評価コメント</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">総合スコア</p>
            </div>
            <p className="text-5xl font-bold text-primary mb-1">{analysisResult.averageScore}</p>
            <p className="text-sm text-muted-foreground">点</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">ラゲッジスペース</h3>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">スコア</span>
                <span className="text-xl font-bold text-primary">{analysisResult.luggageScore}点</span>
              </div>
              {luggagePreview && (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                  <img
                    src={luggagePreview || "/placeholder.svg"}
                    alt="ラゲッジスペース"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{analysisResult.luggageAnalysis}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">ツールバッグ</h3>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">スコア</span>
                <span className="text-xl font-bold text-primary">{analysisResult.toolBagScore}点</span>
              </div>
              {toolBagPreview && (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                  <img
                    src={toolBagPreview || "/placeholder.svg"}
                    alt="ツールバッグ"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                {analysisResult.toolBagAnalysis.includes("適切な画像ではありません") ? (
                  <Alert variant="destructive" className="p-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">{analysisResult.toolBagAnalysis}</AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{analysisResult.toolBagAnalysis}</p>
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleBackToDashboard} className="w-full">
            ダッシュボードに戻る
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          今月の画像をアップロード
        </CardTitle>
        <CardDescription>ラゲッジスペースとツールバッグの写真を2枚アップロードしてください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <Label htmlFor="luggage-image" className="font-semibold">
                ラゲッジスペース
              </Label>
              {luggageFile && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
            <Input
              id="luggage-image"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "luggage")}
              disabled={isProcessing}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">車のラゲッジスペースの整理状態を撮影</p>
            {luggagePreview && (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                <img
                  src={luggagePreview || "/placeholder.svg"}
                  alt="ラゲッジスペースプレビュー"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <Label htmlFor="toolbag-image" className="font-semibold">
                ツールバッグ
              </Label>
              {toolBagFile && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
            <Input
              id="toolbag-image"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "toolbag")}
              disabled={isProcessing}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">ツールバッグの中身や整理状態を撮影</p>
            {toolBagPreview && (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                <img
                  src={toolBagPreview || "/placeholder.svg"}
                  alt="ツールバッグプレビュー"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="space-y-3 p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-center gap-3">
              {uploadState === "uploading" && (
                <>
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <p className="text-sm font-medium text-primary">画像をアップロード中...</p>
                </>
              )}
              {uploadState === "analyzing" && (
                <>
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <p className="text-sm font-medium text-primary">AIが画像を解析中...</p>
                </>
              )}
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {uploadState === "uploading"
                ? "画像を圧縮してサーバーに送信しています"
                : "第一印象スコアを計算しています"}
            </p>
          </div>
        )}

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {bothImagesUploaded ? "2枚の画像が選択されました" : `${luggageFile ? 1 : 0}/2枚選択済み`}
          </p>
          <Button onClick={handleUpload} disabled={!bothImagesUploaded || isProcessing} className="w-full sm:w-auto">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                画像をアップロード
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
