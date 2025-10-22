'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

const SCORE_DISTRIBUTION_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

const TOP_BADGE_CLASSES = ['bg-amber-500/90 text-white', 'bg-slate-800/90 text-white', 'bg-slate-500/90 text-white']

const FALLBACK_TOP_CLASS = 'bg-indigo-500/80 text-white'

const LOW_SUBMISSION_BADGE_CLASS = 'bg-rose-500/90 text-white'

const cardValueClass = 'text-3xl font-bold text-slate-800'

type StatsResponse = {
  overall: {
    avg_score_3months: number | null
    total_users: number
    total_submissions: number
    active_users_3months: number
  }
  monthly_submissions: Array<{ year_month: string; count: number }>
  score_distribution: {
    excellent: number
    good: number
    fair: number
    needs_improvement: number
  }
  monthly_avg_scores: Array<{ year_month: string; avg_score: number | null }>
  top_performers: Array<{
    id: string
    display_name: string
    department: string | null
    avg_score: number
  }>
  low_submission_users: Array<{
    id: string
    display_name: string
    department: string | null
    submission_count_3months: number
  }>
}

export default function StatsTab() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    void loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error ?? '統計情報の取得に失敗しました')
      }

      const data = (await response.json()) as StatsResponse
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await loadStats()
    } finally {
      setRefreshing(false)
    }
  }

  const pieChartData = useMemo(() => {
    if (!stats) return []
    const { score_distribution: distribution } = stats
    return [
      { name: '優秀 (90+)', value: distribution.excellent },
      { name: '良好 (80-89)', value: distribution.good },
      { name: '普通 (70-79)', value: distribution.fair },
      { name: '要改善 (<70)', value: distribution.needs_improvement },
    ]
  }, [stats])

  if (loading) {
    return (
      <div className="flex h-[460px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner className="size-6" />
          統計情報を読み込んでいます...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <Alert variant="destructive">
          <AlertTitle>統計情報の取得に失敗しました</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={handleRefresh}>
          再試行する
        </Button>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">全体統計サマリー</h2>
          <p className="text-sm text-slate-600">
            過去12ヶ月の提出状況とスコア推移を確認できます。
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn('mr-2 size-4', refreshing && 'animate-spin')} />
          更新
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">
              全体平均スコア（3ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cardValueClass}>
              {typeof stats.overall.avg_score_3months === 'number'
                ? stats.overall.avg_score_3months.toFixed(1)
                : '-'}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">総ユーザー数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cardValueClass}>{stats.overall.total_users}</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">総提出数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cardValueClass}>{stats.overall.total_submissions}</div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">
              アクティブユーザー（3ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cardValueClass}>{stats.overall.active_users_3months}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>月別提出数</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthly_submissions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year_month" stroke="#0f172a" />
              <YAxis stroke="#0f172a" allowDecimals={false} />
              <RechartsTooltip
                formatter={(value: number) => [`${value} 件`, '提出数']}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>スコア分布</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell
                    key={`score-distribution-${entry.name}`}
                    fill={SCORE_DISTRIBUTION_COLORS[index % SCORE_DISTRIBUTION_COLORS.length]}
                  />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: number, name: string) => [`${value} 件`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>月別平均スコア推移</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.monthly_avg_scores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year_month" stroke="#0f172a" />
              <YAxis stroke="#0f172a" domain={[0, 100]} />
              <RechartsTooltip
                formatter={(value: number | null) =>
                  typeof value === 'number' ? [`${value.toFixed(1)} 点`, '平均スコア'] : ['-', '平均スコア']
                }
              />
              <Line
                type="monotone"
                dataKey="avg_score"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>🏆 トップパフォーマー（過去3ヶ月）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.top_performers.length === 0 ? (
              <p className="text-sm text-muted-foreground">データがありません。</p>
            ) : (
              stats.top_performers.map((performer, index) => (
                <div
                  key={performer.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span>#{index + 1}</span>
                      <span>{performer.display_name}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {performer.department ?? '所属未設定'}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      'px-3 py-1 text-xs font-semibold',
                      TOP_BADGE_CLASSES[index] ?? FALLBACK_TOP_CLASS,
                    )}
                  >
                    {performer.avg_score.toFixed(1)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>⚠️ 提出率が低いユーザー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.low_submission_users.length === 0 ? (
              <p className="text-sm text-muted-foreground">注意が必要なユーザーはいません。</p>
            ) : (
              stats.low_submission_users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
                >
                  <div className="text-sm font-medium text-slate-800">
                    <div>{user.display_name}</div>
                    <div className="text-xs text-slate-500">{user.department ?? '所属未設定'}</div>
                  </div>
                  <Badge className={cn('px-3 py-1 text-xs font-semibold', LOW_SUBMISSION_BADGE_CLASS)}>
                    {user.submission_count_3months} 回
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
