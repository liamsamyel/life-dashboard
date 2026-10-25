import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Validation message; also sets aria-invalid for screen readers. */
  error?: string
  /** Optional hint shown below the field when there is no error. */
  hint?: string
}

/**
 * Labeled form field used by every form in the app (sign-in first, then task
 * and transaction forms). The error is rendered as text under the field —
 * never color alone.
 */
export function Input({ label, error, hint, className, id, ...rest }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          'w-full rounded-md border bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-muted',
          'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={messageId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
