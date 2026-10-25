import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { hostnameOf } from '../../lib/bookmarks'
import type { Bookmark } from '../../types'

interface BookmarkRowProps {
  bookmark: Bookmark
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmark: Bookmark) => void
}

const ICON_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

/**
 * One saved link. It opens in a new tab with `rel="noopener noreferrer"` so
 * the target page can't touch this window, and the screen reader hears that
 * it opens externally.
 */
export function BookmarkRow({ bookmark, onEdit, onDelete }: BookmarkRowProps) {
  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:text-accent"
        >
          <span className="truncate">{bookmark.title}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {hostnameOf(bookmark.url)}
          {bookmark.category ? ` · ${bookmark.category}` : ''}
        </p>
        {bookmark.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
            {bookmark.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onEdit(bookmark)}
          className={ICON_BUTTON}
          title="Edit bookmark"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Edit “{bookmark.title}”</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(bookmark)}
          className={cn(ICON_BUTTON, 'hover:bg-danger/10 hover:text-danger')}
          title="Delete bookmark"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Delete “{bookmark.title}”</span>
        </button>
      </div>
    </li>
  )
}
