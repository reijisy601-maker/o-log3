import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

interface VerificationResult {
  isValid: boolean
  category?: string
  reason?: string
}

interface EvaluationResult {
  score: number | null
  comment: string
}

const MAX_COMPLETION_TOKENS = 2000 // 800から増やす
const MAX_COMMENT_LENGTH = 5000
const PAYLOAD_SIZE_LIMIT_BYTES = 1024 * 1024

const sanitizeComment = (value: unknown) =>
  typeof value === 'string' ? value.slice(0, MAX_COMMENT_LENGTH) : ''

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

const EVALUATE_PROMPT = `あなたは作業環境の整理整頓状態を評価する専門家です。
提供された画像から、作業環境の状態を客観的に評価してください。

# 基本方針
これは実際に現場で使用される車両・道具です。完璧な整理整頓ではなく、
「外から見た時の印象」と「実用性とのバランス」を重視してください。

## 重要な評価原則
- 敷物・カバー類で隠している = 見た目への配慮として肯定的に評価
- 「ごちゃごちゃして見えない工夫」は高く評価する
- 実用性（すぐ取り出せる配置）も考慮する
- 完璧すぎる状態を求めない（現実的な評価）

# 評価視点（画像の内容に応じて適切に判断）

## 車両の荷物スペース（ラゲッジ・荷台）の場合
- 外部から見た時の印象（最重要）
- 敷物・シート・カバーによる目隠し工夫
- 大型道具・資材の配置と固定
- スペースの有効活用
- 汚れ・ゴミの管理状況

## 道具収納（工具箱・ツールボックス）の場合
- 道具の取り出しやすさ（実用性が最重要）
- カテゴリー分類の明確さ
- 収納ケース・仕切り・ボックスの活用
- 道具自体のメンテナンス・手入れ状態
- 使用頻度に応じた合理的な配置

# 評価基準（各項目を総合的に判断）

## 1. 第一印象（40%）
- パッと見た時の清潔感・整然とした印象
- 見せ方の工夫（敷物、カバー、色の統一など）
- 外部から見た時の安心感

## 2. 整理整頓度（35%）
- 物の配置の合理性
- 空間の有効活用
- 分類・グルーピング

## 3. 清潔感（25%）
- 汚れ・ゴミの有無
- メンテナンス状態

# スコアリング
- 範囲: 20-98点
- 現場で実際に使う道具・車両であることを考慮
- 極端に低い点数（20点台）や完璧な点数（95点以上）は避ける

# スコア配分の目安
- 85-98点: 見た目と実用性のバランスが素晴らしい
- 70-84点: 良好な状態、いくつか改善ポイントあり
- 55-69点: 普通の状態、改善の余地あり
- 40-54点: 改善が必要
- 20-39点: かなりの改善が必要

# コメント作成の原則（重要）
1. **画像から実際に観察できる具体的な要素を述べる**
2. **一般論ではなく、この画像特有の状態を評価する**
3. **敷物がある場合は「見た目への配慮」として肯定的に触れる**
4. 前向きで建設的なトーン
5. 改善提案は「さらに良くするなら」という表現で
6. 上から目線を避け、共感的に
7. 具体的で多様な表現を心がける

# 出力形式
JSON形式で以下を出力：
{
  "score": [20-98の整数],
  "comment": "[150-200文字程度。画像の内容に基づいた具体的な評価コメント]"
}

それでは、画像を観察し、具体的で建設的な評価を行ってください。`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const extractJson = (
  input: string,
  label: string
): VerificationResult | EvaluationResult | null => {
  if (!input || input.trim() === '') {
    console.error(`[evaluate] Empty response from OpenAI for ${label}`)
    return null
  }

  const jsonMatch = input.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error(`[evaluate] No JSON found in response for ${label}`)
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error(`[evaluate] Failed to parse ${label}`, error)
    return null
  }

  if (label === 'evaluation result') {
    if (typeof parsed !== 'object' || parsed === null) {
      return { score: null, comment: '' } as EvaluationResult
    }

    const record = parsed as Record<string, unknown>
    let score: number | null = null

    const scoreCandidate =
      record.score ??
      (record as { 荷台?: { score?: unknown }; 道具収納?: { score?: unknown } }).荷台?.score ??
      (record as { 荷台?: { score?: unknown }; 道具収納?: { score?: unknown } }).道具収納?.score

    if (typeof scoreCandidate === 'number' && Number.isFinite(scoreCandidate)) {
      score = scoreCandidate
    } else if (typeof scoreCandidate === 'string') {
      const numeric = Number(scoreCandidate)
      if (!Number.isNaN(numeric)) {
        score = numeric
      }
    }

    let comment = sanitizeComment(record.comment)
    if (!comment) {
      const nested = record as {
        荷台?: { comment?: unknown }
        道具収納?: { comment?: unknown }
      }
      comment =
        sanitizeComment(nested.荷台?.comment) ||
        sanitizeComment(nested.道具収納?.comment)
    }

    return { score, comment } as EvaluationResult
  }

  return parsed as VerificationResult
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
    if (verifyRaw) {
      const preview =
        verifyRaw.length > 200 ? `${verifyRaw.slice(0, 200)}…` : verifyRaw
      console.log(`[evaluate] ${imageType} verification preview:`, preview)
    }
    const verifyResult = extractJson(
      verifyRaw,
      'verification result'
    ) as VerificationResult | null

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
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    })

    const finishReason = evaluateResponse.choices[0]?.finish_reason
    console.log(`[evaluate] ${imageType} evaluation response:`, {
      finish_reason: finishReason,
      usage: evaluateResponse.usage,
    })

    if (finishReason === 'length') {
      console.error('[evaluate] Response truncated due to token limit')
      throw new Error('評価処理がトークン上限に達しました。画像が複雑すぎる可能性があります。')
    }

    const evalRaw = evaluateResponse.choices[0]?.message.content ?? ''
    if (evalRaw) {
      const preview =
        evalRaw.length > 200 ? `${evalRaw.slice(0, 200)}…` : evalRaw
      console.log(`[evaluate] ${imageType} evaluation preview:`, preview)
    }
    const evalResult = extractJson(
      evalRaw,
      'evaluation result'
    ) as EvaluationResult | null

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
      comment: typeof evalResult.comment === 'string' ? evalResult.comment : '',
      category: verifyResult.category ?? null,
      reason: verifyResult.reason ?? null,
    }

    console.log('[evaluate] Final result summary:', {
      score: payload.score,
      commentLength: payload.comment.length,
    })

    const payloadJson = JSON.stringify(payload)
    const payloadSize = new TextEncoder().encode(payloadJson).length

    if (payloadSize > PAYLOAD_SIZE_LIMIT_BYTES) {
      console.error('[evaluate] Payload exceeds size limit', {
        payloadSize,
        limit: PAYLOAD_SIZE_LIMIT_BYTES,
      })

      return NextResponse.json(
        {
          valid: false,
          error: '評価結果のサイズが大きすぎます。時間をおいて再試行してください。',
          suggestions: [
            '画像の解像度を下げて再度お試しください',
            '時間をおいてから再評価してください',
          ],
        },
        { status: 502 }
      )
    }

    return new NextResponse(payloadJson, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[evaluate] Error:', error)

    const message = error instanceof Error ? error.message : ''
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
