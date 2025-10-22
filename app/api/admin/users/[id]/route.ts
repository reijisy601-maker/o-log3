import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type UpdatePayload = {
  department?: string | null
  admin_notes?: string | null
}

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

function sanitizePayload(payload: UpdatePayload): UpdatePayload {
  const result: UpdatePayload = {}

  if (payload.department !== undefined) {
    result.department = payload.department === null ? null : payload.department.trim()
  }

  if (payload.admin_notes !== undefined) {
    result.admin_notes = payload.admin_notes === null ? null : payload.admin_notes.trim()
  }

  return result
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  const adminCheck = await ensureAdmin()

  if (adminCheck.status !== 200) {
    return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status })
  }

  const targetUserId = context.params?.id

  if (!targetUserId) {
    return NextResponse.json({ success: false, error: 'ユーザーIDが必要です' }, { status: 400 })
  }

  let body: UpdatePayload

  try {
    body = (await request.json()) as UpdatePayload
  } catch (error) {
    console.error('Invalid JSON payload:', error)
    return NextResponse.json({ success: false, error: '無効なリクエスト形式です' }, { status: 400 })
  }

  const sanitized = sanitizePayload(body)

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ success: false, error: '更新対象が指定されていません' }, { status: 400 })
  }

  try {
    const adminClient = createServiceRoleClient()

    const { data: existingUser, error: fetchError } = await adminClient
      .from('user_profiles')
      .select('id, email, display_name, role, department, admin_notes, updated_at')
      .eq('id', targetUserId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 404 })
      }

      console.error('Failed to fetch user before update:', fetchError)
      return NextResponse.json({ success: false, error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from('user_profiles')
      .update({
        ...sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select('id, email, display_name, role, department, admin_notes, updated_at')
      .single()

    if (updateError) {
      console.error('Failed to update user:', updateError)
      return NextResponse.json({ success: false, error: 'ユーザー情報の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Unexpected error updating user:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return PUT(request, context)
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const adminCheck = await ensureAdmin()

  if (adminCheck.status !== 200) {
    return NextResponse.json({ success: false, error: adminCheck.error }, { status: adminCheck.status })
  }

  const targetUserId = context.params?.id

  if (!targetUserId) {
    return NextResponse.json({ success: false, error: 'ユーザーIDが必要です' }, { status: 400 })
  }

  const actingAdminId = adminCheck.user.id

  if (actingAdminId === targetUserId) {
    return NextResponse.json(
      { success: false, error: '自身のアカウントは削除できません' },
      { status: 400 }
    )
  }

  try {
    const adminClient = createServiceRoleClient()

    const { data: targetUser, error: targetError } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('id', targetUserId)
      .single()

    if (targetError) {
      if (targetError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 404 })
      }

      console.error('Failed to fetch user before deletion:', targetError)
      return NextResponse.json({ success: false, error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const { error: deleteError } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', targetUserId)

    if (deleteError) {
      console.error('Failed to delete user:', deleteError)
      return NextResponse.json({ success: false, error: 'ユーザーの削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'ユーザーを削除しました' })
  } catch (error) {
    console.error('Unexpected error deleting user:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
