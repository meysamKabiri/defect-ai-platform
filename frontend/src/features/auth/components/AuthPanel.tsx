import { ShieldCheck } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { CreateWorkspaceForm } from '@/features/auth/components/CreateWorkspaceForm'
import { AuthModeTabs, type AuthMode } from '@/features/auth/components/AuthModeTabs'
import { LoginForm } from '@/features/auth/components/LoginForm'

type AuthPanelProps = {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

const panelCopy: Record<AuthMode, {
  description: string
  eyebrow: string
  title: string
}> = {
  login: {
    eyebrow: 'Enterprise access',
    title: 'Sign in to inspection command',
    description: 'Continue into authenticated defect analysis, job tracking, and detection review workflows.',
  },
  signUp: {
    eyebrow: 'Workspace setup',
    title: 'Create a company workspace',
    description: 'Start a new private workspace. Existing workspaces stay invitation-only for member access.',
  },
}

export function AuthPanel({ mode, onModeChange }: AuthPanelProps) {
  const copy = panelCopy[mode]

  return (
    <section className="relative flex min-h-screen justify-center overflow-hidden bg-background px-4 py-8 sm:px-6 lg:h-screen lg:overflow-y-auto lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_34%)] lg:hidden" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl border border-border bg-surface text-primary shadow-card">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Defect AI Platform</p>
              <p className="text-sm font-semibold text-foreground">Secure authentication</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">{copy.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.description}</p>
        </div>

        <AuthModeTabs mode={mode} onModeChange={onModeChange} />

        <Card className="mt-5 overflow-hidden border-border/80 bg-surface/95 p-6 shadow-card backdrop-blur sm:p-8">
          {mode === 'login' ? <LoginForm /> : <CreateWorkspaceForm />}
        </Card>

        <div className="mt-5 rounded-2xl border border-border bg-surface/70 p-4 text-sm leading-6 text-muted-foreground shadow-card backdrop-blur">
          Protected by short-lived access tokens, HttpOnly refresh cookies, and server-side token revocation.
        </div>
      </div>
    </section>
  )
}
