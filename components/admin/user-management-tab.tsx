'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit3,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'

type AdminUser = {
  id: string
  email: string
  display_name: string | null
  department: string | null
  admin_notes: string | null
  avg_score_3months: number | null
  last_submission_date: string | null
  role: string
  created_at: string
}

type SortField = 'department' | 'avg_score_3months'
type SortDirection = 'asc' | 'desc'

type EditFormState = {
  department: string
  admin_notes: string
}

const initialEditForm: EditFormState = {
  department: '',
  admin_notes: '',
}

export default function UserManagementTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('department')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>(initialEditForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, startRefreshTransition] = useTransition()

  const { toast } = useToast()

  useEffect(() => {
    void fetchUsers()

    async function fetchUsers() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/admin/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body?.error ?? 'ユーザー情報の取得に失敗しました')
        }

        const data = (await response.json()) as { users: AdminUser[] }
        setUsers(data.users ?? [])
      } catch (err) {
        console.error('Failed to load admin users:', err)
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
  }, [])

  const departments = useMemo(() => {
    const unique = new Set<string>()
    users.forEach((user) => {
      if (user.department) {
        unique.add(user.department)
      }
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [users])

  const filteredUsers = useMemo(() => {
    const lowerQuery = searchQuery.trim().toLowerCase()

    return users.filter((user) => {
      const matchesQuery =
        lowerQuery.length === 0 ||
        user.email.toLowerCase().includes(lowerQuery) ||
        (user.display_name ?? '').toLowerCase().includes(lowerQuery)

      const matchesDepartment =
        departmentFilter === 'all' || user.department === departmentFilter

      return matchesQuery && matchesDepartment
    })
  }, [users, searchQuery, departmentFilter])

  const sortedUsers = useMemo(() => {
    const value = [...filteredUsers]
    value.sort((a, b) => {
      let comparison = 0

      if (sortField === 'department') {
        const deptA = (a.department ?? '').toLowerCase()
        const deptB = (b.department ?? '').toLowerCase()
        comparison = deptA.localeCompare(deptB, 'ja')
      } else if (sortField === 'avg_score_3months') {
        const scoreA = a.avg_score_3months ?? -Infinity
        const scoreB = b.avg_score_3months ?? -Infinity
        comparison = scoreA === scoreB ? 0 : scoreA > scoreB ? 1 : -1
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return value
  }, [filteredUsers, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    setSortDirection((prev) => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'))
    setSortField(field)
  }

  const handleRefresh = () => {
    startRefreshTransition(async () => {
      try {
        setError(null)
        const response = await fetch('/api/admin/users', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body?.error ?? 'ユーザー情報の取得に失敗しました')
        }

        const data = (await response.json()) as { users: AdminUser[] }
        setUsers(data.users ?? [])
        toast({ title: '最新のユーザー情報を取得しました。' })
      } catch (err) {
        console.error('Failed to refresh admin users:', err)
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
        toast({ title: '更新に失敗しました', description: '時間をおいて再度お試しください。' })
      }
    })
  }

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user)
    setEditForm({
      department: user.department ?? '',
      admin_notes: user.admin_notes ?? '',
    })
    setEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setEditDialogOpen(false)
    setSelectedUser(null)
    setEditForm(initialEditForm)
  }

  const openDeleteDialog = (user: AdminUser) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setSelectedUser(null)
  }

  const handleUpdate = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: editForm.department.trim() || null,
          admin_notes: editForm.admin_notes.trim() || null,
        }),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok || !body?.success) {
        throw new Error(body?.error ?? 'ユーザー情報の更新に失敗しました')
      }

      const updated = body.user as AdminUser
      setUsers((prev) =>
        prev.map((user) => (user.id === updated.id ? { ...user, ...updated } : user)),
      )

      toast({ title: 'ユーザー情報を更新しました。' })
      closeEditDialog()
    } catch (err) {
      console.error('Failed to update user:', err)
      toast({
        title: '更新に失敗しました',
        description:
          err instanceof Error ? err.message : 'もう一度お試しください。',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok || !body?.success) {
        throw new Error(body?.error ?? 'ユーザーの削除に失敗しました')
      }

      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id))
      toast({ title: 'ユーザーを削除しました。' })
      closeDeleteDialog()
    } catch (err) {
      console.error('Failed to delete user:', err)
      toast({
        title: '削除に失敗しました',
        description:
          err instanceof Error ? err.message : 'もう一度お試しください。',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getScoreBadgeClasses = (score: number | null) => {
    if (typeof score !== 'number') {
      return 'bg-slate-200 text-slate-600 border-transparent'
    }
    if (score >= 90) return 'bg-emerald-500/90 text-white border-transparent'
    if (score >= 80) return 'bg-sky-500/90 text-white border-transparent'
    if (score >= 70) return 'bg-amber-500/90 text-white border-transparent'
    return 'bg-rose-500/90 text-white border-transparent'
  }

  const formatScore = (score: number | null) =>
    typeof score === 'number' ? score.toFixed(1) : '-'

  const formatDate = (value: string | null) => {
    if (!value) return '-'
    try {
      const d = new Date(value)
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d)
    } catch {
      return '-'
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="size-4 text-muted-foreground" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="size-4" />
    ) : (
      <ArrowDown className="size-4" />
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="メール・表示名で検索"
              className="pl-9"
            />
          </div>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="所属でフィルター" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての所属</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="self-start"
        >
          <RefreshCw
            className={cn('mr-2 size-4', (loading || isRefreshing) && 'animate-spin')}
          />
          再読み込み
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>メール</TableHead>
              <TableHead>表示名</TableHead>
              <TableHead>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-3 px-2 font-semibold"
                  onClick={() => handleSort('department')}
                >
                  所属
                  {renderSortIcon('department')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-3 px-2 font-semibold"
                  onClick={() => handleSort('avg_score_3months')}
                >
                  3ヶ月平均
                  {renderSortIcon('avg_score_3months')}
                </Button>
              </TableHead>
              <TableHead>最終提出日</TableHead>
              <TableHead className="max-w-xs">メモ</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Spinner className="size-5" />
                    読み込み中...
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  表示できるユーザーがありません。
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => (
                <TableRow key={user.id} className="bg-white transition-colors hover:bg-gray-50">
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.display_name || '未設定'}</TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>
                    <Badge className={cn('px-3 py-1 text-xs', getScoreBadgeClasses(user.avg_score_3months))}>
                      {formatScore(user.avg_score_3months)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.last_submission_date)}</TableCell>
                  <TableCell className="max-w-xs text-left">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {user.admin_notes || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit3 className="mr-1 size-4" />
                        編集
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(user)}
                      >
                        <Trash2 className="mr-1 size-4" />
                        削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => (open ? setEditDialogOpen(true) : closeEditDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー情報編集</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="department">所属</Label>
              <Input
                id="department"
                value={editForm.department}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, department: event.target.value }))
                }
                placeholder="例: 営業部"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_notes">管理者メモ</Label>
              <Textarea
                id="admin_notes"
                value={editForm.admin_notes}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, admin_notes: event.target.value }))
                }
                placeholder="メモを入力"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />} 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => (open ? setDeleteDialogOpen(true) : closeDeleteDialog())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ユーザーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。関連する提出データも全て削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Spinner className="mr-2" />} 削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
