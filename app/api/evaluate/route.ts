import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const VERIFY_PROMPT = `画像を確認し、以下のどちらに該当するか判断してください。該当しない場合は isValid を false にしてください。

カテゴリ1: 車両の荷物収納スペース
- 車の荷台、トランク、ラゲッジスペース、カーゴスペース
- 業務用車両の荷物エリア（軽バン、ハイエース等）
- 車内の収納スペース全般

カテゴリ2: 道具収納
- 工具箱、ツールボックス、ツールトレイ
- 道具入れ、収納ケース、収納ボックス
- 作業道具の保管場所全般

次のJSONのみ返してください（他の文章は一切含めないでください）。
{"isValid": true, "category": "車両の荷物収納スペース", "reason": "判定理由（簡潔に）"}`

const EVALUATE_PROMPT = `画像の第一印象を評価してください。

評価基準:
1. 整理整頓度: 物の配置、分類、整列状態
2. 清潔感: 汚れや埃の有無、メンテナンス状態
3. お客様視点の第一印象: プロフェッショナルな印象を与えるか

スコア指南:
- 20-39点: 改善が急務
- 40-59点: 改善の余地が大きい
- 60-79点: 標準的だが改善可能
- 80-98点: 良好～優秀

コメント方針:
- 1-2文で簡潔に
- 具体的な評価ポイントや改善提案を含める
- ポジティブかつ建設的なトーンで

次のJSONのみ返してください（他の文章は一切含めないでください）。
{"score": 85, "comment": "収納ケースが整然と配置されており、清潔感もあります。"}`

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const extractJson = (input: string, label: string) => {
  if (!input || input.trim() === '') {
    console.error(`[evaluate] Empty response from OpenAI for ${label}`)
    return null
  }

  const jsonMatch = input.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error(`[evaluate] No JSON found in response for ${label}:`, input)
    return null
  }

  try {
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error(`[evaluate] Failed to parse ${label}:`, jsonMatch[0], error)
    return null
  }
}

const buildVerificationPrompt = (imageUrl: string) => [
  {
    role: 'user' as const,
    content: [
      { type: 'image_url' as const, image_url: { url: imageUrl } },
      { type: 'text' as const, text: VERIFY_PROMPT },
    ],
  },
]

const buildEvaluationPrompt = (imageUrl: string) => [
  {
    role: 'user' as const,
    content: [
      { type: 'image_url' as const, image_url: { url: imageUrl } },
      { type: 'text' as const, text: EVALUATE_PROMPT },
    ],
  },
]

