import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import AdminDashboardTabs from '@/components/admin/admin-dashboard-tabs'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const userId = user.id

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.error('Failed to load admin profile in page:', profileError)
    redirect('/dashboard')
  }

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
              <p className="mt-2 text-gray-600">OrderLogの管理機能をここから操作できます。</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-purple-100 px-4 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
            >
              <ArrowLeft className="h-4 w-4" />
              ダッシュボードに戻る
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <AdminDashboardTabs />
        </div>
      </div>
    </div>
  )
}
