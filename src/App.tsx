import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import { LoadingState } from './components/ui/DataState'
import { useAuth } from './hooks/useAuth'
import BookmarksPage from './pages/BookmarksPage'
import DashboardPage from './pages/DashboardPage'
import DuesPage from './pages/DuesPage'
import ExpensesPage from './pages/ExpensesPage'
import HabitsPage from './pages/HabitsPage'
import NotesPage from './pages/NotesPage'
import PlannerPage from './pages/PlannerPage'
import SettingsPage from './pages/SettingsPage'
import SignInPage from './pages/SignInPage'
import StudyPage from './pages/StudyPage'
import TasksPage from './pages/TasksPage'

/**
 * Route table.
 *
 * Every section renders inside AppShell (sidebar + top bar), behind
 * `RequireAuth`: once Firebase is configured, only signed-in users reach the
 * app — and even without the guard, `firestore.rules` rejects every
 * unauthenticated read and write, so the UI check is convenience, not
 * security.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingState label="Checking your session…" />
      </div>
    )
  }

  if (status === 'signedOut') {
    return <Navigate to="/signin" replace />
  }

  // In production, never expose the sample-data experience when Firebase is
  // missing or misconfigured. Keep it available for local development.
  if (status === 'unconfigured' && import.meta.env.PROD) {
    return <Navigate to="/signin" replace />
  }

  // 'unconfigured' → local development on sample data.
  // 'signedIn'     → the app.
  return children
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/dues" element={<DuesPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
