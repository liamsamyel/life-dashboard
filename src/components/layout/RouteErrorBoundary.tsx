import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '../ui/DataState'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time crashes inside the routes and shows a recoverable
 * error card instead of a blank page. `componentDidCatch` logs the details —
 * the failure is surfaced, never swallowed.
 */
export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('View crashed:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorState
            message="Something went wrong while rendering this view. Try again, or reload the page if it keeps happening."
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      )
    }
    return this.props.children
  }
}
