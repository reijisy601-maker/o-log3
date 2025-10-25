import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    console.log('=== Auth Callback 開始 (クロスデバイス対応版) ===')
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (isDevelopment) {
    console.log('受信パラメータ:', {
      code: code ? `あり (${code.substring(0, 10)}...)` : 'なし',
      error,
      errorDescription,
    })
    console.log('User-Agent:', request.headers.get('user-agent'))
    console.log('Origin:', requestUrl.origin)
  }

  if (error) {
    console.error('認証エラー:', error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${error}&message=${encodeURIComponent(errorDescription || '')}`
    )
  }

  if (!code) {
    console.error('認証コードが見つかりません')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
  }

  try {
    const supabase = await createClient()
    const adminClient = createServiceRoleClient()

    if (isDevelopment) {
      console.log('セッション確立試行...')
    }

    // セッションを確立（PKCEフローに対応）
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('セッション確立エラー:', sessionError)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=session_error&message=${encodeURIComponent(sessionError.message)}`
      )
    }

    if (!data.session) {
      console.error('セッションが作成されませんでした')
      return NextResponse.redirect(`${requestUrl.origin}/login?error=no_session`)
    }

    const { session, user } = data

    if (isDevelopment) {
      console.log('✅ セッション確立成功')
      console.log('ユーザーID:', user.id)
      console.log('メール:', user.email)
      console.log('Access Token (先頭):', session.access_token.substring(0, 20) + '...')
    }

    if (isDevelopment) {
      console.log('=== ロール確認 ===')
    }

    // プロフィール取得
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('プロフィール取得エラー:', profileError)
    }

    if (isDevelopment) {
      console.log('プロフィール:', profile)
    }

    let redirectPath = '/dashboard'

    if (profile?.role === 'admin') {
      redirectPath = '/admin'
      if (isDevelopment) {
        console.log('✅ 管理者としてリダイレクト: /admin')
      }
    } else {
      if (isDevelopment) {
        console.log('✅ 一般ユーザーとしてリダイレクト: /dashboard')
      }
    }

    // プロフィールが存在しない場合は自動作成
    if (!profile) {
      if (isDevelopment) {
        console.log('⚠️ user_profilesレコードが存在しません。自動作成します...')
      }

      const { error: insertError } = await adminClient
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.email?.split('@')[0] || 'User',
          role: 'user',
        })

      if (insertError) {
        console.error('user_profiles自動作成エラー:', insertError)
      } else {
        if (isDevelopment) {
          console.log('✅ user_profilesレコード自動作成成功')
        }
      }

      redirectPath = '/dashboard'
    }

    if (isDevelopment) {
      console.log(`リダイレクト先: ${redirectPath}`)
    }

    // @supabase/ssr が自動的に Cookie を設定するため、NextResponse でリダイレクト
    return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
  } catch (error) {
    console.error('予期しないエラー:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=unexpected&message=${encodeURIComponent('予期しないエラーが発生しました')}`
    )
  }
}
