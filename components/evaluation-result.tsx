'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EvaluationResultProps {
  open: boolean
  onClose: () => void
  totalScore: number
  luggageScore: number
  luggageComment: string
  toolboxScore: number
  toolboxComment: string
}

export function EvaluationResult({
  open,
  onClose,
  totalScore,
  luggageScore,
  luggageComment,
  toolboxScore,
  toolboxComment,
}: EvaluationResultProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">🎉 評価完了！</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">総合スコア</p>
            <div className="text-6xl font-bold text-blue-600">
              {totalScore}
              <span className="text-3xl">点</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">🚗 荷台</span>
                <span className="text-xl font-bold text-blue-600">{luggageScore}点</span>
              </div>
              <p className="text-sm text-gray-700">{luggageComment}</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">🔧 道具収納</span>
                <span className="text-xl font-bold text-green-600">{toolboxScore}点</span>
              </div>
              <p className="text-sm text-gray-700">{toolboxComment}</p>
            </div>
          </div>

          <Button onClick={onClose} className="w-full h-12 text-base">
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
