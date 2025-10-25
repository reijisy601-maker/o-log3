'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuthLock } from '@/lib/hooks/useAuthLock'
import { useMagicLinkRateLimit } from '@/lib/hooks/useMagicLinkRateLimit'
import { useSavedEmail } from '@/lib/hooks/useSavedEmail'
import { updates, isNew, hasNewUpdates } from '@/lib/updates'
import { X } from 'lucide-react'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUpdates, setShowUpdates] = useState(false)
  const { isLocked, remainingTime, attempts, recordFailure, reset } = useAuthLock()
  const { canSend, remainingSeconds, recordSent } = useMagicLinkRateLimit()
  const { savedEmail, shouldSave, setShouldSave, saveEmail, clearSavedEmail } = useSavedEmail()

  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [savedEmail])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isLocked) {
      toast.error('ロック中です', {
        description: `残り ${Math.floor(remainingTime / 60)}分${remainingTime % 60}秒`,
      })
      return
    }

    if (!canSend) {
      toast.error('送信間隔が短すぎます', {
        description: `${remainingSeconds}秒後に再送信できます`,
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          authCode: mode === 'register' ? code : undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        reset()
        recordSent()
        const successMessage = data.isExistingUser
          ? 'ログイン用Magic Linkを送信しました'
          : '新規登録用Magic Linkを送信しました。メールをご確認ください'

        toast.success(successMessage, {
          description: 'メールボックスを確認してください。60秒後に再送信できます',
        })

        if (shouldSave) {
          saveEmail(email)
          // メールアドレスは保存されているためクリアしない
        } else {
          clearSavedEmail()
          setEmail('')
        }

        setCode('')
      } else {
        if (mode === 'register' && data.error?.includes('認証コード')) {
          recordFailure()
          const attemptsLeft = Math.max(0, 3 - (attempts + 1))
          toast.error('認証コードが正しくありません', {
            description:
              attemptsLeft > 0 ? `残り ${attemptsLeft} 回試行できます` : '5分間ロックされました',
          })
          setLoading(false)
          return
        }

        toast.error('送信に失敗しました', {
          description: data.error || '再度お試しください',
        })
      }
    } catch (error) {
      toast.error('エラーが発生しました', {
        description: 'ネットワーク接続を確認してください',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">o-log3</CardTitle>
          <CardDescription className="text-center">整理整頓記録システム</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex mb-6 border-b">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-3 text-center font-medium transition-all duration-300 ${
                mode === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-3 text-center font-medium transition-all duration-300 ${
                mode === 'register'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                📧 メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading || isLocked}
                className="h-12 text-base"
                autoComplete="email"
              />
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="save-email"
                  checked={shouldSave}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setShouldSave(checked)
                    if (!checked) {
                      clearSavedEmail()
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="save-email" className="text-xs text-gray-600 cursor-pointer">
                  このデバイスにメールアドレスを保存する
                </label>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-2 transition-all duration-300">
                <label htmlFor="code" className="text-sm font-medium">
                  🔐 認証コード
                </label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="4桁の数字"
                  value={code}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                    setCode(value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault()
                    }
                  }}
                  required
                  disabled={loading || isLocked}
                  className="h-12 text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  管理者から取得した4桁の認証コードを入力してください
                </p>
              </div>
            )}

            {isLocked && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔒</span>
                  <p className="text-sm text-red-600 font-semibold">アカウントがロックされています</p>
                </div>
                <p className="text-xs text-red-700">
                  認証コードを3回間違えたため、一時的にロックされました
                </p>
                <div className="flex items-center justify-center gap-2 pt-1 pb-1">
                  <span className="text-xl">⏰</span>
                  <p className="text-lg text-red-600 font-mono font-bold">
                    残り {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                  </p>
                </div>
                <p className="text-xs text-gray-600 pt-1 border-t border-red-100">
                  💡 ロック解除後、正しい認証コードで再度お試しください
                </p>
              </div>
            )}

            {!isLocked && attempts > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700">
                  ⚠️ 3回失敗すると5分間ロックされます（残り {Math.max(0, 3 - attempts)} 回）
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || isLocked || !canSend}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  送信中...
                </>
              ) : isLocked ? (
                <>
                  🔒 {Math.floor(remainingTime / 60)}分{remainingTime % 60}秒後に再試行可能
                </>
              ) : !canSend ? (
                <>⏱️ {remainingSeconds}秒後に送信可能</>
              ) : (
                <>マジックリンクを送信 🚀</>
              )}
            </Button>

            <div className="text-center">
              {isLocked && (
                <p className="mt-2 text-xs text-gray-500">
                  認証コードを3回間違えたため、一時的にロックされています
                </p>
              )}
              {!isLocked && !canSend && !loading && (
                <p className="mt-2 text-xs text-gray-500">
                  短時間に複数回の送信を防ぐため、待機時間が設定されています
                </p>
              )}
            </div>
          </form>
          {/* アップデート情報リンク */}
          <div className="mt-8 pt-6 border-t text-center">
            <button
              onClick={() => setShowUpdates(true)}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center gap-2"
              type="button"
            >
              <span>📝 アップデート情報</span>
              {hasNewUpdates() && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                  NEW
                </span>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
      {/* アップデート情報モーダル */}
      {showUpdates && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setShowUpdates(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                📝 アップデート情報
              </h2>
              <button
                onClick={() => setShowUpdates(false)}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              <div className="space-y-6">
                {updates.map((update, index) => (
                  <div
                    key={index}
                    className={`${
                      isNew(update.date) ? 'bg-blue-50' : ''
                    } border-l-4 ${
                      update.type === 'feature'
                        ? 'border-blue-500'
                        : update.type === 'improvement'
                        ? 'border-green-500'
                        : 'border-red-500'
                    } p-4 rounded-r transition-colors`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs md:text-sm text-gray-600">
                        {update.date}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded font-medium ${
                          update.type === 'feature'
                            ? 'bg-blue-600 text-white'
                            : update.type === 'improvement'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {update.version}
                      </span>
                      {isNew(update.date) && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <h3 className="text-base md:text-lg font-semibold mb-2 text-gray-800">
                      {update.emoji && `${update.emoji} `}
                      {update.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-700 mb-3">
                      {update.description}
                    </p>
                    {update.details && update.details.length > 0 && (
                      <ul className="list-disc list-inside text-xs md:text-sm text-gray-600 space-y-1">
                        {update.details.map((detail, indexDetail) => (
                          <li key={indexDetail}>{detail}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                {updates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>まだアップデート情報がありません</p>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="p-4 md:p-6 border-t bg-gray-50 text-center">
              <a
                href="/updates"
                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                すべてのアップデート履歴を見る →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
