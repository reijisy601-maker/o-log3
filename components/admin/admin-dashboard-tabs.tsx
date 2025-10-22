'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Shield, Users } from 'lucide-react'

import SecurityTab from '@/components/admin/security-tab'
import StatsTab from '@/components/admin/stats-tab'
import UserManagementTab from '@/components/admin/user-management-tab'

export default function AdminDashboardTabs() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="mb-6 grid w-full grid-cols-1 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1 sm:grid-cols-3">
        <TabsTrigger
          value="users"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-purple-600"
        >
          <Users className="h-5 w-5" />
          ユーザー管理
        </TabsTrigger>
        <TabsTrigger
          value="stats"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-purple-600"
        >
          <BarChart3 className="h-5 w-5" />
          全体統計
        </TabsTrigger>
        <TabsTrigger
          value="security"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-purple-600"
        >
          <Shield className="h-5 w-5" />
          セキュリティ
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UserManagementTab />
      </TabsContent>

      <TabsContent value="stats">
        <StatsTab />
      </TabsContent>

      <TabsContent value="security">
        <SecurityTab />
      </TabsContent>
    </Tabs>
  )
}
