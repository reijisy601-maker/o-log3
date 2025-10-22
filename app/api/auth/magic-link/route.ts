// app/api/auth/magic-link/route.ts - 修正版
// 問題修正: .single() → .maybeSingle() で既存ユーザーチェックを改善

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
const isDevelopment = process.env.NODE_ENV === 'development';

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}
  const log = (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  };

  log('=== Magic Link API 開始 ===');
  
  try {
    const body = await request.json();
    log('受信データ:', body);
    
    const { email, authCode } = body;
    
    log('メールアドレス:', email);
    log('認証コード:', authCode || '(なし)');

    if (!email) {
      console.error('エラー: メールアドレスが空');
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const supabaseAdmin = createServiceRoleClient();

    // security_settings取得
    log('=== security_settings取得試行 ===');
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('security_settings')
      .select('new_user_auth_code, allowed_domains')
      .single();

    if (settingsError) {
      console.error('security_settings取得エラー:', settingsError);
      return NextResponse.json(
        { error: 'セキュリティ設定の取得に失敗しました' },
        { status: 500 }
      );
    }

    log('security_settings取得成功:', settings);

    // 既存ユーザーチェック（修正: .maybeSingle()を使用）
    log('=== 既存ユーザーチェック ===');
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle(); // ← 修正点: single()からmaybeSingle()へ変更

    // エラーがあっても続行（クエリエラーの場合のみログ出力）
    if (profileError) {
      console.error('既存ユーザーチェックでクエリエラー:', profileError);
      // エラーがあっても新規ユーザーとして扱うため続行
    }

    log('既存ユーザーチェック結果:', existingProfile);

    // 既存ユーザーが見つかった場合
    if (existingProfile) {
      log('✅ 既存ユーザー検出:', existingProfile.email);
      log('ロール:', existingProfile.role);
      log('認証コード不要でログイン用Magic Link送信');
      
      // 既存ユーザー: 認証コード不要でMagic Link送信
      const siteUrl = getSiteUrl();
      if (isDevelopment) {
        log('[Magic Link] Detected Site URL:', siteUrl);
        log('[Magic Link] Redirect URL:', `${siteUrl}/auth/callback`);
        log('[Magic Link] Environment:', process.env.VERCEL_ENV || 'local');
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          shouldCreateUser: false,
        },
      });

      if (signInError) {
        console.error('Magic Link送信エラー:', signInError);
        return NextResponse.json(
          { error: 'Magic Link送信に失敗しました' },
          { status: 500 }
        );
      }

      log('✅ ログイン用Magic Link送信成功');
      if (isDevelopment) {
        log('⚠️ 開発環境: Magic Linkをメールから60秒以内に開いてください');
        log('メール送信先:', email);
      }

      return NextResponse.json({
        message: 'ログイン用Magic Linkを送信しました',
        isExistingUser: true,
      });
    }

    // existingProfile が null = 新規ユーザー
    log('=== 新規ユーザー登録フロー ===');

    // 新規ユーザーは認証コード必須
    if (!authCode) {
      console.error('エラー: 新規登録には認証コードが必要');
      return NextResponse.json(
        { error: '新規登録には認証コードが必要です' },
        { status: 400 }
      );
    }

    log('認証コード検証中...');

    // 認証コード検証
    if (settings.new_user_auth_code !== authCode) {
      console.error('エラー: 認証コードが不一致');
      log('期待値:', settings.new_user_auth_code);
      log('実際:', authCode);
      return NextResponse.json(
        { error: '認証コードが正しくありません' },
        { status: 403 }
      );
    }

    log('✅ 認証コード検証成功');

    // ドメイン検証
    log('=== ドメイン検証 ===');
    const emailDomain = email.split('@')[1];
    log('メールドメイン:', emailDomain);
    log('許可ドメイン:', settings.allowed_domains);

    if (!settings.allowed_domains.includes(emailDomain)) {
      console.error('エラー: ドメインが許可リストにない');
      return NextResponse.json(
        { error: '許可されていないドメインです' },
        { status: 403 }
      );
    }

    log('✅ ドメイン検証成功');

    // 新規登録用Magic Link送信
    log('=== 新規登録用Magic Link送信 ===');
    const siteUrl = getSiteUrl();
    if (isDevelopment) {
      log('[Magic Link] Detected Site URL:', siteUrl);
      log('[Magic Link] Redirect URL:', `${siteUrl}/auth/callback`);
      log('[Magic Link] Environment:', process.env.VERCEL_ENV || 'local');
    }

    const { error: signUpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        shouldCreateUser: true,
        data: {
          is_new_user: true,
        },
      },
    });

    if (signUpError) {
      console.error('Magic Link送信エラー:', signUpError);
      return NextResponse.json(
        { error: 'Magic Link送信に失敗しました' },
        { status: 500 }
      );
    }

    log('✅ 新規登録用Magic Link送信成功');
    return NextResponse.json({
      message: '新規登録用Magic Linkを送信しました',
      isExistingUser: false
    });

  } catch (error) {
    console.error('=== 予期しないエラー ===');
    console.error('エラー詳細:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
