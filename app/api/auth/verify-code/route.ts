import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    console.log('[verify-code] Received code:', code)

    if (!code || code.length !== 4) {
      console.log('[verify-code] Invalid code length')
      return NextResponse.json(
        { valid: false, error: '4桁の認証コードを入力してください' },
        { status: 400 }
      )
    }

    console.log('[verify-code] Creating Supabase client...')
    const supabase = await createClient()

    console.log('[verify-code] Querying security_settings...')
    const { data, error } = await supabase
      .from('security_settings')
      .select('registration_code')
      .eq('id', 1)
      .single()

    console.log('[verify-code] Query result:', { data, error })

    if (error) {
      console.error('[verify-code] Database error:', error)
      return NextResponse.json(
        { valid: false, error: `データベースエラー: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('[verify-code] No data returned')
      return NextResponse.json(
        { valid: false, error: '認証コード設定が見つかりません' },
        { status: 500 }
      )
    }

    const isValid = data.registration_code === code
    console.log('[verify-code] Validation result:', {
      expected: data.registration_code,
      received: code,
      isValid,
    })

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error('[verify-code] Unexpected error:', error)
    return NextResponse.json(
      {
        valid: false,
        error: `サーバーエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      },
      { status: 500 }
    )
  }
}
