export interface Update {
  date: string
  version: string
  type: 'feature' | 'improvement' | 'bugfix'
  title: string
  description: string
  details?: string[]
  emoji?: string
}

export const updates: Update[] = [
  {
    date: '2025-10-25',
    version: 'v1.2.0',
    type: 'improvement',
    title: 'クロスデバイス認証に対応',
    description: 'PCで送信したMagic Linkをスマートフォンで開いてもログインできるようになりました。',
    details: [
      'Cookie設定の最適化',
      'エラーハンドリングの強化',
      'セキュリティの向上'
    ],
    emoji: '🎉'
  },
]

export const isNew = (date: string): boolean => {
  const updateDate = new Date(date)
  const now = new Date()
  const diffDays = (now.getTime() - updateDate.getTime()) / (1000 * 3600 * 24)
  return diffDays <= 7
}

export const getLatestUpdate = (): Update | null => {
  return updates.length > 0 ? updates[0] : null
}

export const hasNewUpdates = (): boolean => {
  return updates.some(update => isNew(update.date))
}
