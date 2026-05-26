import { ShieldCheck } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LoginForm } from '@/features/auth/components/LoginForm'

export function AuthPage() {
  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.28),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--surface)))] p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-sm font-semibold text-muted-foreground backdrop-blur">
          <ShieldCheck className="size-4 text-primary" />
          Defect AI Platform
        </div>

        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">Enterprise inspection intelligence</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-foreground">
            Secure access for AI-powered quality workflows.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            This auth shell is structured for a production SaaS frontend: token-aware API access,
            protected routes, session restoration, reusable UI primitives, and scalable feature boundaries.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">Built with React Router, Redux Toolkit, RTK Query, and Tailwind semantic tokens.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Welcome back</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">Sign in</h2>
            </div>
            <ThemeToggle />
          </div>

          <Card className="p-6 sm:p-8">
            <LoginForm />
          </Card>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Auth endpoints are wired to <span className="font-mono">/api/v1/auth/*</span>. Your backend needs matching endpoints for real login.
          </p>
        </div>
      </section>
    </main>
  )
}
