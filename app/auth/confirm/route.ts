import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (isDevelopment) {
    console.log('=== Magic Link Confirm 開始 ===')
    console.log('token_hash:', token_hash ? `あり (${token_hash.substring(0, 10)}...)` : 'なし')
    console.log('type:', type)
    console.log('next:', next)
  }

  if (!token_hash || !type) {
    console.error('token_hash または type が見つかりません')
    return NextResponse.redirect(`${requestUrl.origin}/login?error=invalid_link`)
  }

  try {
    const supabase = await createClient()

    // OTP検証（Magic Link）
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (error) {
      console.error('OTP検証エラー:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=verification_failed&message=${encodeURIComponent(error.message)}`
      )
    }

    if (!data.user) {
      console.error('ユーザーが取得できませんでした')
      return NextResponse.redirect(`${requestUrl.origin}/login?error=no_user`)
    }

    if (isDevelopment) {
      console.log('✅ OTP検証成功')
      console.log('ユーザーID:', data.user.id)
      console.log('メール:', data.user.email)
    }

    // プロフィール確認・作成
    const adminClient = createServiceRoleClient()
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('プロフィール取得エラー:', profileError)
    }

    let redirectPath = '/dashboard'

    // プロフィールが存在しない場合は自動作成
    if (!profile) {
      if (isDevelopment) {
        console.log('⚠️ user_profilesレコードが存在しません。自動作成します...')
      }

      const { error: insertError } = await adminClient
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.email?.split('@')[0] || 'User',
          role: 'user',
        })

      if (insertError) {
        console.error('user_profiles自動作成エラー:', insertError)
      } else {
        if (isDevelopment) {
          console.log('✅ user_profilesレコード自動作成成功')
        }
      }
    } else if (profile.role === 'admin') {
      redirectPath = '/admin'
    }

    if (isDevelopment) {
      console.log(`リダイレクト先: ${redirectPath}`)
    }

    return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
  } catch (error) {
    console.error('予期しないエラー:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=unexpected&message=${encodeURIComponent('予期しないエラーが発生しました')}`
    )
  }
}
