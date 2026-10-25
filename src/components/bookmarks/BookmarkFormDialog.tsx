import { useEffect, useId, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import {
  bookmarkToFormValues,
  emptyBookmarkValues,
  hasFormErrors,
  validateBookmarkForm,
  type BookmarkFormErrors,
  type BookmarkFormValues,
} from '../../lib/bookmarks'
import type { Bookmark } from '../../types'

interface BookmarkFormDialogProps {
  open: boolean
  /** Existing bookmark to edit, or null to create. */
  bookmark: Bookmark | null
  /** Existing categories, offered as autocomplete suggestions. */
  categories: string[]
  onSubmit: (values: BookmarkFormValues) => Promise<void>
  onClose: () => void
}

/** Create/edit form for bookmarks. Only http(s) URLs are accepted. */
export function BookmarkFormDialog({
  open,
  bookmark,
  categories,
  onSubmit,
  onClose,
}: BookmarkFormDialogProps) {
  const datalistId = useId()
  const [values, setValues] = useState<BookmarkFormValues>(emptyBookmarkValues)
  const [errors, setErrors] = useState<BookmarkFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(bookmark ? bookmarkToFormValues(bookmark) : emptyBookmarkValues())
    setErrors({})
    setSubmitError(null)
    setSubmitting(false)
  }, [open, bookmark])

  function set<K extends keyof BookmarkFormValues>(
    key: K,
    value: BookmarkFormValues[K],
  ): void {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const nextErrors = validateBookmarkForm(values)
    setErrors(nextErrors)
    if (hasFormErrors(nextErrors)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the bookmark.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={submitting}
      title={bookmark ? 'Edit bookmark' : 'New bookmark'}
      description={
        bookmark ? 'Changes save to your Firestore document.' : 'Save a link you use often.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="bookmark-form" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : bookmark ? 'Save changes' : 'Add bookmark'}
          </Button>
        </>
      }
    >
      <form id="bookmark-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Title"
          value={values.title}
          onChange={(event) => set('title', event.target.value)}
          error={errors.title}
          placeholder="e.g. React documentation"
          maxLength={160}
          autoFocus
          required
        />

        <Input
          label="URL"
          inputMode="url"
          value={values.url}
          onChange={(event) => set('url', event.target.value)}
          error={errors.url}
          placeholder="https://react.dev"
          hint="Web addresses only — http or https."
          autoComplete="off"
          spellCheck={false}
          required
        />

        <Input
          label="Category"
          value={values.category}
          onChange={(event) => set('category', event.target.value)}
          error={errors.category}
          placeholder="e.g. Reference"
          list={datalistId}
        />
        <datalist id={datalistId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>

        <div>
          <label htmlFor="bookmark-description" className="mb-1.5 block text-sm font-medium text-ink">
            Description <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="bookmark-description"
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Why you saved it"
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {errors.description ? (
            <p className="mt-1.5 text-xs text-danger">{errors.description}</p>
          ) : null}
        </div>

        {submitError ? (
          <p
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {submitError}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
