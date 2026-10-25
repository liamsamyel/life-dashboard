import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { EmptyState } from '../ui/EmptyState'
import {
  emptySubjectValues,
  hasSubjectFormErrors,
  subjectToFormValues,
  validateSubjectForm,
  type SubjectFormErrors,
  type SubjectFormValues,
} from '../../lib/academic'
import type { Subject } from '../../types'

interface SubjectManagerDialogProps {
  open: boolean
  subjects: Subject[]
  onSubmit: (values: SubjectFormValues, editingId: string | null) => Promise<void>
  onDelete: (subject: Subject) => Promise<void>
  onClose: () => void
}

/**
 * Subject/course management in one dialog: a form on top (add, or edit an
 * existing subject) and the list below. Deleting asks for confirmation and
 * shows failures inline instead of losing them.
 */
export function SubjectManagerDialog({
  open,
  subjects,
  onSubmit,
  onDelete,
  onClose,
}: SubjectManagerDialogProps) {
  const [values, setValues] = useState<SubjectFormValues>(emptySubjectValues)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<SubjectFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<Subject | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(emptySubjectValues())
    setEditingId(null)
    setErrors({})
    setSubmitError(null)
    setDeleting(null)
    setDeleteError(null)
  }, [open])

  function set<K extends keyof SubjectFormValues>(key: K, value: SubjectFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const nextErrors = validateSubjectForm(values)
    setErrors(nextErrors)
    if (hasSubjectFormErrors(nextErrors)) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(values, editingId)
      setValues(emptySubjectValues())
      setEditingId(null)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the subject.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await onDelete(deleting)
      setDeleting(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete the subject.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const sorted = [...subjects].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Manage subjects"
        description="Your courses and subjects — used to group planner items."
        footer={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Subject or course name"
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            error={errors.name}
            placeholder="e.g. Web Systems and Technologies"
            maxLength={120}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Course code"
              value={values.code}
              onChange={(event) => set('code', event.target.value)}
              error={errors.code}
              placeholder="e.g. IT 214"
              maxLength={40}
            />
            <Input
              label="Term"
              value={values.term}
              onChange={(event) => set('term', event.target.value)}
              error={errors.term}
              placeholder="e.g. 1st Sem 2026–2027"
              maxLength={60}
            />
          </div>

          {submitError ? (
            <p
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save changes' : (
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add subject
                </>
              )}
            </Button>
            {editingId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null)
                  setValues(emptySubjectValues())
                  setErrors({})
                  setSubmitError(null)
                }}
                disabled={submitting}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">
            Subjects <span className="font-normal text-ink-muted">({sorted.length})</span>
          </h3>
          {sorted.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No subjects yet"
              description="Add your first course above — planner items can then link to it."
            />
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {sorted.map((subject) => (
                <li key={subject.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{subject.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {[subject.code, subject.term].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(subject.id)
                      setValues(subjectToFormValues(subject))
                      setErrors({})
                      setSubmitError(null)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
                    title="Edit subject"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Edit “{subject.name}”</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleting(subject)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                    title="Delete subject"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Delete “{subject.name}”</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null)
        }}
        busy={deleteBusy}
        title="Delete subject?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? 'Deleting…' : 'Delete subject'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {deleting ? (
            <>
              <span className="font-medium text-ink">“{deleting.name}”</span> will be removed, and
              planner items linked to it will keep their deadlines with no subject. This can’t be
              undone.
            </>
          ) : null}
        </p>
        {deleteError ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {deleteError}
          </p>
        ) : null}
      </Dialog>
    </>
  )
}
