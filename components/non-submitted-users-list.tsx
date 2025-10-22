"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface NonSubmittedUsersListProps {
  users: Array<{
    id: string
    email: string
    name: string | null
    last_login: string | null
  }>
  month: string
}

export function NonSubmittedUsersList({ users, month }: NonSubmittedUsersListProps) {
  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          未投稿ユーザー
        </CardTitle>
        <CardDescription>{month}にまだ投稿していないユーザー</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="全員投稿済み"
            description="今月は全てのユーザーが投稿を完了しています"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メールアドレス</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>最終ログイン</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name || "-"}</TableCell>
                  <TableCell>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString("ja-JP") : "未ログイン"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">未投稿</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
