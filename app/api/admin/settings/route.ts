import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type AdminCheckResult =
  | { status: 200; user: { id: string } }
  | { status: 401 | 403 | 500; error: string }

type SettingsPayload = {
  allowed_domains?: string[]
  registration_code?: string
}

const SECURITY_SETTINGS_ID = 1
const DOMAIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/

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

function validatePayload(payload: SettingsPayload) {
  if (payload.allowed_domains) {
    if (!Array.isArray(payload.allowed_domains)) {
      return 'allowed_domains must be an array'
    }

    for (const domain of payload.allowed_domains) {
      if (typeof domain !== 'string' || !DOMAIN_REGEX.test(domain)) {
        return `Invalid domain format: ${domain}`
      }
    }
  }

  if (payload.registration_code !== undefined) {
    if (typeof payload.registration_code !== 'string' || payload.registration_code.trim().length < 4) {
      return 'Registration code must be at least 4 characters'
    }
  }

  return null
}

export async function GET() {
  const adminCheck = await ensureAdmin()

  if (adminCheck.status !== 200) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const adminClient = createServiceRoleClient()
    const { data, error } = await adminClient
      .from('security_settings')
      .select('allowed_domains, registration_code, updated_at')
      .eq('id', SECURITY_SETTINGS_ID)
      .single()

    if (error) {
      console.error('Failed to load security settings:', error)
      return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        allowed_domains: [],
        registration_code: '',
        updated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      allowed_domains: (data.allowed_domains as string[]) ?? [],
      registration_code: (data.registration_code as string) ?? '',
      updated_at: data.updated_at as string,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/settings:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const adminCheck = await ensureAdmin()

  if (adminCheck.status !== 200) {
    return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status })
  }

  let payload: SettingsPayload

  try {
    payload = (await request.json()) as SettingsPayload
  } catch (error) {
    console.error('Invalid JSON payload for settings:', error)
    return NextResponse.json({ success: false, error: '無効なリクエスト形式です' }, { status: 400 })
  }

  const validationError = validatePayload(payload)

  if (validationError) {
    return NextResponse.json({ success: false, error: validationError }, { status: 400 })
  }

  if (payload.allowed_domains === undefined && payload.registration_code === undefined) {
    return NextResponse.json({ success: false, error: '更新対象が指定されていません' }, { status: 400 })
  }

  try {
    const adminClient = createServiceRoleClient()

    const updatePayload: SettingsPayload & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    }

    if (payload.allowed_domains !== undefined) {
      updatePayload.allowed_domains = payload.allowed_domains
    }

    if (payload.registration_code !== undefined) {
      updatePayload.registration_code = payload.registration_code.trim()
    }

    const { data, error } = await adminClient
      .from('security_settings')
      .update(updatePayload)
      .eq('id', SECURITY_SETTINGS_ID)
      .select('allowed_domains, registration_code, updated_at')
      .single()

    if (error) {
      console.error('Failed to update security settings:', error)
      return NextResponse.json({ success: false, error: '設定の更新に失敗しました' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: '設定が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        allowed_domains: (data.allowed_domains as string[]) ?? [],
        registration_code: (data.registration_code as string) ?? '',
        updated_at: data.updated_at as string,
      },
    })
  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/settings:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
