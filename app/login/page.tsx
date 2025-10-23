'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuthLock } from '@/lib/hooks/useAuthLock'
import { useMagicLinkRateLimit } from '@/lib/hooks/useMagicLinkRateLimit'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { isLocked, remainingTime, attempts, recordFailure, reset } = useAuthLock()
  const { canSend, remainingSeconds, recordSent } = useMagicLinkRateLimit()

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
        setEmail('')
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
          <CardTitle className="text-2xl font-bold text-center">OrderLog</CardTitle>
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
              />
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
                  🔒 ロック中 ({Math.floor(remainingTime / 60)}分{remainingTime % 60}秒)
                </>
              ) : !canSend ? (
                <>
                  ⏱️ {remainingSeconds}秒後に送信可能
                </>
              ) : (
                <>マジックリンクを送信 🚀</>
              )}
            </Button>

            <div className="text-center">
              {!canSend && !isLocked && !loading && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 連続送信を防止するため、60秒間お待ちください
                </p>
              )}
              {isLocked && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ 認証コードを3回間違えたため、5分間ロックされています
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
