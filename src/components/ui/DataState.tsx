import { CircleAlert, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'

/** Centered loading state for pages fetching remote data. */
export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-ink-muted" aria-hidden="true" />
      <p className="mt-3 text-sm text-ink-muted">{label}</p>
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

/** Error state that explains what failed and offers a retry. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface-2">
          <CircleAlert className="h-5 w-5 text-danger" aria-hidden="true" />
        </div>
        <h2 className="text-sm font-semibold text-ink">Couldn’t load your data</h2>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted" role="alert">
          {message}
        </p>
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </Card>
  )
}
