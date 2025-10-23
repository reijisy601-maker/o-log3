import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const imageType = formData.get('type') as string | null

    if (!file || !imageType) {
      return NextResponse.json({ error: 'ファイルと種別が必要です' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
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

    console.log(`[upload] Uploading ${imageType} image:`, fileName)

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('[upload] Upload error:', uploadError)
      throw uploadError
    }

    const { data } = supabase.storage.from('submissions').getPublicUrl(fileName)

    console.log('[upload] Public URL:', data.publicUrl)

    return NextResponse.json({
      url: data.publicUrl,
      path: fileName,
    })
  } catch (error) {
    console.error('[upload] Error:', error)
    return NextResponse.json(
      {
        error: 'アップロードに失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
