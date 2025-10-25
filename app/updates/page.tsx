import { updates, isNew } from '@/lib/updates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function UpdatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-bold">
              📝 アップデート情報
            </CardTitle>
            <CardDescription>
              o-log3の最新情報と改善履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {updates.map((update, index) => (
                <div
                  key={index}
                  className={`border-l-4 pl-4 py-2 ${
                    update.type === 'feature'
                      ? 'border-blue-500'
                      : update.type === 'improvement'
                      ? 'border-green-500'
                      : 'border-red-500'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">{update.date}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        update.type === 'feature'
                          ? 'bg-blue-100 text-blue-700'
                          : update.type === 'improvement'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {update.version}
                    </span>
                    {isNew(update.date) && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold mb-2">
                    {update.emoji && `${update.emoji} `}
                    {update.title}
                  </h2>
                  <p className="text-gray-700 mb-3 text-sm md:text-base">
                    {update.description}
                  </p>
                  {update.details && update.details.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {update.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {updates.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>まだアップデート情報がありません</p>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                ← ログインページに戻る
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
