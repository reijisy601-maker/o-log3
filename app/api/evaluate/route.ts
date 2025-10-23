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

const EVALUATE_PROMPT = `あなたは作業環境の整理整頓状態を評価する専門家です。
以下の2枚の写真から、作業環境の状態を客観的に評価してください。

# 評価対象
1枚目: 荷台・ラゲッジスペース
2枚目: メイン道具収納（道具箱など）

# 基本方針
これは実際に現場で使用される車両・道具です。完璧な整理整頓ではなく、
「外から見た時の印象」と「実用性とのバランス」を重視してください。

## 重要な評価原則
- 敷物・カバー類で隠している = 見た目への配慮として肯定的に評価
- 「ごちゃごちゃして見えない工夫」は高く評価する
- 実用性（すぐ取り出せる配置）も考慮する
- 完璧すぎる状態を求めない（現実的な評価）

# 評価対象ごとの視点（重要: それぞれ異なる視点で評価する）

## 荷台・ラゲッジスペースの評価視点
- 外部から見た時の印象（最重要）
- 敷物・シート・カバーによる目隠し工夫
- 大型道具・資材の配置と固定
- スペースの有効活用
- 汚れ・ゴミの管理状況

## 道具収納の評価視点
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
1. **荷台と道具収納で異なる視点からコメントする**
2. **画像から実際に観察できる具体的な要素を述べる**
3. **同じ表現・フレーズを繰り返さない**
4. **一般論ではなく、この画像特有の状態を評価する**
5. 前向きで建設的なトーン
6. 改善提案は「さらに良くするなら」という表現で
7. 上から目線を避け、共感的に

# 出力形式
JSON形式で以下を出力：
{
  "荷台": {
    "score": [20-98の整数],
    "comment": "[150-200文字程度。荷台特有の視点（外から見た印象、敷物の工夫など）で評価]"
  },
  "道具収納": {
    "score": [20-98の整数],
    "comment": "[150-200文字程度。道具収納特有の視点（取り出しやすさ、分類など）で評価]"
  }
}

それでは、画像を観察し、荷台と道具収納それぞれに固有の評価を行ってください。`;

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

    const clampScore = (value: unknown) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 0
      }

      const rounded = Math.round(value)
      return Math.max(20, Math.min(98, rounded))
    }

    const cargoScoreRaw = evalResult?.荷台?.score
    const toolScoreRaw = evalResult?.道具収納?.score
    const cargoCommentRaw = evalResult?.荷台?.comment
    const toolCommentRaw = evalResult?.道具収納?.comment

    const cargoScore = clampScore(cargoScoreRaw)
    const toolScore = clampScore(toolScoreRaw)
    const validScores = [cargoScoreRaw, toolScoreRaw].filter((value): value is number =>
      typeof value === 'number' && !Number.isNaN(value)
    )

    const averageScoreRaw = validScores.length
      ? validScores.reduce((acc, value) => acc + value, 0) / validScores.length
      : 0

    let averageScore = Math.round(averageScoreRaw)
    if (averageScore > 0) {
      averageScore = Math.max(20, Math.min(98, averageScore))
    }

    const cargoComment = typeof cargoCommentRaw === 'string' ? cargoCommentRaw : ''
    const toolComment = typeof toolCommentRaw === 'string' ? toolCommentRaw : ''

    const combinedComment = `【荷台】\n評価: ${cargoScore || 'N/A'}点\n${cargoComment}\n\n【道具収納】\n評価: ${toolScore || 'N/A'}点\n${toolComment}`

    const processedResult = {
      score: averageScore,
      comment: combinedComment,
      breakdown: {
        cargo: { score: cargoScore, comment: cargoComment },
        toolbox: { score: toolScore, comment: toolComment },
      },
    }

    const payload = {
      valid: true,
      score: processedResult.score,
      comment: processedResult.comment || '評価できませんでした',
      category: verifyResult.category ?? null,
      reason: verifyResult.reason ?? null,
      details: processedResult.breakdown,
    }

    console.log('[evaluate] Final result:', payload)

    return NextResponse.json(payload)
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
