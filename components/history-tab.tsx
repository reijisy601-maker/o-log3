'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, Calendar } from 'lucide-react'

type SubmissionFeedbackEntry = {
  score?: number
  comment?: string
}

type SubmissionFeedback = Record<string, SubmissionFeedbackEntry>

interface Submission {
  id: string
  year_month: string | null
  luggage_image_url: string
  toolbox_image_url: string
  ai_score: number
  ai_feedback?: SubmissionFeedback
  created_at: string | null
}

interface StatsSummary {
  recentAverage: number | null
  totalCount: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isSubmissionRecord = (value: unknown): value is Submission => {
  if (!isRecord(value)) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    typeof record.id !== 'string' ||
    typeof record.luggage_image_url !== 'string' ||
    typeof record.toolbox_image_url !== 'string' ||
    typeof record.ai_score !== 'number'
  ) {
    return false
  }

  const createdAt = record.created_at
  const yearMonth = record.year_month
  const feedback = record.ai_feedback

  const isValidDateField =
    createdAt === null || createdAt === undefined || typeof createdAt === 'string'
  const isValidYearMonth =
    yearMonth === null || yearMonth === undefined || typeof yearMonth === 'string'
  const isValidFeedback = feedback === undefined || isRecord(feedback)

  return isValidDateField && isValidYearMonth && isValidFeedback
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return ''
}

export default function HistoryTab({ refreshTrigger }: { refreshTrigger: number }) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<StatsSummary>({ recentAverage: null, totalCount: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchHistory()
  }, [refreshTrigger])

  const fetchHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/submissions')
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        const payloadRecord = isRecord(payload) ? payload : null
        const payloadError =
          payloadRecord && typeof payloadRecord.error === 'string' ? payloadRecord.error : null
        throw new Error(payloadError ?? '履歴の取得に失敗しました')
      }

      if (!isRecord(payload) || !Array.isArray(payload.submissions)) {
        throw new Error('履歴の取得に失敗しました')
      }

      const submissionsData = (payload.submissions as unknown[]).filter(isSubmissionRecord)

      const records: Submission[] = submissionsData
        .map((entry) => ({
          ...entry,
          ai_feedback: entry.ai_feedback ?? {},
        }))
        .sort((a, b) => {
          const aDate = new Date(a.created_at ?? `${a.year_month ?? '1970-01'}-01`).getTime()
          const bDate = new Date(b.created_at ?? `${b.year_month ?? '1970-01'}-01`).getTime()
          return bDate - aDate
        })

      setSubmissions(records)
      updateStats(records)
    } catch (err: unknown) {
      console.error('[history] fetch error:', err)
      setError(getErrorMessage(err) || '履歴の読み込み中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStats = (records: Submission[]) => {
    if (!records.length) {
      setStats({ recentAverage: null, totalCount: 0 })
      return
    }

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const recent = records.filter((record) => {
      const entryDate = record.created_at
        ? new Date(record.created_at)
        : new Date(`${record.year_month ?? '1970-01'}-01`)
      return entryDate >= threeMonthsAgo
    })

    const recentAverage = recent.length
      ? Math.round(recent.reduce((total, entry) => total + Number(entry.ai_score || 0), 0) / recent.length)
      : null

    setStats({ recentAverage, totalCount: records.length })
  }

  const formatDate = (record: Submission) => {
    if (record.created_at) {
      return new Date(record.created_at).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    if (record.year_month) {
      const [year, month] = record.year_month.split('-')
      return `${year}年${month}月`
    }

    return '日時不明'
  }

  const getScoreStyle = (score: number) => {
    if (score >= 80) return 'border-green-200 bg-green-50 text-green-600'
    if (score >= 60) return 'border-blue-200 bg-blue-50 text-blue-600'
    if (score >= 40) return 'border-yellow-200 bg-yellow-50 text-yellow-600'
    return 'border-red-200 bg-red-50 text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '優秀'
    if (score >= 60) return '良好'
    if (score >= 40) return '改善必要'
    return '要改善'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              過去3ヶ月平均
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentAverage !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-gray-900">{stats.recentAverage}</span>
                <span className="text-lg text-gray-500">点</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">データなし</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <Calendar className="h-4 w-4" />
              </div>
              総記録回数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-gray-900">{stats.totalCount}</span>
              <span className="text-lg text-gray-500">回</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card className="rounded-2xl border border-gray-200 bg-white text-center shadow-sm">
            <CardContent className="space-y-4 py-16">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <p className="text-base font-medium text-gray-700">まだ記録がありません</p>
                <p className="text-sm text-gray-500">「評価」タブから最初の記録を作成しましょう</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => {
            const luggageComment = submission.ai_feedback?.luggage?.comment ?? 'コメントはありません'
            const toolboxComment = submission.ai_feedback?.toolbox?.comment ?? 'コメントはありません'

            return (
              <Card key={submission.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <CardContent className="space-y-4 py-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-gray-400">提出日時</p>
                      <p className="text-sm font-medium text-gray-700">{formatDate(submission)}</p>
                    </div>
                    <div className={`flex flex-col rounded-lg border px-4 py-2 text-sm font-semibold ${getScoreStyle(submission.ai_score)}`}>
                      <span className="text-xs uppercase tracking-wide">総合スコア</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{submission.ai_score}</span>
                        <span className="text-xs">点 ({getScoreLabel(submission.ai_score)})</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold text-gray-600">荷物スペース</p>
                      <p className="mt-2 text-sm text-gray-700">{luggageComment}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        スコア: {submission.ai_feedback?.luggage?.score ?? 'N/A'} 点
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold text-gray-600">道具収納</p>
                      <p className="mt-2 text-sm text-gray-700">{toolboxComment}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        スコア: {submission.ai_feedback?.toolbox?.score ?? 'N/A'} 点
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="focus:outline-none"
                      onClick={() => window.open(submission.luggage_image_url, '_blank')}
                    >
                      <img
                        src={submission.luggage_image_url}
                        alt="車両の荷物スペース"
                        className="h-20 w-20 rounded-lg border border-gray-200 object-cover transition-colors hover:border-indigo-400 sm:h-24 sm:w-24"
                      />
                    </button>
                    <button
                      type="button"
                      className="focus:outline-none"
                      onClick={() => window.open(submission.toolbox_image_url, '_blank')}
                    >
                      <img
                        src={submission.toolbox_image_url}
                        alt="道具収納"
                        className="h-20 w-20 rounded-lg border border-gray-200 object-cover transition-colors hover:border-indigo-400 sm:h-24 sm:w-24"
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
