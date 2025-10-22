"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { MonthlyStats } from "@/lib/types"
import { TrendingUp } from "lucide-react"

interface MonthlyStatsChartProps {
  stats: MonthlyStats[]
}

export function MonthlyStatsChart({ stats }: MonthlyStatsChartProps) {
  const chartData = stats.slice(0, 6).reverse()

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          月次統計
        </CardTitle>
        <CardDescription>過去6ヶ月の投稿率と平均スコア</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            submission_rate: {
              label: "投稿率",
              color: "hsl(var(--chart-1))",
            },
            average_score: {
              label: "平均スコア",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[300px]"
        >
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="submission_rate" fill="var(--color-submission_rate)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="average_score" fill="var(--color-average_score)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
