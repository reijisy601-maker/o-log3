import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const imageType = formData.get('type') as string | null

    if (!file || !imageType) {
      return NextResponse.json({ error: 'ファイルと種別が必要です' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      )
    }

    const yearMonth = new Date().toISOString().slice(0, 7)
    const fileExt = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${user.id}/${yearMonth}/${imageType}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json(
        { error: 'アップロードに失敗しました' },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('submissions').getPublicUrl(fileName)

    return NextResponse.json({
      url: publicUrl,
      path: data.path,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
