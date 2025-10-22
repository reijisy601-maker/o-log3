'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Submission {
  id: string
  year_month: string
  ai_score: number
  ai_feedback: {
    luggage: { score: number; comment: string }
    toolbox: { score: number; comment: string }
  }
  created_at: string
}

interface SubmissionHistoryProps {
  submissions: Submission[]
}

export function SubmissionHistory({ submissions }: SubmissionHistoryProps) {
  const [expanded, setExpanded] = useState(false)

  if (!submissions.length) {
    return null
  }

  const displaySubmissions = expanded ? submissions : submissions.slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📊 過去の評価結果</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displaySubmissions.map((submission) => (
          <div key={submission.id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                {new Date(`${submission.year_month}-01`).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                })}
              </span>
              <span className="text-2xl font-bold text-blue-600">{submission.ai_score}点</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                🚗 荷台: {submission.ai_feedback.luggage.score}点 - {submission.ai_feedback.luggage.comment}
              </p>
              <p>
                🔧 道具: {submission.ai_feedback.toolbox.score}点 - {submission.ai_feedback.toolbox.comment}
              </p>
            </div>
          </div>
        ))}

        {submissions.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            {expanded ? (
              <>
                閉じる <ChevronUp size={16} />
              </>
            ) : (
              <>
                もっと見る <ChevronDown size={16} />
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
