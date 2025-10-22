import { NextResponse } from 'next/server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'

type AdminCheckResult =
  | { status: 200; user: { id: string } }
  | { status: 401 | 403 | 500; error: string }

async function ensureAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { status: 401, error: '認証が必要です' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Failed to fetch admin profile:', profileError)
    return { status: 500, error: '権限確認に失敗しました' }
  }

  if (!profile || profile.role !== 'admin') {
    return { status: 403, error: '管理者のみアクセス可能です' }
  }

  return { status: 200, user: { id: user.id } }
}

function getPastYearMonthKeys(monthCount: number) {
  const now = new Date()
  const keys: string[] = []

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, '0')}`
    keys.push(key)
  }

  return keys
}

function bucketScore(score: number | null | undefined) {
  if (typeof score !== 'number') {
    return null
  }

  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 70) return 'fair'
  return 'needs_improvement'
}

export async function GET() {
  const adminCheck = await ensureAdmin()

  if (adminCheck.status !== 200) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const adminClient = createServiceRoleClient()
    const now = new Date()
    const threeMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))
    const twelveMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))

    const twelveMonthStartISO = twelveMonthsAgo.toISOString()
    const nowISO = now.toISOString()

    const baseMonthKeys = getPastYearMonthKeys(12)

    const [
      usersResult,
      totalSubmissionsHead,
      submissionsLastYearResult,
    ] = await Promise.all([
      adminClient
        .from('user_profiles')
        .select('id, display_name, department', { count: 'exact' }),
      adminClient
        .from('submissions')
        .select('id', { count: 'exact', head: true }),
      adminClient
        .from('submissions')
        .select('user_id, ai_score, created_at, year_month')
        .gte('created_at', twelveMonthStartISO)
        .lte('created_at', nowISO),
    ])

    if (usersResult.error) {
      console.error('Failed to load user profiles:', usersResult.error)
      return NextResponse.json({ error: '統計情報の取得に失敗しました' }, { status: 500 })
    }

    if (totalSubmissionsHead.error) {
      console.error('Failed to count submissions:', totalSubmissionsHead.error)
      return NextResponse.json({ error: '統計情報の取得に失敗しました' }, { status: 500 })
    }

    if (submissionsLastYearResult.error) {
      console.error('Failed to load submissions:', submissionsLastYearResult.error)
      return NextResponse.json({ error: '統計情報の取得に失敗しました' }, { status: 500 })
    }

    const usersData = usersResult.data ?? []
    const totalUsers = usersResult.count ?? usersData.length
    const totalSubmissions = totalSubmissionsHead.count ?? 0

    const submissionsLastYear = (submissionsLastYearResult.data ?? []).map((item) => ({
      user_id: item.user_id as string,
      ai_score: typeof item.ai_score === 'number' ? item.ai_score : null,
      created_at: item.created_at as string,
      year_month: (item.year_month as string | null) ?? null,
    }))

    const submissionsLastThreeMonths = submissionsLastYear.filter((submission) => {
      const createdAt = new Date(submission.created_at)
      return createdAt >= threeMonthsAgo
    })

    const scoreDistribution = { excellent: 0, good: 0, fair: 0, needs_improvement: 0 }
    let scoreSumThreeMonths = 0
    let scoreCountThreeMonths = 0
    const userScoreAggregates = new Map<string, { total: number; count: number }>()
    const submissionCountsThreeMonths = new Map<string, number>()

    for (const submission of submissionsLastThreeMonths) {
      const bucket = bucketScore(submission.ai_score)
      if (bucket) {
        scoreDistribution[bucket] += 1
        scoreSumThreeMonths += submission.ai_score ?? 0
        scoreCountThreeMonths += 1

        const aggregate = userScoreAggregates.get(submission.user_id) ?? { total: 0, count: 0 }
        aggregate.total += submission.ai_score ?? 0
        aggregate.count += 1
        userScoreAggregates.set(submission.user_id, aggregate)
      }

      submissionCountsThreeMonths.set(
        submission.user_id,
        (submissionCountsThreeMonths.get(submission.user_id) ?? 0) + 1
      )
    }

    const avgScoreThreeMonths = scoreCountThreeMonths > 0
      ? Number((scoreSumThreeMonths / scoreCountThreeMonths).toFixed(1))
      : null

    const monthlySubmissionMap = new Map<string, number>()
    const monthlyAverageMap = new Map<string, { total: number; count: number }>()

    for (const submission of submissionsLastYear) {
      const monthKey = submission.year_month
        ?? (() => {
          const createdAt = new Date(submission.created_at)
          return `${createdAt.getUTCFullYear()}-${`${createdAt.getUTCMonth() + 1}`.padStart(2, '0')}`
        })()

      monthlySubmissionMap.set(
        monthKey,
        (monthlySubmissionMap.get(monthKey) ?? 0) + 1
      )

      if (typeof submission.ai_score === 'number') {
        const aggregate = monthlyAverageMap.get(monthKey) ?? { total: 0, count: 0 }
        aggregate.total += submission.ai_score
        aggregate.count += 1
        monthlyAverageMap.set(monthKey, aggregate)
      }
    }

    const monthlySubmissions = baseMonthKeys.map((key) => ({
      year_month: key,
      count: monthlySubmissionMap.get(key) ?? 0,
    }))

    const monthlyAvgScores = baseMonthKeys.map((key) => {
      const aggregate = monthlyAverageMap.get(key)
      return {
        year_month: key,
        avg_score:
          aggregate && aggregate.count > 0
            ? Number((aggregate.total / aggregate.count).toFixed(1))
            : null,
      }
    })

    const topPerformers = Array.from(userScoreAggregates.entries())
      .map(([userId, aggregate]) => ({
        id: userId,
        avg_score: aggregate.count > 0 ? aggregate.total / aggregate.count : null,
      }))
      .filter((performer) => performer.avg_score !== null)
      .map((performer) => ({
        ...performer,
        avg_score: Number((performer.avg_score as number).toFixed(1)),
        display_name:
          usersData.find((user) => user.id === performer.id)?.display_name ?? '名無しユーザー',
        department:
          usersData.find((user) => user.id === performer.id)?.department ?? null,
      }))
      .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0))
      .slice(0, 5)

    const lowSubmissionUsers = usersData
      .map((user) => ({
        id: user.id,
        display_name: user.display_name ?? '名無しユーザー',
        department: user.department ?? null,
        submission_count_3months: submissionCountsThreeMonths.get(user.id) ?? 0,
      }))
      .filter((user) => user.submission_count_3months <= 1)
      .sort((a, b) => a.submission_count_3months - b.submission_count_3months)

    const responsePayload = {
      overall: {
        avg_score_3months: avgScoreThreeMonths,
        total_users: totalUsers,
        total_submissions: totalSubmissions,
        active_users_3months: submissionCountsThreeMonths.size,
      },
      monthly_submissions: monthlySubmissions,
      score_distribution: scoreDistribution,
      monthly_avg_scores: monthlyAvgScores,
      top_performers: topPerformers,
      low_submission_users: lowSubmissionUsers,
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/stats:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