export async function POST(request: Request) {
  try {
    const { imageUrl, imageType } = await request.json()
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          valid: false,
          error: 'ログインが必要です。ページを再読み込みしてもう一度お試しください。',
          suggestions: ['ページを再読み込みしてセッションを更新してください', 'ログインし直してから再度お試しください'],
        },
        { status: 401 }
      )
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          valid: false,
          error: '両方の画像が必要です。車両の荷物スペースと道具収納の写真を選択してください。',
          suggestions: ['それぞれの対象を撮影した最新の写真をアップロードしてください', '画像がぼやけていないか、暗すぎないか確認してください'],
        },
        { status: 400 }
      )
    }

    const getSignedUrl = async (publicUrl: string) => {
      const url = new URL(publicUrl)
      const match = url.pathname.match(/\/storage\/v1\/object\/public\/submissions\/(.+)/)
      if (!match) {
        throw new Error('Invalid storage URL format')
      }

      const filePath = match[1]
      const { data, error } = await supabase.storage
        .from('submissions')
        .createSignedUrl(filePath, 3600)

      if (error) {
        console.error('[evaluate] Signed URL error:', error)
        throw error
      }

      return data.signedUrl
    }

    const signedImageUrl = await getSignedUrl(imageUrl)
    console.log(`[evaluate] Processing ${imageType} image:`, { originalUrl: imageUrl, signedImageUrl })

    const verifyResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: buildVerificationPrompt(signedImageUrl),
      max_completion_tokens: 500,
    })

    console.log(`[evaluate] ${imageType} verification response:`, {
      finish_reason: verifyResponse.choices[0]?.finish_reason,
      usage: verifyResponse.usage,
    })

    const verifyRaw = verifyResponse.choices[0]?.message.content ?? ''
    console.log(`[evaluate] ${imageType} raw verification response:`, verifyRaw)
    const verifyResult = extractJson(verifyRaw, 'verification result')

    if (!verifyResult || verifyResult.isValid !== true) {
      const targetLabel = imageType === 'luggage' ? '車両の荷物スペース' : '道具収納'
      const otherLabel = imageType === 'luggage' ? '道具収納' : '車両の荷物スペース'
      const details = `${targetLabel}: 評価対象として認識できませんでした\n${otherLabel}: アップロード済みの写真を再確認してください`

      return NextResponse.json(
        {
          valid: false,
          category: verifyResult?.category ?? null,
          reason: verifyResult?.reason ?? 'AIの応答が解析できませんでした',
          error: '画像が評価対象として認識できませんでした',
          details,
          suggestions: [
            '明るい場所で撮影してください',
            '対象物全体が写るように撮影してください',
            'ぼやけていない鮮明な写真を使用してください',
            '車両の荷物スペースまたは道具収納が写っているか確認してください',
          ],
        },
        { status: 422 }
      )
    }

    console.log('[evaluate] Verification parsed result:', verifyResult)

    const evaluateResponse = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: buildEvaluationPrompt(signedImageUrl),
      max_completion_tokens: 800,
    })

    console.log(`[evaluate] ${imageType} evaluation response:`, {
      finish_reason: evaluateResponse.choices[0]?.finish_reason,
      usage: evaluateResponse.usage,
    })

    const evalRaw = evaluateResponse.choices[0]?.message.content ?? ''
    console.log(`[evaluate] ${imageType} raw evaluation response:`, evalRaw)
    const evalResult = extractJson(evalRaw, 'evaluation result')

    if (!evalResult) {
      return NextResponse.json(
        {
          valid: false,
          category: verifyResult.category ?? null,
          reason: 'AIの評価応答が解析できませんでした',
          error: '評価に失敗しました。時間をおいて再試行してください。',
          suggestions: [
            'ブラウザを再読み込みしてからもう一度試してください',
            'アップロードした画像を変更して再度評価してください',
          ],
        },
        { status: 502 }
      )
    }

    if (typeof evalResult.score === 'number') {
      evalResult.score = Math.max(20, Math.min(98, evalResult.score))
    }

    const payload = {
      valid: true,
      score: typeof evalResult.score === 'number' ? evalResult.score : 0,
      comment:
        typeof evalResult.comment === 'string'
          ? evalResult.comment
          : '評価できませんでした',
      category: verifyResult.category ?? null,
      reason: verifyResult.reason ?? null,
    }

    console.log('[evaluate] Final result:', payload)

    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[evaluate] Error:', error)

    const message = String(error?.message ?? '')
    let status = 500
    let errorMessage = '評価処理中に予期しないエラーが発生しました'
    let suggestions = [
      '時間をおいて再試行してください',
      'ネットワーク環境を確認してください',
    ]

    const lower = message.toLowerCase()
    if (lower.includes('timeout') || lower.includes('timed out')) {
      status = 504
      errorMessage = '処理に時間がかかりすぎています'
      suggestions = ['時間をおいてから再試行してください', '通信が安定した場所で再度お試しください']
    } else if (lower.includes('fetch failed') || lower.includes('network')) {
      status = 503
      errorMessage = 'ネットワーク接続に問題があります'
      suggestions = ['通信状況を確認し、再度お試しください', '別のネットワークに切り替えてから再実行してください']
    } else if (lower.includes('unauthorized') || lower.includes('401')) {
      status = 401
      errorMessage = 'ログインセッションが切れています'
      suggestions = ['ページを再読み込みしてログインし直してください']
    }

    return NextResponse.json(
      {
        valid: false,
        error: errorMessage,
        suggestions,
        details: message || undefined,
      },
      { status }
    )
  }
}
