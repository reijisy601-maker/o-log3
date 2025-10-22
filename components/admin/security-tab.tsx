'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Plus,
  Save,
  Shuffle,
  X,
} from 'lucide-react'

const DOMAIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/

export default function SecurityTab() {
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [registrationCode, setRegistrationCode] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [domainError, setDomainError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    void loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setLoadError(null)

      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error ?? 'セキュリティ設定の取得に失敗しました')
      }

      const data = await response.json()

      setAllowedDomains((data.allowed_domains as string[]) ?? [])
      setRegistrationCode((data.registration_code as string) ?? '')
    } catch (error) {
      console.error('Failed to load security settings:', error)
      setLoadError(
        error instanceof Error ? error.message : '不明なエラーが発生しました',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const validateDomain = (domain: string) => {
    const trimmed = domain.trim()

    if (!trimmed) {
      setDomainError('ドメインを入力してください')
      return false
    }
    if (!DOMAIN_REGEX.test(trimmed)) {
      setDomainError('有効なドメイン形式で入力してください（例: example.com）')
      return false
    }
    if (allowedDomains.includes(trimmed)) {
      setDomainError('このドメインは既に登録されています')
      return false
    }

    setDomainError('')
    return true
  }

  const validateCode = (code: string) => {
    if (code.trim().length < 4) {
      setCodeError('認証コードは4文字以上必要です')
      return false
    }
    setCodeError('')
    return true
  }

  const addDomain = () => {
    if (!validateDomain(newDomain)) return

    setAllowedDomains((prev) => [...prev, newDomain.trim()])
    setNewDomain('')
  }

  const removeDomain = (index: number) => {
    setAllowedDomains((prev) => prev.filter((_, i) => i !== index))
  }

  const generateRandomCode = () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i += 1) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    setRegistrationCode(code)
    setCodeError('')
  }

  const saveSettings = async () => {
    if (!validateCode(registrationCode)) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowed_domains: allowedDomains,
          registration_code: registrationCode.trim(),
        }),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok || !body?.success) {
        throw new Error(body?.error ?? '保存に失敗しました')
      }

      toast({
        title: '保存完了',
        description: 'セキュリティ設定を更新しました',
      })
    } catch (error) {
      console.error('Failed to save security settings:', error)
      toast({
        title: 'エラーが発生しました',
        description:
          error instanceof Error ? error.message : '時間をおいて再度お試しください。',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = useMemo(() => {
    // Could track original values if dirty-state needed; for now, button enabled always
    return true
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner className="size-5" />
          設定を読み込んでいます...
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <Alert variant="destructive">
          <AlertTitle>設定の取得に失敗しました</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button onClick={loadSettings}>再試行する</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            許可ドメイン管理
          </CardTitle>
          <CardDescription>
            マジックリンク送信を許可するメールドメインを管理します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {allowedDomains.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-muted-foreground">
                許可ドメインが登録されていません。ドメインを追加してください。
              </div>
            ) : (
              allowedDomains.map((domain, index) => (
                <div
                  key={`${domain}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
                >
                  <span className="font-mono text-sm text-slate-700">{domain}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${domain} を削除`}
                    onClick={() => removeDomain(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newDomain}
              onChange={(event) => setNewDomain(event.target.value)}
              placeholder="example.com"
              className="font-mono"
            />
            <Button type="button" onClick={addDomain}>
              <Plus className="mr-2 size-4" /> 追加
            </Button>
          </div>

          {domainError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{domainError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5" />
            新規登録認証コード
          </CardTitle>
          <CardDescription>
            新規ユーザー登録時に必要な認証コードを管理します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="registration-code">現在の認証コード</Label>
            <div className="flex items-center gap-2">
              <Input
                id="registration-code"
                type={showCode ? 'text' : 'password'}
                value={registrationCode}
                onChange={(event) => setRegistrationCode(event.target.value)}
                className="font-mono text-lg tracking-widest"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setShowCode((prev) => !prev)}
                aria-label={showCode ? '認証コードを隠す' : '認証コードを表示'}
              >
                {showCode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {codeError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{codeError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" onClick={generateRandomCode}>
              <Shuffle className="mr-2 size-4" /> ランダム生成
            </Button>
            <p className="text-xs text-muted-foreground">
              混同しやすい文字（I, O, 1, 0）は除外しています。
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={saveSettings}
              disabled={isSaving || !hasChanges}
              className="min-w-40"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> 保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" /> 設定を保存
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
