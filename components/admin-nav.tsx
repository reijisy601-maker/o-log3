"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Shield, FileText } from "lucide-react"

const navItems = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/users", label: "ユーザー管理", icon: Users },
  { href: "/admin/security", label: "セキュリティ設定", icon: Shield },
  { href: "/admin/logs", label: "運用ログ", icon: FileText },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
