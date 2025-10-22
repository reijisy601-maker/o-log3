import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type UserRecord = {
  id: string
  email: string
  display_name: string | null
  department: string | null
  admin_notes: string | null
  role: string
  created_at: string
}

type SubmissionRecord = {
  user_id: string
  ai_score: number | null
  created_at: string
}

type SubmissionDateRecord = {
  user_id: string
  created_at: string
}

function getThreeMonthWindowStartISO() {
  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))
  return windowStart.toISOString()
}

function buildUserResponse(
  user: UserRecord,
  averages: Map<string, number>,
  lastSubmissionDates: Map<string, string>
) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    department: user.department ?? null,
    admin_notes: user.admin_notes ?? null,
    avg_score_3months: averages.get(user.id) ?? null,
    last_submission_date: lastSubmissionDates.get(user.id) ?? null,
    role: user.role,
    created_at: user.created_at,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Failed to load admin profile:', profileError)
      return NextResponse.json({ error: '権限確認に失敗しました' }, { status: 500 })
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみアクセス可能です' }, { status: 403 })
    }

    const adminClient = createServiceRoleClient()

    const { data: usersData, error: usersError } = await adminClient
      .from('user_profiles')
      .select('id, email, display_name, department, admin_notes, role, created_at')
      .order('created_at', { ascending: true })

    if (usersError) {
      console.error('Failed to load user profiles:', usersError)
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }

    const averages = new Map<string, number>()
    const lastSubmissionDates = new Map<string, string>()

    if (usersData && usersData.length > 0) {
      const threeMonthStartISO = getThreeMonthWindowStartISO()

      const { data: recentSubmissions, error: recentError } = await adminClient
        .from('submissions')
        .select('user_id, ai_score, created_at')
        .gte('created_at', threeMonthStartISO)

      if (recentError) {
        console.error('Failed to load recent submissions:', recentError)
        return NextResponse.json({ error: '提出情報の取得に失敗しました' }, { status: 500 })
      }

      if (recentSubmissions) {
        const aggregates = new Map<string, { total: number; count: number }>()

        for (const submission of recentSubmissions as SubmissionRecord[]) {
          if (!submission.user_id || typeof submission.ai_score !== 'number') {
            continue
          }

          const current = aggregates.get(submission.user_id) ?? { total: 0, count: 0 }
          current.total += submission.ai_score
          current.count += 1
          aggregates.set(submission.user_id, current)
        }

        for (const [userId, aggregate] of aggregates.entries()) {
          if (aggregate.count > 0) {
            averages.set(userId, Number((aggregate.total / aggregate.count).toFixed(1)))
          }
        }
      }

      const dynamicLimit = Math.max(usersData.length * 12, 200)

      const { data: latestSubmissions, error: latestError } = await adminClient
        .from('submissions')
        .select('user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(dynamicLimit)

      if (latestError) {
        console.error('Failed to load latest submissions:', latestError)
        return NextResponse.json({ error: '提出情報の取得に失敗しました' }, { status: 500 })
      }

      if (latestSubmissions) {
        for (const record of latestSubmissions as SubmissionDateRecord[]) {
          if (!record.user_id || !record.created_at) {
            continue
          }

          if (!lastSubmissionDates.has(record.user_id)) {
            lastSubmissionDates.set(record.user_id, record.created_at)
          }

          if (lastSubmissionDates.size === usersData.length) {
            break
          }
        }
      }

      if (lastSubmissionDates.size !== usersData.length) {
        const missingUserIds = usersData
          .filter((userRecord) => !lastSubmissionDates.has(userRecord.id))
          .map((userRecord) => userRecord.id)

        for (const userId of missingUserIds) {
          const { data: userLast, error: userLastError } = await adminClient
            .from('submissions')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)

          if (userLastError) {
            console.error(`Failed to load last submission for user ${userId}:`, userLastError)
            continue
          }

          if (userLast && userLast.length > 0) {
            const [latest] = userLast as SubmissionDateRecord[]
            if (latest?.created_at) {
              lastSubmissionDates.set(userId, latest.created_at)
            }
          }
        }
      }
    }

    const users = (usersData as UserRecord[] | null | undefined)?.map((userRecord) =>
      buildUserResponse(userRecord, averages, lastSubmissionDates)
    )

    return NextResponse.json({ users: users ?? [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/users:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
