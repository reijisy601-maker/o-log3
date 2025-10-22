import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    console.log('=== Auth Callback 開始 ===')
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (isDevelopment) {
    console.log('受信パラメータ:', { code, error, errorDescription })
  }

  if (error) {
    console.error('認証エラー:', error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${error}&message=${errorDescription}`
    )
  }

  if (!code) {
    console.error('認証コードが見つかりません')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const adminClient = createServiceRoleClient()

  if (isDevelopment) {
    console.log('セッション確立試行...')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    console.error('セッション確立エラー:', sessionError)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=session_error&message=${sessionError.message}`
    )
  }

  if (!session) {
    console.error('セッションが作成されませんでした')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=no_session`)
  }

  if (isDevelopment) {
    console.log('✅ セッション確立成功')
    console.log('ユーザーID:', session.user.id)
    console.log('メール:', session.user.email)
  }

  if (isDevelopment) {
    console.log('=== ロール確認 ===')
  }
  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
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

  if (!profile) {
    if (isDevelopment) {
      console.log('⚠️ user_profilesレコードが存在しません。自動作成します...')
    }

    const { error: insertError } = await adminClient
      .from('user_profiles')
      .insert({
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.email?.split('@')[0] || 'User',
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
  return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
}
