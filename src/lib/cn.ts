/** Join class names, skipping falsy values. Keeps JSX className logic tidy. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
