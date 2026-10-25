import type { LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { PageHeader } from '../ui/PageHeader'

interface SectionPlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
  /** Short stage marker, e.g. "Stage 3". */
  stage: string
  /** What this section will do once built. */
  detail: string
}

/**
 * Honest stand-in for sections that arrive in a later stage: it names the
 * stage and what will land, instead of pretending to work.
 */
export default function SectionPlaceholder({
  title,
  description,
  icon,
  stage,
  detail,
}: SectionPlaceholderProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={icon} title={`${stage} — coming next`} description={detail} />
      </Card>
    </div>
  )
}
