import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center text-foreground">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">404</p>
        <h1 className="mt-3 text-4xl font-semibold">Page not found</h1>
        <p className="mt-3 max-w-md text-muted-foreground">The route you requested does not exist.</p>
        <Link
          to={ROUTES.root}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-button transition hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
