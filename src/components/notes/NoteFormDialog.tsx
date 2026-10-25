import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import {
  emptyNoteValues,
  hasFormErrors,
  noteToFormValues,
  validateNoteForm,
  type NoteFormErrors,
  type NoteFormValues,
} from '../../lib/notes'
import type { Note } from '../../types'

interface NoteFormDialogProps {
  open: boolean
  /** Existing note to edit, or null to create. */
  note: Note | null
  onSubmit: (values: NoteFormValues) => Promise<void>
  onClose: () => void
}

/** Create/edit form for notes: title, body, and comma-separated tags. */
export function NoteFormDialog({ open, note, onSubmit, onClose }: NoteFormDialogProps) {
  const [values, setValues] = useState<NoteFormValues>(emptyNoteValues)
  const [errors, setErrors] = useState<NoteFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(note ? noteToFormValues(note) : emptyNoteValues())
    setErrors({})
    setSubmitError(null)
    setSubmitting(false)
  }, [open, note])

  function set<K extends keyof NoteFormValues>(key: K, value: NoteFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const nextErrors = validateNoteForm(values)
    setErrors(nextErrors)
    if (hasFormErrors(nextErrors)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(values)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the note.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={submitting}
      title={note ? 'Edit note' : 'New note'}
      description={note ? 'Changes save to your Firestore document.' : 'Capture a thought before it goes.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="note-form" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : note ? 'Save changes' : 'Create note'}
          </Button>
        </>
      }
    >
      <form id="note-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Title"
          value={values.title}
          onChange={(event) => set('title', event.target.value)}
          error={errors.title}
          placeholder="e.g. Lab 5 ideas"
          maxLength={160}
          autoFocus
          required
        />

        <div>
          <label htmlFor="note-content" className="mb-1.5 block text-sm font-medium text-ink">
            Content <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="note-content"
            value={values.content}
            onChange={(event) => set('content', event.target.value)}
            rows={8}
            placeholder="Write it out…"
            aria-invalid={errors.content ? true : undefined}
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {errors.content ? (
            <p className="mt-1.5 text-xs text-danger">{errors.content}</p>
          ) : null}
        </div>

        <Input
          label="Tags"
          value={values.tags}
          onChange={(event) => set('tags', event.target.value)}
          error={errors.tags}
          placeholder="school, security"
          hint="Separate tags with commas — they show as labels in your notes list."
          autoComplete="off"
        />

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
