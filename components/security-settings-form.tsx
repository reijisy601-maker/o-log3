"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Save } from "lucide-react"

interface SecuritySettingsFormProps {
  initialSettings: Record<string, unknown>
}

export function SecuritySettingsForm({ initialSettings }: SecuritySettingsFormProps) {
  const [domains, setDomains] = useState<string>(
    Array.isArray(initialSettings.allowed_domains) ? initialSettings.allowed_domains.join(", ") : "",
  )
  const [maxFileSize, setMaxFileSize] = useState<string>(String(initialSettings.max_file_size || 10485760))
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_domains: domains.split(",").map((d) => d.trim()),
          max_file_size: Number.parseInt(maxFileSize),
        }),
      })

      if (!response.ok) throw new Error("保存に失敗しました")

      setMessage({ type: "success", text: "設定を保存しました" })
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "エラーが発生しました" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          セキュリティ設定
        </CardTitle>
        <CardDescription>ドメイン制限とファイルサイズの設定</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="domains">許可ドメイン</Label>
          <Input
            id="domains"
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="example.com, company.com"
          />
          <p className="text-xs text-muted-foreground">カンマ区切りで複数のドメインを指定</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxFileSize">最大ファイルサイズ (バイト)</Label>
          <Input
            id="maxFileSize"
            type="number"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(e.target.value)}
            placeholder="10485760"
          />
          <p className="text-xs text-muted-foreground">10485760 = 10MB</p>
        </div>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "保存中..." : "設定を保存"}
        </Button>
      </CardContent>
    </Card>
  )
}
