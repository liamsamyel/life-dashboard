import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Bookmark } from '../../types'
import { Card, CardBody, CardHeader } from '../ui/Card'

interface QuickLinksWidgetProps {
  /** Already sorted, most recent first. */
  bookmarks: Bookmark[]
  className?: string
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Frequently used bookmarks; links open safely in a new tab. */
export default function QuickLinksWidget({ bookmarks, className }: QuickLinksWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader
        title="Quick links"
        action={
          <Link to="/bookmarks" className="font-medium text-accent hover:underline">
            View all
          </Link>
        }
      />
      <CardBody>
        {bookmarks.length === 0 ? (
          <p className="text-sm text-ink-muted">No bookmarks yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id}>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink transition-colors duration-150 group-hover:text-accent">
                      {bookmark.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {hostnameOf(bookmark.url)}
                      {bookmark.category ? ` · ${bookmark.category}` : ''}
                    </p>
                  </div>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
