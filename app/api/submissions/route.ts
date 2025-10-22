import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
    }

    const submissions = (data ?? []).map((entry) => {
      let feedback = entry.ai_feedback
      if (typeof feedback === 'string') {
        try {
          feedback = JSON.parse(feedback)
        } catch (parseError) {
          console.warn('Failed to parse ai_feedback JSON:', parseError)
          feedback = null
        }
      }

      return {
        ...entry,
        ai_feedback: feedback,
      }
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log('=== /api/submissions POST開始 ===')

    const body = await request.json()
    console.log('受信データ:', JSON.stringify(body, null, 2))

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('認証エラー: ユーザーが見つかりません', authError)
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    console.log('ユーザーID:', user.id)

    const now = new Date()
    const yearMonth = now.toISOString().slice(0, 7)
    const aiFeedback = {
      luggage: {
        score: Number(body.luggageScore),
        comment: body.luggageComment,
      },
      toolbox: {
        score: Number(body.toolboxScore),
        comment: body.toolboxComment,
      },
    }

    const insertData = {
      user_id: user.id,
      email: user.email ?? null,
      year_month: yearMonth,
      luggage_image_url: body.luggageUrl ?? null,
      toolbox_image_url: body.toolboxUrl ?? null,
      luggage_score: body.luggageScore,
      toolbox_score: body.toolboxScore,
      luggage_feedback: body.luggageComment,
      toolbox_feedback: body.toolboxComment,
      ai_score: Math.round((Number(body.luggageScore) + Number(body.toolboxScore)) / 2),
      ai_feedback: JSON.stringify(aiFeedback),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    console.log('INSERT用データ:', JSON.stringify(insertData, null, 2))

    const { data, error } = await supabase
      .from('submissions')
      .upsert(insertData, { onConflict: 'user_id,year_month' })
      .select()
      .single()

    if (error) {
      console.error('=== INSERT エラー ===')
      console.error('エラーコード:', error.code)
      console.error('エラーメッセージ:', error.message)
      console.error('エラー詳細:', error.details)
      console.error('エラーヒント:', error.hint)

      return NextResponse.json(
        {
          error: 'Database insert failed',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    console.log('=== INSERT 成功 ===')
    console.log('作成されたレコード:', data)
    console.log('レコードID:', data?.id)

    return NextResponse.json({
      success: true,
      submission: data,
    })
  } catch (error) {
    console.error('=== /api/submissions エラー ===')
    console.error('エラー:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
