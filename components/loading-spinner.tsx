import { Spinner } from "@/components/ui/spinner"

interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message = "読み込み中..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
